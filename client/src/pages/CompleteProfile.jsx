import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../lib/firebase";
import { updateProfile } from "firebase/auth";
import { FaUser, FaPhone, FaMapMarkerAlt, FaLocationArrow, FaSpinner } from "react-icons/fa";
import AuthRoute from "../components/AuthRoute";
import { checkProfileComplete } from "../utils/checkProfileComplete";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function CompleteProfile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingProfile, setCheckingProfile] = useState(true);
  
  const [profileData, setProfileData] = useState({
    displayName: "",
    phone: "",
    phoneCountryCode: "+972",
    address: {
      street: "",
      city: "",
      zipCode: "",
      country: ""
    },
    emailConsent: false,
    smsConsent: false
  });

  // Check if profile is already complete and redirect if so
  useEffect(() => {
    if (authLoading || !user) return;
    
    (async () => {
      try {
        // Check if user has password (required to complete profile)
        const hasPassword = user.providerData?.some(provider => provider.providerId === "password");
        if (!hasPassword) {
          // User doesn't have password, redirect to create password first
          navigate("/create-password", { replace: true });
          return;
        }

        const isComplete = await checkProfileComplete(user);
        if (isComplete) {
          navigate("/", { replace: true });
          return;
        }
        setCheckingProfile(false);
      } catch (err) {
        console.error("Error checking profile:", err);
        setCheckingProfile(false);
      }
    })();
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && !checkingProfile) {
      // Load existing profile data from backend
      (async () => {
        try {
          const token = await auth.currentUser?.getIdToken();
          if (token) {
            const res = await fetch(`${API}/api/users/me`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (res.ok) {
              const data = await res.json();
              
              // Parse phone number if it exists (extract country code and number)
              let phone = "";
              let phoneCountryCode = "+972";
              if (data.phone) {
                const phoneMatch = data.phone.match(/^(\+\d{1,4})(.+)$/);
                if (phoneMatch) {
                  phoneCountryCode = phoneMatch[1];
                  phone = phoneMatch[2].replace(/\D/g, ""); // Remove any non-digits from number part
                } else {
                  // If no country code found, assume it's just the number
                  phone = data.phone.replace(/\D/g, "");
                }
              }
              
              setProfileData(prev => ({
                ...prev,
                displayName: data.displayName || user.displayName || prev.displayName,
                phone: phone || prev.phone,
                phoneCountryCode: phoneCountryCode || prev.phoneCountryCode,
                address: data.address || prev.address,
                emailConsent: data.emailConsent !== undefined ? data.emailConsent : prev.emailConsent,
                smsConsent: data.smsConsent !== undefined ? data.smsConsent : prev.smsConsent
              }));
            }
          }
        } catch (err) {
          console.error("Error loading profile data:", err);
        }
      })();

      // Check if there's signup invite data in localStorage (only if no existing phone)
      const signupInviteData = localStorage.getItem("signupInviteData");
      if (signupInviteData) {
        try {
          const data = JSON.parse(signupInviteData);
          // Extract phone country code and number (generic regex for any country code)
          const phoneMatch = data.phone?.match(/^(\+\d+)(.+)$/);
          setProfileData(prev => {
            // Only use localStorage data if phone is not already set from backend
            if (!prev.phone) {
              return {
                ...prev,
                phone: phoneMatch ? phoneMatch[2] : (data.phone || prev.phone),
                phoneCountryCode: phoneMatch ? phoneMatch[1] : prev.phoneCountryCode,
                emailConsent: data.emailConsent || prev.emailConsent,
                smsConsent: data.smsConsent || prev.smsConsent
              };
            }
            // If phone exists, only update consents if not already set
            return {
              ...prev,
              emailConsent: prev.emailConsent || data.emailConsent || false,
              smsConsent: prev.smsConsent || data.smsConsent || false
            };
          });
          // Clear the stored data after using it
          localStorage.removeItem("signupInviteData");
        } catch (err) {
          console.error("Error parsing signup invite data:", err);
        }
      }
    }
  }, [user, checkingProfile]);

  // Get user's location and reverse geocode to address
  async function handleUseLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Use a reverse geocoding service (using OpenStreetMap Nominatim API - free, no API key needed)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'KingsmanSaddlery/1.0' // Required by Nominatim
              }
            }
          );

          if (!response.ok) {
            throw new Error("Failed to fetch address");
          }

          const data = await response.json();
          const address = data.address || {};

          // Map the response to our address structure
          setProfileData(prev => ({
            ...prev,
            address: {
              street: [
                address.road,
                address.house_number,
                address.building
              ].filter(Boolean).join(" ") || "",
              city: address.city || address.town || address.village || address.municipality || "",
              zipCode: address.postcode || "",
              country: address.country || ""
            }
          }));

          setLocationLoading(false);
        } catch (err) {
          console.error("Geocoding error:", err);
          setError("Failed to get address from location. Please enter it manually.");
          setLocationLoading(false);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        let errorMessage = "Failed to get your location. ";
        if (err.code === 1) {
          errorMessage += "Please allow location access or enter your address manually.";
        } else if (err.code === 2) {
          errorMessage += "Location unavailable. Please enter your address manually.";
        } else if (err.code === 3) {
          errorMessage += "Location request timed out. Please try again or enter your address manually.";
        } else {
          errorMessage += "Please enter your address manually.";
        }
        setError(errorMessage);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: false, // Set to false to reduce timeout issues
        timeout: 20000, // Increased to 20 seconds
        maximumAge: 60000 // Allow cached location up to 1 minute old
      }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Validation
    if (!profileData.displayName || profileData.displayName.trim() === "") {
      setError("Please enter your name");
      return;
    }
    
    if (!profileData.phone || profileData.phone.trim() === "") {
      setError("Please enter your phone number");
      return;
    }

    // Combine country code with phone number
    const fullPhone = `${profileData.phoneCountryCode}${profileData.phone.trim()}`;

    if (!profileData.address.street || profileData.address.street.trim() === "") {
      setError("Please enter your street address");
      return;
    }

    if (!profileData.address.city || profileData.address.city.trim() === "") {
      setError("Please enter your city");
      return;
    }

    if (!profileData.address.zipCode || profileData.address.zipCode.trim() === "") {
      setError("Please enter your ZIP/postal code");
      return;
    }

    if (!profileData.address.country || profileData.address.country.trim() === "") {
      setError("Please enter your country");
      return;
    }

    if (!profileData.emailConsent) {
      setError("You must agree to receive emails");
      return;
    }

    if (!profileData.smsConsent) {
      setError("You must agree to receive SMS messages");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Update profile via backend (which will also assign CUSTOMER role)
      const res = await fetch(`${API}/api/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          displayName: profileData.displayName.trim(),
          phone: fullPhone,
          address: {
            street: profileData.address.street.trim(),
            city: profileData.address.city.trim(),
            zipCode: profileData.address.zipCode.trim(),
            country: profileData.address.country.trim()
          },
          emailConsent: profileData.emailConsent,
          smsConsent: profileData.smsConsent
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save profile");
      }

      // Update Firebase Auth display name
      await updateProfile(user, {
        displayName: profileData.displayName.trim()
      });

      // Redirect to home page
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Profile completion error:", err);
      setError(err.message || "Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingProfile || authLoading) {
    return (
      <AuthRoute>
        <main className="page-with-navbar">
          <div className="container-main padding-y-xl">
            <div className="max-w-2xl mx-auto">
              <div className="flex-row flex-items-center flex-gap-md" style={{ justifyContent: "center", padding: "2rem" }}>
                <FaSpinner className="animate-spin" />
                <span>Loading...</span>
              </div>
            </div>
          </div>
        </main>
      </AuthRoute>
    );
  }

  return (
    <AuthRoute>
      <main className="page-with-navbar">
        <div className="container-main padding-y-xl">
          <div className="max-w-2xl mx-auto">
            <h1 className="heading-1 margin-bottom-md">Complete Your Profile</h1>
            <p className="text-muted margin-bottom-lg">
              Please provide your information to continue. This helps us serve you better.
            </p>

            {error && (
              <div className="card card-error padding-md margin-bottom-md">
                <p className="text-error">{error}</p>
              </div>
            )}

            {/* Profile Information Section */}
            <form onSubmit={handleSubmit} className="card padding-lg">
              <div className="grid-form margin-bottom-md">
                <div>
                  <label className="text-sm font-medium margin-bottom-sm flex-row flex-gap-sm">
                    <FaUser />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={profileData.displayName}
                    onChange={e => setProfileData({ ...profileData, displayName: e.target.value })}
                    placeholder="Your full name"
                    required
                  />
                </div>
                
                <div>
                  <label className="font-medium margin-bottom-sm flex-row flex-gap-sm">
                    <FaPhone />
                    Phone Number *
                  </label>
                  <div className="flex-row flex-gap-sm" style={{ alignItems: "stretch" }}>
                    <select
                      className="select select-country-code-large"
                      value={profileData.phoneCountryCode}
                      onChange={e => setProfileData({ ...profileData, phoneCountryCode: e.target.value })}
                      style={{ width: "100px" }}
                    >
                      <option value="+972">🇮🇱 +972</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+33">🇫🇷 +33</option>
                      <option value="+49">🇩🇪 +49</option>
                      <option value="+39">🇮🇹 +39</option>
                      <option value="+34">🇪🇸 +34</option>
                    </select>
                    <input
                      type="tel"
                      className="input flex-1"
                      value={profileData.phone}
                      onChange={e => setProfileData({ ...profileData, phone: e.target.value.replace(/\D/g, "") })}
                      placeholder="Enter phone number"
                      required
                      style={{ minWidth: "200px" }}
                    />
                  </div>
                </div>
              </div>

              <div className="margin-top-md margin-bottom-md">
                <div className="flex-row flex-gap-sm flex-items-center margin-bottom-sm">
                  <label className="text-sm font-medium flex-row flex-gap-sm">
                    <FaMapMarkerAlt />
                    Address *
                  </label>
                  <button
                    type="button"
                    onClick={handleUseLocation}
                    disabled={locationLoading}
                    className="btn-secondary flex-row flex-gap-sm btn-sm"
                    style={{ marginLeft: "auto" }}
                  >
                    {locationLoading ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        Getting location...
                      </>
                    ) : (
                      <>
                        <FaLocationArrow />
                        Use My Location
                      </>
                    )}
                  </button>
                </div>
                
                <div className="grid-form margin-top-sm">
                  <div className="grid-col-span-full">
                    <input
                      type="text"
                      className="input"
                      value={profileData.address.street}
                      onChange={e => setProfileData({
                        ...profileData,
                        address: { ...profileData.address, street: e.target.value }
                      })}
                      placeholder="Street Address"
                      required
                    />
                  </div>
                  <input
                    type="text"
                    className="input"
                    value={profileData.address.city}
                    onChange={e => setProfileData({
                      ...profileData,
                      address: { ...profileData.address, city: e.target.value }
                    })}
                    placeholder="City"
                    required
                  />
                  <input
                    type="text"
                    className="input"
                    value={profileData.address.zipCode}
                    onChange={e => setProfileData({
                      ...profileData,
                      address: { ...profileData.address, zipCode: e.target.value }
                    })}
                    placeholder="ZIP/Postal Code"
                    required
                  />
                  <input
                    type="text"
                    className="input"
                    value={profileData.address.country}
                    onChange={e => setProfileData({
                      ...profileData,
                      address: { ...profileData.address, country: e.target.value }
                    })}
                    placeholder="Country"
                    required
                  />
                </div>
              </div>

              <div className="margin-top-lg margin-bottom-md">
                <div className="card padding-md" style={{ background: "var(--brand-light)", borderColor: "var(--brand)", borderWidth: "2px" }}>
                  <h3 className="section-title margin-bottom-md">Communication Preferences *</h3>
                  <p className="text-sm text-muted margin-bottom-md">
                    Please confirm your preferences to receive updates and special offers
                  </p>
                  
                  <div className="margin-bottom-sm">
                    <label className="flex-row flex-gap-sm flex-items-center checkbox-label">
                      <input
                        type="checkbox"
                        checked={profileData.emailConsent}
                        onChange={e => setProfileData({ ...profileData, emailConsent: e.target.checked })}
                        required
                        className="checkbox-custom"
                      />
                      <span className="text-sm">
                        I agree to receive emails with updates, special offers, and promotions
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="flex-row flex-gap-sm flex-items-center checkbox-label">
                      <input
                        type="checkbox"
                        checked={profileData.smsConsent}
                        onChange={e => setProfileData({ ...profileData, smsConsent: e.target.checked })}
                        required
                        className="checkbox-custom"
                      />
                      <span className="text-sm">
                        I agree to receive SMS messages with updates and special offers
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary margin-top-md"
                disabled={loading || locationLoading}
              >
                {loading ? "Saving..." : "Complete Profile"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </AuthRoute>
  );
}

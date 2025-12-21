import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../lib/firebase";
import { 
  updatePassword, 
  reauthenticateWithCredential,
  EmailAuthProvider,
  linkWithCredential
} from "firebase/auth";
import { FaUser, FaPhone, FaMapMarkerAlt, FaLocationArrow, FaSpinner, FaLock } from "react-icons/fa";
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
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordCreated, setPasswordCreated] = useState(false);
  
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

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: ""
  });

  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false
  });

  // Check if user signed in with Google (no password provider)
  const isGoogleUser = useMemo(() => {
    if (!user) return false;
    return user.providerData?.some(provider => provider.providerId === "google.com") && 
           !user.providerData?.some(provider => provider.providerId === "password");
  }, [user]);

  // Check if profile is already complete and redirect if so
  useEffect(() => {
    if (authLoading || !user) return;
    
    (async () => {
      try {
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

  // Check if user has password provider
  const hasPassword = useMemo(() => {
    if (!user) return false;
    // If password was just created, consider it as having password
    if (passwordCreated) return true;
    return user.providerData?.some(provider => provider.providerId === "password");
  }, [user, passwordCreated]);

  // Handle password creation
  async function handleCreatePassword() {
    setPasswordError("");
    setPasswordSuccess("");
    
    // Trim passwords for validation
    const trimmedNewPassword = passwordData.newPassword ? passwordData.newPassword.trim() : "";
    const trimmedConfirmPassword = passwordData.confirmPassword ? passwordData.confirmPassword.trim() : "";
    
    // Password requirements: 6-12 characters with at least one letter
    if (!trimmedNewPassword) {
      setPasswordError("Please enter a new password");
      return;
    }

    if (trimmedNewPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      return;
    }

    if (trimmedNewPassword.length > 12) {
      setPasswordError("Password must be no more than 12 characters long");
      return;
    }

    if (!/[a-zA-Z]/.test(trimmedNewPassword)) {
      setPasswordError("Password must contain at least one letter");
      return;
    }

    if (trimmedNewPassword !== trimmedConfirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      setPasswordError("");

      if (isGoogleUser) {
        // For Google users, link email/password provider
        const credential = EmailAuthProvider.credential(
          user.email,
          trimmedNewPassword
        );
        await linkWithCredential(user, credential);
        setPasswordSuccess("Password created successfully! You can now sign in with email and password.");
        setPasswordCreated(true); // Mark password as created so hasPassword updates
        setPasswordData({ newPassword: "", confirmPassword: "" });
        return;
      } else {
        // For existing password users, this shouldn't happen on complete profile page
        setPasswordError("You already have a password. Please use the Profile page to update it.");
        return;
      }

      setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (err) {
      console.error("Password creation error:", err);
      let errorMessage = "";
      if (err.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password.";
      } else if (err.code === "auth/requires-recent-login") {
        errorMessage = "For security, please sign out and sign in again, then try creating your password.";
      } else {
        errorMessage = err.message || "Failed to create password";
      }
      setPasswordError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Check if user has password (required to complete profile)
    if (!hasPassword) {
      setError("You must create a password before completing your profile. Please create a password in the section below.");
      return;
    }
    
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
      const { updateProfile } = await import("firebase/auth");
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

            {/* Password Section - Show first if user doesn't have password */}
            {!hasPassword && (
              <div className="card padding-lg margin-bottom-lg">
                <h2 className="section-title flex-row flex-gap-sm">
                  <FaLock />
                  Create Password
                </h2>
                
                <div className="card card-warning padding-md margin-top-md margin-bottom-md">
                  <p className="text-warning">
                    ⚠️ <strong>Important:</strong> You must create a password before you can complete your profile.
                  </p>
                </div>

                {passwordError && (
                  <div className="card card-error padding-md margin-top-md margin-bottom-md">
                    <p className="text-error">{passwordError}</p>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="card card-success padding-md margin-top-md margin-bottom-md">
                    <p className="text-success">{passwordSuccess}</p>
                  </div>
                )}

                <div className="margin-top-md">
                  <div className="margin-bottom-sm">
                    <label className="text-sm font-medium">
                      Password Requirements
                    </label>
                    <p className="text-xs text-muted label-help-text">
                      6-12 characters, must include at least one letter
                    </p>
                  </div>
                  <div className="grid-form">
                    <div>
                      <label className="text-sm font-medium margin-bottom-sm">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? "text" : "password"}
                          className="input"
                          className="input input-with-action"
                          value={passwordData.newPassword}
                          onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600 hover:text-gray-800 transition"
                          onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        >
                          {showPasswords.new ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium margin-bottom-sm">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? "text" : "password"}
                          className="input"
                          className="input input-with-action"
                          value={passwordData.confirmPassword}
                          onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600 hover:text-gray-800 transition"
                          onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        >
                          {showPasswords.confirm ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-primary margin-top-md"
                  onClick={handleCreatePassword}
                  disabled={loading || locationLoading}
                >
                  {loading ? "Creating..." : "Create Password"}
                </button>
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
                  <div className="flex-row flex-gap-sm">
                    <select
                      className="select select-country-code-large"
                      value={profileData.phoneCountryCode}
                      onChange={e => setProfileData({ ...profileData, phoneCountryCode: e.target.value })}
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
                    className="btn-secondary flex-row flex-gap-sm"
                    className="btn-sm"
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
                disabled={loading || locationLoading || !hasPassword}
                title={!hasPassword ? "You must create a password first" : ""}
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


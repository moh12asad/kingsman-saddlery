import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, signInWithGoogle } from "../lib/firebase";
import { FcGoogle } from "react-icons/fc";
import { useAuth } from "../context/AuthContext";
import GuestRoute from "../components/GuestRoute";
import { FaUser, FaPhone, FaMapMarkerAlt, FaLocationArrow, FaSpinner, FaLock, FaEnvelope } from "react-icons/fa";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function SignUp() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPasswords, setShowPasswords] = useState({
    password: false,
    confirmPassword: false
  });

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
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

  // Pre-fill data from signup invite popup if available
  useEffect(() => {
    const signupInviteData = localStorage.getItem("signupInviteData");
    if (signupInviteData) {
      try {
        const data = JSON.parse(signupInviteData);
        // Extract phone country code and number
        const phoneMatch = data.phone?.match(/^(\+\d+)(.+)$/);
        setFormData(prev => ({
          ...prev,
          email: data.email || prev.email,
          phone: phoneMatch ? phoneMatch[2] : (data.phone || prev.phone),
          phoneCountryCode: phoneMatch ? phoneMatch[1] : prev.phoneCountryCode,
          emailConsent: data.emailConsent || false,
          smsConsent: data.smsConsent || false
        }));
      } catch (err) {
        console.error("Error parsing signup invite data:", err);
      }
    }
  }, []);

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
          
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'KingsmanSaddlery/1.0'
              }
            }
          );

          if (!response.ok) {
            throw new Error("Failed to fetch address");
          }

          const data = await response.json();
          const address = data.address || {};

          setFormData(prev => ({
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
        setError("Failed to get your location. Please enter your address manually.");
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 60000
      }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.email || !formData.email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!formData.password || formData.password.trim() === "") {
      setError("Please enter a password");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (formData.password.length > 12) {
      setError("Password must be no more than 12 characters long");
      return;
    }

    if (!/\d/.test(formData.password)) {
      setError("Password must contain at least one number");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!formData.displayName || formData.displayName.trim() === "") {
      setError("Please enter your name");
      return;
    }

    if (!formData.phone || formData.phone.trim() === "") {
      setError("Please enter your phone number");
      return;
    }

    if (!formData.address.street || formData.address.street.trim() === "") {
      setError("Please enter your street address");
      return;
    }

    if (!formData.address.city || formData.address.city.trim() === "") {
      setError("Please enter your city");
      return;
    }

    if (!formData.address.zipCode || formData.address.zipCode.trim() === "") {
      setError("Please enter your ZIP/postal code");
      return;
    }

    if (!formData.address.country || formData.address.country.trim() === "") {
      setError("Please enter your country");
      return;
    }

    if (!formData.emailConsent) {
      setError("You must agree to receive emails");
      return;
    }

    if (!formData.smsConsent) {
      setError("You must agree to receive SMS messages");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim().toLowerCase(),
        formData.password
      );

      const newUser = userCredential.user;

      // Update display name in Firebase Auth
      await updateProfile(newUser, {
        displayName: formData.displayName.trim()
      });

      // Get ID token
      const token = await newUser.getIdToken();

      // Save profile data to backend
      const fullPhone = `${formData.phoneCountryCode}${formData.phone.trim()}`;
      const res = await fetch(`${API}/api/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          displayName: formData.displayName.trim(),
          phone: fullPhone,
          address: {
            street: formData.address.street.trim(),
            city: formData.address.city.trim(),
            zipCode: formData.address.zipCode.trim(),
            country: formData.address.country.trim()
          },
          emailConsent: formData.emailConsent,
          smsConsent: formData.smsConsent
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save profile");
      }

      // Clear signup invite data from localStorage
      localStorage.removeItem("signupInviteData");

      // Redirect to home
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Signup error:", err);
      let errorMessage = err.message || "Failed to create account. Please try again.";
      
      if (err.code === "auth/email-already-in-use") {
        errorMessage = "An account with this email already exists. Please sign in instead.";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address. Please enter a valid email.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
      // Redirect will be handled by the useEffect hook when user state updates
    } catch (e) {
      const code = e.code || "";
      let errorMessage = e.message || "Google sign-up failed.";
      
      if (code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-up popup was closed.";
      } else if (code === "auth/popup-blocked") {
        errorMessage = "Sign-up popup was blocked. Please allow popups for this site.";
      }
      
      console.error("Google sign-up error:", code, errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  // If already signed in, redirect
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <GuestRoute>
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
      </GuestRoute>
    );
  }

  return (
    <GuestRoute>
      <main className="page-with-navbar">
        <div className="container-main padding-y-xl">
          <div className="max-w-2xl mx-auto">
            <h1 className="heading-1 margin-bottom-md">Create Your Account</h1>
            <p className="text-muted margin-bottom-lg">
              Sign up to get started and receive 5% off on all purchases for the next 3 months!
            </p>

            {error && (
              <div className="card padding-md margin-bottom-md" style={{ background: "#fee2e2", borderColor: "#ef4444" }}>
                <p className="text-error">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="card padding-lg">
              {/* Email and Password */}
              <div className="grid-form margin-bottom-md">
                <div>
                  <label className="text-sm font-medium margin-bottom-sm flex-row flex-gap-sm">
                    <FaEnvelope />
                    Email *
                  </label>
                  <input
                    type="email"
                    className="input"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div className="grid-form margin-bottom-md">
                <div>
                  <label className="text-sm font-medium margin-bottom-sm flex-row flex-gap-sm">
                    <FaLock />
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.password ? "text" : "password"}
                      className="input"
                      style={{ paddingRight: "5rem" }}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter password (6-12 chars, must include a number)"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600 hover:text-gray-800 transition"
                      onClick={() => setShowPasswords({ ...showPasswords, password: !showPasswords.password })}
                    >
                      {showPasswords.password ? "Hide" : "Show"}
                    </button>
                  </div>
                  <p className="text-xs text-muted margin-top-sm">
                    6-12 characters, must include at least one number
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium margin-bottom-sm">Confirm Password *</label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirmPassword ? "text" : "password"}
                      className="input"
                      style={{ paddingRight: "5rem" }}
                      value={formData.confirmPassword}
                      onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Confirm password"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600 hover:text-gray-800 transition"
                      onClick={() => setShowPasswords({ ...showPasswords, confirmPassword: !showPasswords.confirmPassword })}
                    >
                      {showPasswords.confirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Name and Phone */}
              <div className="grid-form margin-bottom-md">
                <div>
                  <label className="text-sm font-medium margin-bottom-sm flex-row flex-gap-sm">
                    <FaUser />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={formData.displayName}
                    onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="Your full name"
                    required
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium margin-bottom-sm flex-row flex-gap-sm">
                    <FaPhone />
                    Phone Number *
                  </label>
                  <div className="flex-row flex-gap-sm">
                    <select
                      className="input"
                      style={{ flexShrink: 0, minWidth: "120px" }}
                      value={formData.phoneCountryCode}
                      onChange={e => setFormData({ ...formData, phoneCountryCode: e.target.value })}
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
                      className="input"
                      style={{ flex: 1 }}
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })}
                      placeholder="Enter phone number"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
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
                    style={{ marginLeft: "auto", fontSize: "0.875rem", padding: "0.5rem 1rem" }}
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
                      value={formData.address.street}
                      onChange={e => setFormData({
                        ...formData,
                        address: { ...formData.address, street: e.target.value }
                      })}
                      placeholder="Street Address"
                      required
                    />
                  </div>
                  <input
                    type="text"
                    className="input"
                    value={formData.address.city}
                    onChange={e => setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value }
                    })}
                    placeholder="City"
                    required
                  />
                  <input
                    type="text"
                    className="input"
                    value={formData.address.zipCode}
                    onChange={e => setFormData({
                      ...formData,
                      address: { ...formData.address, zipCode: e.target.value }
                    })}
                    placeholder="ZIP/Postal Code"
                    required
                  />
                  <input
                    type="text"
                    className="input"
                    value={formData.address.country}
                    onChange={e => setFormData({
                      ...formData,
                      address: { ...formData.address, country: e.target.value }
                    })}
                    placeholder="Country"
                    required
                  />
                </div>
              </div>

              {/* Consent */}
              <div className="margin-top-lg margin-bottom-md">
                <div className="card padding-md" style={{ background: "#f0f9ff", borderColor: "#0ea5e9" }}>
                  <h3 className="section-title margin-bottom-md">Communication Preferences *</h3>
                  <p className="text-sm text-muted margin-bottom-md">
                    Please confirm your preferences to receive updates and special offers
                  </p>
                  
                  <div className="margin-bottom-sm">
                    <label className="flex-row flex-gap-sm flex-items-center" style={{ cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={formData.emailConsent}
                        onChange={e => setFormData({ ...formData, emailConsent: e.target.checked })}
                        required
                        style={{ width: "1.25rem", height: "1.25rem", cursor: "pointer", accentColor: "var(--brand)" }}
                      />
                      <span className="text-sm">
                        I agree to receive emails with updates, special offers, and promotions
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="flex-row flex-gap-sm flex-items-center" style={{ cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={formData.smsConsent}
                        onChange={e => setFormData({ ...formData, smsConsent: e.target.checked })}
                        required
                        style={{ width: "1.25rem", height: "1.25rem", cursor: "pointer", accentColor: "var(--brand)" }}
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
                {loading ? "Creating Account..." : "Sign Up"}
              </button>
            </form>

            <div className="margin-top-lg">
              <div className="flex-row flex-items-center flex-gap-md" style={{ justifyContent: "center", marginBottom: "1rem" }}>
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }}></div>
                <span className="text-sm text-muted">OR</span>
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }}></div>
              </div>

              <button
                onClick={onGoogle}
                className="btn-secondary flex-row flex-items-center flex-gap-sm"
                style={{ width: "100%", justifyContent: "center" }}
                disabled={loading}
              >
                <FcGoogle style={{ fontSize: "1.25rem" }} />
                <span>Continue with Google</span>
              </button>
            </div>

            <div className="margin-top-md text-center">
              <p className="text-sm text-muted">
                Already have an account?{" "}
                <Link to="/signin" style={{ color: "var(--brand)", fontWeight: "500" }}>
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </GuestRoute>
  );
}


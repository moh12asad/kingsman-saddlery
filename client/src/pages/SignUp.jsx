import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, signInWithGoogle, signInWithApple } from "../lib/firebase";
import { FcGoogle } from "react-icons/fc";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import GuestRoute from "../components/GuestRoute";
import { FaUser, FaPhone, FaMapMarkerAlt, FaLocationArrow, FaSpinner, FaLock, FaEnvelope, FaApple } from "react-icons/fa";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function SignUp() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
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
  const [fromPopup, setFromPopup] = useState({
    email: false,
    phone: false
  });

  // Pre-fill data from signup invite popup if available
  useEffect(() => {
    const signupInviteData = localStorage.getItem("signupInviteData");
    if (signupInviteData) {
      try {
        const data = JSON.parse(signupInviteData);
        console.log("Signup invite data loaded:", data);
        
        // Extract phone country code and number
        let phone = "";
        let phoneCountryCode = "+972";
        
        if (data.phone) {
          // Clean the phone number first
          const cleanPhone = data.phone.trim();
          
          // List of known country codes (ordered from longest to shortest to avoid partial matches)
          const countryCodes = [
            "+972", "+44", "+33", "+49", "+39", "+34", "+27", "+55", "+52", "+31", 
            "+46", "+47", "+45", "+41", "+86", "+91", "+61", "+81", "+7", "+1"
          ];
          
          // Try to match known country codes first (check longest first)
          let matched = false;
          for (const code of countryCodes) {
            if (cleanPhone.startsWith(code)) {
              phoneCountryCode = code;
              phone = cleanPhone.substring(code.length).replace(/\D/g, "");
              matched = true;
              console.log("Parsed phone using known country code - country code:", phoneCountryCode, "number:", phone);
              break;
            }
          }
          
          // If no known country code matched, try regex pattern
          if (!matched) {
            // Try to match country code pattern (1-3 digits after +)
            const phoneMatch = cleanPhone.match(/^(\+\d{1,3})(.+)$/);
            
            if (phoneMatch) {
              phoneCountryCode = phoneMatch[1];
              phone = phoneMatch[2].replace(/\D/g, "");
              console.log("Parsed phone using regex - country code:", phoneCountryCode, "number:", phone);
            } else {
              // If no country code found, check if it's all digits or starts with 0
              const digitsOnly = cleanPhone.replace(/\D/g, "");
              if (digitsOnly === cleanPhone || cleanPhone.startsWith("0")) {
                phone = digitsOnly;
              } else {
                // Try to find + anywhere in the string
                const plusIndex = cleanPhone.indexOf("+");
                if (plusIndex >= 0) {
                  const afterPlus = cleanPhone.substring(plusIndex);
                  const afterMatch = afterPlus.match(/^(\+\d{1,3})(.+)$/);
                  if (afterMatch) {
                    phoneCountryCode = afterMatch[1];
                    phone = afterMatch[2].replace(/\D/g, "");
                  } else {
                    phone = cleanPhone.replace(/\D/g, "");
                  }
                } else {
                  phone = cleanPhone.replace(/\D/g, "");
                }
              }
              console.log("Phone without country code - using default:", phoneCountryCode, "number:", phone);
            }
          }
        }
        
        setFormData(prev => ({
          ...prev,
          email: data.email || prev.email,
          phone: phone || prev.phone,
          phoneCountryCode: phoneCountryCode || prev.phoneCountryCode,
          emailConsent: data.emailConsent !== undefined ? data.emailConsent : prev.emailConsent,
          smsConsent: data.smsConsent !== undefined ? data.smsConsent : prev.smsConsent
        }));
        
        // Mark which fields came from popup
        const popupFields = {
          email: !!data.email,
          phone: !!data.phone
        };
        setFromPopup(popupFields);
        
        console.log("Form data updated from popup:", {
          email: data.email || "none",
          phone: phone || "none",
          phoneCountryCode: phoneCountryCode || "none",
          fromPopup: popupFields
        });
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

    // Trim passwords for validation
    const trimmedPassword = formData.password ? formData.password.trim() : "";
    const trimmedConfirmPassword = formData.confirmPassword ? formData.confirmPassword.trim() : "";

    if (!trimmedPassword) {
      setError("Please enter a password");
      return;
    }

    if (trimmedPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (trimmedPassword.length > 12) {
      setError("Password must be no more than 12 characters long");
      return;
    }

    if (!/[a-zA-Z]/.test(trimmedPassword)) {
      setError("Password must contain at least one letter");
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
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

      // Create Firebase Auth user (use trimmed password)
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim().toLowerCase(),
        trimmedPassword
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

  async function onApple() {
    setError("");
    setLoading(true);
    try {
      await signInWithApple();
      // Redirect will be handled by the useEffect hook when user state updates
    } catch (e) {
      const code = e.code || "";
      let errorMessage = e.message || "Apple sign-up failed.";
      
      // Handle specific Firebase configuration errors
      if (code === "auth/configuration-not-found" || errorMessage.includes("CONFIGURATION_NOT_FOUND")) {
        errorMessage = "Firebase Authentication configuration not found. This usually means:\n\n1. ❌ Your API key doesn't match the project ID\n   → Check that VITE_FIREBASE_API_KEY belongs to the 'kingsman-saddlery' project\n\n2. ❌ Authentication is not enabled in Firebase Console\n   → Go to Firebase Console → Authentication → Get Started\n\n3. ❌ API key restrictions in Google Cloud Console\n   → Check Google Cloud Console → APIs & Services → Credentials\n\n4. ❌ Wrong project configuration\n   → Make sure ALL .env values are from the SAME Firebase project\n\nTo fix: Get a fresh config from Firebase Console → Project Settings → General → Your apps";
      } else if (code === "auth/popup-closed-by-user") {
        errorMessage = "Sign-up popup was closed.";
      } else if (code === "auth/popup-blocked") {
        errorMessage = "Sign-up popup was blocked. Please allow popups for this site.";
      } else if (code === "auth/cancelled-popup-request") {
        errorMessage = "Sign-up popup was cancelled. Please try again.";
      } else if (code === "auth/account-exists-with-different-credential") {
        errorMessage = "An account already exists with the same email address but different sign-in credentials. Please sign in using your original method.";
      } else if (code === "auth/operation-not-allowed") {
        errorMessage = "Apple Sign-In is not enabled. Please contact support.";
      } else if (code === "auth/invalid-credential") {
        errorMessage = "Invalid Apple credentials. Please try again.";
      }
      
      console.error("Apple sign-up error:", code, errorMessage);
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
            <h1 className="heading-1 margin-bottom-md">{t("signUp.title")}</h1>
            <p className="text-muted margin-bottom-lg">
              {t("signUp.description")}
            </p>

            {error && (
              <div className="card card-error padding-md margin-bottom-md">
                <p className="text-error">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="card padding-lg">
              {/* Email and Password */}
              <div className="grid-form margin-bottom-md">
                <div>
                  <label className="text-sm font-medium margin-bottom-sm flex-row flex-gap-sm">
                    <FaEnvelope />
                    {t("signUp.email")} *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder={t("signIn.emailPlaceholder")}
                    readOnly={fromPopup.email}
                    disabled={fromPopup.email}
                    className={fromPopup.email ? "input input-readonly" : "input"}
                    required
                  />
                </div>
              </div>

              <div className="grid-form margin-bottom-md">
                <div>
                  <label className="text-sm font-medium margin-bottom-sm flex-row flex-gap-sm">
                    <FaLock />
                    {t("signUp.password")} *
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.password ? "text" : "password"}
                      className="input input-with-action"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder={t("signUp.passwordPlaceholder")}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600 hover:text-gray-800 transition"
                      onClick={() => setShowPasswords({ ...showPasswords, password: !showPasswords.password })}
                    >
                      {showPasswords.password ? t("common.hide") : t("common.show")}
                    </button>
                  </div>
                  <p className="text-xs text-muted margin-top-sm">
                    {t("signUp.passwordRequirements")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium margin-bottom-sm">{t("signUp.confirmPassword")} *</label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirmPassword ? "text" : "password"}
                      className="input input-with-action"
                      value={formData.confirmPassword}
                      onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder={t("signUp.confirmPasswordPlaceholder")}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600 hover:text-gray-800 transition"
                      onClick={() => setShowPasswords({ ...showPasswords, confirmPassword: !showPasswords.confirmPassword })}
                    >
                      {showPasswords.confirmPassword ? t("common.hide") : t("common.show")}
                    </button>
                  </div>
                </div>
              </div>

              {/* Name and Phone */}
              <div className="grid-form margin-bottom-md">
                <div>
                  <label className="text-sm font-medium margin-bottom-sm flex-row flex-gap-sm">
                    <FaUser />
                    {t("signUp.displayName")} *
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={formData.displayName}
                    onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder={t("signUp.displayNamePlaceholder")}
                    required
                  />
                </div>
                
                <div>
                  <label className="font-medium margin-bottom-sm flex-row flex-gap-sm">
                    <FaPhone />
                    {t("signUp.phone")} *
                  </label>
                  <div className="flex-row flex-gap-sm">
                    <select
                      className={`select select-country-code ${fromPopup.phone ? "input-readonly" : ""}`}
                      value={formData.phoneCountryCode}
                      onChange={e => setFormData({ ...formData, phoneCountryCode: e.target.value })}
                      disabled={fromPopup.phone}
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
                      className={`input flex-1 ${fromPopup.phone ? "input-readonly" : ""}`}
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })}
                      placeholder={t("signUp.phonePlaceholder")}
                      readOnly={fromPopup.phone}
                      disabled={fromPopup.phone}
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
                    {t("signUp.address")} *
                  </label>
                  <button
                    type="button"
                    onClick={handleUseLocation}
                    disabled={locationLoading}
                    className="btn-secondary btn-sm flex-row flex-gap-sm"
                    style={{ marginLeft: "auto" }}
                  >
                    {locationLoading ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        {t("signUp.gettingLocation")}
                      </>
                    ) : (
                      <>
                        <FaLocationArrow />
                        {t("signUp.getLocation")}
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
                      placeholder={t("signUp.street")}
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
                    placeholder={t("signUp.city")}
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
                    placeholder={t("signUp.zipCode")}
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
                    placeholder={t("signUp.country")}
                    required
                  />
                </div>
              </div>

              {/* Consent */}
              <div className="margin-top-lg margin-bottom-md">
                <div className="card card-brand padding-md">
                  <h3 className="section-title margin-bottom-md">{t("signUp.communicationPreferences")} *</h3>
                  <p className="text-sm text-muted margin-bottom-md">
                    {t("signUp.communicationPreferencesDescription")}
                  </p>
                  
                  <div className="margin-bottom-sm">
                    <label className="flex-row flex-gap-sm flex-items-center checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.emailConsent}
                        onChange={e => setFormData({ ...formData, emailConsent: e.target.checked })}
                        required
                        className="checkbox-custom"
                      />
                      <span className="text-sm">
                        {t("signUp.emailConsent")}
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="flex-row flex-gap-sm flex-items-center checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.smsConsent}
                        onChange={e => setFormData({ ...formData, smsConsent: e.target.checked })}
                        required
                        className="checkbox-custom"
                      />
                      <span className="text-sm">
                        {t("signUp.smsConsent")}
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
                {loading ? t("signUp.creatingAccount") : t("signUp.signUpButton")}
              </button>
            </form>

            <div className="margin-top-lg">
              <div className="flex-row flex-items-center flex-gap-md flex-center margin-bottom-md">
                <div className="divider"></div>
                <span className="text-sm text-muted">OR</span>
                <div className="divider"></div>
              </div>

              <button
                onClick={onGoogle}
                className="btn-secondary flex-row flex-items-center flex-gap-sm btn-icon-only"
                disabled={loading}
              >
                <FcGoogle className="icon-lg" />
                <span>{t("signUp.continueWithGoogle")}</span>
              </button>
              <button
                onClick={onApple}
                className="btn-secondary flex-row flex-items-center flex-gap-sm btn-icon-only margin-top-sm"
                style={{ backgroundColor: '#000', color: '#fff', borderColor: '#000' }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = '#1a1a1a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = '#000';
                  }
                }}
                disabled={loading}
              >
                <FaApple className="icon-lg" />
                <span>{t("signUp.continueWithApple")}</span>
              </button>
            </div>

            <div className="margin-top-md text-center">
              <p className="text-sm text-muted">
                {t("signUp.haveAccount")}{" "}
                <Link to="/signin" className="link-brand">
                  {t("signUp.signIn")}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </GuestRoute>
  );
}


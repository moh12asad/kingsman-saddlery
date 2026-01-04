import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { FaTimes } from "react-icons/fa";

const STORAGE_KEY = "signupInvitePopupShown";
const API = import.meta.env.VITE_API_BASE_URL || "";

export default function SignupInvitePopup() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    phoneCountryCode: "+972",
    phone: "",
    consent: false
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Only show if user is not signed in and popup hasn't been shown before
    if (!loading && !user) {
      const hasShown = localStorage.getItem(STORAGE_KEY);
      if (!hasShown) {
        // Delay showing popup to give users time to see the page content first
        const timer = setTimeout(() => {
          setShow(true);
        }, 3000); // 3 second delay
        return () => clearTimeout(timer);
      }
    } else {
      setShow(false);
    }
  }, [user, loading]);

  const handleClose = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.email || !formData.email.trim()) {
      setError(t("signupInvite.errors.enterEmail"));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError(t("signupInvite.errors.validEmail"));
      return;
    }

    if (!formData.phone || !formData.phone.trim()) {
      setError(t("signupInvite.errors.enterPhone"));
      return;
    }

    if (!formData.consent) {
      setError(t("signupInvite.errors.consentRequired"));
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      // Check if email or phone already exists
      const fullPhone = `${formData.phoneCountryCode}${formData.phone.trim()}`;
      const checkRes = await fetch(`${API}/api/users/check-exists`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          phone: fullPhone
        })
      });

      if (!checkRes.ok) {
        throw new Error(t("signupInvite.errors.checkFailed"));
      }

      const checkData = await checkRes.json();

      // If email or phone exists, redirect to sign in page
      if (checkData.exists) {
        if (checkData.emailExists && checkData.phoneExists) {
          setError(t("signupInvite.errors.emailAndPhoneExists"));
        } else if (checkData.emailExists) {
          setError(t("signupInvite.errors.emailExists"));
        } else if (checkData.phoneExists) {
          setError(t("signupInvite.errors.phoneExists"));
        }
        
        // Mark popup as shown
        localStorage.setItem(STORAGE_KEY, "true");
        
        // Redirect to sign in page after a short delay
        setTimeout(() => {
          navigate("/signin", { state: { email: formData.email.trim() } });
          setShow(false);
        }, 2000);
        return;
      }
      
      // Store the data in localStorage to use when user signs up
      const signupData = {
        email: formData.email.trim(),
        phone: fullPhone,
        emailConsent: true,
        smsConsent: true,
        signupInviteDate: new Date().toISOString()
      };
      console.log("Storing signup invite data:", signupData);
      localStorage.setItem("signupInviteData", JSON.stringify(signupData));
      
      // Mark popup as shown
      localStorage.setItem(STORAGE_KEY, "true");
      
      // Redirect to sign up page
      navigate("/signup", { state: { fromSignupInvite: true } });
      setShow(false);
    } catch (err) {
      console.error("Error saving signup invite data:", err);
      setError(err.message || t("signupInvite.errors.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <div 
      className="modal-overlay"
      onClick={handleClose}
      style={{ zIndex: 10000 }}
    >
      <div 
        className="signup-invite-popup"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="signup-invite-close"
          onClick={handleClose}
          aria-label={t("signupInvite.close")}
        >
          <FaTimes />
        </button>

        <div className="signup-invite-content">
          <div className="signup-invite-image-container">
            <img 
              src="/signup invitation.png" 
              alt="Signup invitation" 
              className="signup-invite-image"
            />
          </div>
          <div className="signup-invite-header">
            <h2 className="signup-invite-title">{t("signupInvite.title")}</h2>
            <h3 className="signup-invite-subtitle">{t("signupInvite.subtitle")}</h3>
            <p className="signup-invite-description">
              {t("signupInvite.description")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="signup-invite-form">
            {error && (
              <div className="signup-invite-error">
                {error}
              </div>
            )}

            <div className="signup-invite-field">
              <label className="signup-invite-label">
                {t("signupInvite.email")}
              </label>
              <input
                type="email"
                className="signup-invite-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t("signupInvite.emailPlaceholder")}
                required
              />
            </div>

            <div className="signup-invite-field">
              <label className="signup-invite-label">
                {t("signupInvite.phone")}
              </label>
              <div className="signup-invite-phone-group">
                <select
                  className="signup-invite-phone-code"
                  value={formData.phoneCountryCode}
                  onChange={(e) => setFormData({ ...formData, phoneCountryCode: e.target.value })}
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
                  className="signup-invite-phone-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })}
                  placeholder={t("signupInvite.phonePlaceholder")}
                  required
                />
              </div>
            </div>

            <div className="signup-invite-consent">
              <label className="signup-invite-checkbox-label">
                <input
                  type="checkbox"
                  className="signup-invite-checkbox"
                  checked={formData.consent}
                  onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                  required
                />
                <span className="signup-invite-consent-text">
                  {t("signupInvite.consent")}
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="signup-invite-submit"
              disabled={submitting}
            >
              {submitting ? t("signupInvite.signingUp") : t("signupInvite.signUp")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}


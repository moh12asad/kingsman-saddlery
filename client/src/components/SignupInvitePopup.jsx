import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FaTimes } from "react-icons/fa";

const STORAGE_KEY = "signupInvitePopupShown";
const API = import.meta.env.VITE_API_BASE_URL || "";

export default function SignupInvitePopup() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
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
        // Delay showing popup slightly for better UX
        const timer = setTimeout(() => {
          setShow(true);
        }, 1000);
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
      setError("Please enter your email address");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!formData.phone || !formData.phone.trim()) {
      setError("Please enter your phone number");
      return;
    }

    if (!formData.consent) {
      setError("You must agree to receive emails and SMS messages");
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
        throw new Error("Failed to check if user exists");
      }

      const checkData = await checkRes.json();

      // If email or phone exists, redirect to sign in page
      if (checkData.exists) {
        if (checkData.emailExists && checkData.phoneExists) {
          setError("An account with this email and phone number already exists. Please sign in instead.");
        } else if (checkData.emailExists) {
          setError("An account with this email already exists. Please sign in instead.");
        } else if (checkData.phoneExists) {
          setError("An account with this phone number already exists. Please sign in instead.");
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
      localStorage.setItem("signupInviteData", JSON.stringify(signupData));
      
      // Mark popup as shown
      localStorage.setItem(STORAGE_KEY, "true");
      
      // Redirect to sign up page
      navigate("/signup", { state: { fromSignupInvite: true } });
      setShow(false);
    } catch (err) {
      console.error("Error saving signup invite data:", err);
      setError(err.message || "Something went wrong. Please try again.");
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
          aria-label="Close"
        >
          <FaTimes />
        </button>

        <div className="signup-invite-content">
          <div className="signup-invite-header">
            <h2 className="signup-invite-title">What are you waiting for?</h2>
            <h3 className="signup-invite-subtitle">Sign up now and get 5% off!</h3>
            <p className="signup-invite-description">
              Enter your details to sign up and receive 5% off on all purchases for the next 3 months
            </p>
            <div className="signup-invite-discount">
              <strong>🎉 Get 5% off for 3 months on all purchases! 🎉</strong>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="signup-invite-form">
            {error && (
              <div className="signup-invite-error">
                {error}
              </div>
            )}

            <div className="signup-invite-field">
              <label className="signup-invite-label">
                Email *
              </label>
              <input
                type="email"
                className="signup-invite-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
                required
              />
            </div>

            <div className="signup-invite-field">
              <label className="signup-invite-label">
                Phone *
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
                  placeholder="Enter phone number"
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
                  By filling out this form, I agree to receive newsletters and updates via email or SMS messages
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="signup-invite-submit"
              disabled={submitting}
            >
              {submitting ? "Signing up..." : "Sign Up"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}


import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaTiktok, FaFacebook, FaInstagram, FaEnvelope, FaMapMarkerAlt, FaPhone, FaWhatsapp, FaClock } from "react-icons/fa";
import { getStoreInfo, formatAddress, formatWorkingHours, getWhatsAppLink } from "../utils/storeInfo";
import { getTranslated } from "../utils/translations";
import WazeIcon from "./icons/WazeIcon";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function Footer() {
  const [categories, setCategories] = useState([]);
  const [storeInfo, setStoreInfo] = useState(null);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [joinClubForm, setJoinClubForm] = useState({
    name: "",
    phone: "",
    email: "",
    emailConsent: false
  });
  const [joinClubError, setJoinClubError] = useState("");
  const [joinClubSubmitting, setJoinClubSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        // Load categories
        const categoriesResponse = await fetch(`${API}/api/categories?lang=${i18n.language || 'en'}`);
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData.categories || []);
        }

        // Load store info
        const storeData = await getStoreInfo();
        setStoreInfo(storeData);
      } catch (err) {
        console.error("Failed to load footer data:", err);
      }
    }
    loadData();
  }, [i18n.language]);

  const handleJoinClubSubmit = async (e) => {
    e.preventDefault();
    setJoinClubError("");

    // Validation
    if (!joinClubForm.name || !joinClubForm.name.trim()) {
      setJoinClubError(t("joinClub.errors.enterName"));
      return;
    }

    if (!joinClubForm.email || !joinClubForm.email.trim()) {
      setJoinClubError(t("joinClub.errors.enterEmail"));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(joinClubForm.email)) {
      setJoinClubError(t("joinClub.errors.validEmail"));
      return;
    }

    if (!joinClubForm.phone || !joinClubForm.phone.trim()) {
      setJoinClubError(t("joinClub.errors.enterPhone"));
      return;
    }

    if (!joinClubForm.emailConsent) {
      setJoinClubError(t("joinClub.errors.consentRequired"));
      return;
    }

    try {
      setJoinClubSubmitting(true);
      setJoinClubError("");

      // Check if email or phone already exists
      const fullPhone = `+972${joinClubForm.phone.trim()}`;
      const checkRes = await fetch(`${API}/api/users/check-exists`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: joinClubForm.email.trim().toLowerCase(),
          phone: fullPhone
        })
      });

      if (!checkRes.ok) {
        throw new Error(t("joinClub.errors.checkFailed"));
      }

      const checkData = await checkRes.json();

      // If email or phone exists, redirect to sign in page
      if (checkData.exists) {
        if (checkData.emailExists && checkData.phoneExists) {
          setJoinClubError(t("joinClub.errors.emailAndPhoneExists"));
        } else if (checkData.emailExists) {
          setJoinClubError(t("joinClub.errors.emailExists"));
        } else if (checkData.phoneExists) {
          setJoinClubError(t("joinClub.errors.phoneExists"));
        }
        
        // Redirect to sign in page after a short delay
        setTimeout(() => {
          navigate("/signin", { state: { email: joinClubForm.email.trim() } });
        }, 2000);
        return;
      }
      
      // Store the data in localStorage to use when user signs up
      const signupData = {
        email: joinClubForm.email.trim(),
        phone: fullPhone,
        displayName: joinClubForm.name.trim(),
        emailConsent: true,
        smsConsent: true,
        joinClubDate: new Date().toISOString()
      };
      localStorage.setItem("signupInviteData", JSON.stringify(signupData));
      
      // Redirect to sign up page
      navigate("/signup", { state: { fromJoinClub: true } });
    } catch (err) {
      console.error("Error saving join club data:", err);
      setJoinClubError(err.message || t("joinClub.errors.failed"));
    } finally {
      setJoinClubSubmitting(false);
    }
  };

  return (
    <footer className="footer">
      {/* Join Club Invitation Section */}
      <div className="join-club-section">
        <div className="join-club-background">
          <img 
            src="/join club invitation.png" 
            alt="Join club invitation background" 
            className="join-club-bg-image"
          />
          <div className="join-club-overlay"></div>
        </div>
        <div className="join-club-content">
          <div className="join-club-header">
            <h2 className="join-club-title">{t("joinClub.title")}</h2>
            <p className="join-club-subtitle">{t("joinClub.subtitle")}</p>
          </div>
          <form onSubmit={handleJoinClubSubmit} className="join-club-form">
            {joinClubError && (
              <div className="join-club-error">
                {joinClubError}
              </div>
            )}
            <div className="join-club-form-row">
              <div className="join-club-field">
                <label className="join-club-label">{t("joinClub.name")}</label>
                <input
                  type="text"
                  className="join-club-input"
                  value={joinClubForm.name}
                  onChange={(e) => setJoinClubForm({ ...joinClubForm, name: e.target.value })}
                  placeholder={t("joinClub.namePlaceholder")}
                  required
                />
              </div>
              <div className="join-club-field">
                <label className="join-club-label">{t("joinClub.phone")}</label>
                <input
                  type="tel"
                  className="join-club-input"
                  value={joinClubForm.phone}
                  onChange={(e) => setJoinClubForm({ ...joinClubForm, phone: e.target.value.replace(/\D/g, "") })}
                  placeholder={t("joinClub.phonePlaceholder")}
                  required
                />
              </div>
              <div className="join-club-field">
                <label className="join-club-label">{t("joinClub.email")}</label>
                <input
                  type="email"
                  className="join-club-input"
                  value={joinClubForm.email}
                  onChange={(e) => setJoinClubForm({ ...joinClubForm, email: e.target.value })}
                  placeholder={t("joinClub.emailPlaceholder")}
                  required
                />
              </div>
              <button
                type="submit"
                className="join-club-submit"
                disabled={joinClubSubmitting}
              >
                {joinClubSubmitting ? t("joinClub.submitting") : t("joinClub.submit")}
              </button>
            </div>
            <div className="join-club-consent-row">
              <label className="join-club-checkbox-label">
                <input
                  type="checkbox"
                  className="join-club-checkbox"
                  checked={joinClubForm.emailConsent}
                  onChange={(e) => setJoinClubForm({ ...joinClubForm, emailConsent: e.target.checked })}
                  required
                />
                <span className="join-club-consent-text">
                  {t("joinClub.consent")}
                </span>
              </label>
            </div>
          </form>
        </div>
      </div>

      <div className="footer-content">
        {/* Site Map Column */}
        <div className="footer-column">
          <h3 className="footer-title">{t("footer.siteMap")}</h3>
          <ul className="footer-links">
            <li>
              <Link to="/shop">{t("footer.links.shop")}</Link>
            </li>
            <li>
              <Link to="/favorites">{t("footer.links.favorites")}</Link>
            </li>
            <li>
              <Link to="/cart">{t("footer.links.cart")}</Link>
            </li>
            <li>
              <Link to="/profile">{t("footer.links.myAccount")}</Link>
            </li>
            <li>
              <Link to="/about">{t("footer.links.aboutUs")}</Link>
            </li>
            <li>
              <Link to="/contact">{t("footer.links.contactUs")}</Link>
            </li>
            <li>
              <Link to="/shipping">{t("footer.links.shippingReturns")}</Link>
            </li>
            <li>
              <Link to="/terms">{t("footer.links.termsConditions")}</Link>
            </li>
            <li>
              <Link to="/privacy">{t("footer.links.privacyPolicy")}</Link>
            </li>
          </ul>
        </div>

        {/* Main Categories Column */}
        <div className="footer-column">
          <h3 className="footer-title">{t("footer.mainCategories")}</h3>
          <ul className="footer-links">
            {categories.length > 0 ? (
              categories.slice(0, 10).map((category) => {
                const categoryName = typeof category === 'string' ? category : getTranslated(category.name, i18n.language || 'en');
                return (
                  <li key={categoryName}>
                    <Link to={`/products?category=${encodeURIComponent(categoryName)}`}>
                      {categoryName}
                    </Link>
                  </li>
                );
              })
            ) : (
              <>
                <li><Link to="/shop">{t("footer.links.allProducts")}</Link></li>
                <li><Link to="/shop">Saddles</Link></li>
                <li><Link to="/shop">Bridles</Link></li>
                <li><Link to="/shop">Tack</Link></li>
                <li><Link to="/shop">Accessories</Link></li>
              </>
            )}
          </ul>
        </div>

        {/* Contact Us Column */}
        <div className="footer-column">
          <h3 className="footer-title">{t("footer.contactUs")}</h3>
          <ul className="footer-contact">
            {storeInfo?.storePhone && (
              <li>
                <a href={`tel:${storeInfo.storePhone}`} className="footer-contact-item">
                  <FaPhone className="footer-icon" />
                  <span>{storeInfo.storePhone}</span>
                </a>
              </li>
            )}
            {storeInfo?.whatsappNumber && (
              <li>
                <a href={getWhatsAppLink(storeInfo.whatsappNumber)} className="footer-contact-item" target="_blank" rel="noopener noreferrer">
                  <FaWhatsapp className="footer-icon" />
                  <span>WhatsApp: {storeInfo.whatsappNumber}</span>
                </a>
              </li>
            )}
            {storeInfo?.storeEmail && (
              <li>
                <a href={`mailto:${storeInfo.storeEmail}`} className="footer-contact-item">
                  <FaEnvelope className="footer-icon" />
                  <span>{storeInfo.storeEmail}</span>
                </a>
              </li>
            )}
            {storeInfo?.location && formatAddress(storeInfo.location) && (
              <li>
                <div className="footer-contact-item">
                  <FaMapMarkerAlt className="footer-icon" />
                  <span>
                    {formatAddress(storeInfo.location).split(', ').map((part, idx, arr) => (
                      <span key={idx}>
                        {part}
                        {idx < arr.length - 1 && <br />}
                      </span>
                    ))}
                  </span>
                </div>
              </li>
            )}
            {storeInfo?.workingHours && (
              <li>
                <div className="footer-contact-item">
                  <FaClock className="footer-icon" />
                  <span>
                    {formatWorkingHours(storeInfo.workingHours).map((line, idx) => (
                      <span key={idx}>{line}{idx < formatWorkingHours(storeInfo.workingHours).length - 1 && <br />}</span>
                    ))}
                  </span>
                </div>
              </li>
            )}
          </ul>
        </div>

        {/* Welcome / Social Media Column */}
        <div className="footer-column">
          <h3 className="footer-title">{t("footer.followUs")}</h3>
          <div className="footer-social">
            {storeInfo?.whatsappNumber && (
              <a 
                href={getWhatsAppLink(storeInfo.whatsappNumber)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="footer-social-link footer-social-whatsapp"
                aria-label="WhatsApp"
              >
                <FaWhatsapp className="footer-social-icon" />
              </a>
            )}
            <a 
              href="https://www.facebook.com/profile.php?id=100063785065499" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-social-link footer-social-facebook"
              aria-label="Facebook"
            >
              <FaFacebook className="footer-social-icon" />
            </a>
            <a 
              href="https://www.instagram.com/kingsmansaddlery/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-social-link footer-social-instagram"
              aria-label="Instagram"
            >
              <FaInstagram className="footer-social-icon" />
            </a>
            <a 
              href="https://www.tiktok.com/@kingsmansaddlery" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-social-link footer-social-tiktok"
              aria-label="Tiktok"
            >
              <FaTiktok className="footer-social-icon" />
            </a>
            {storeInfo?.storeEmail && (
              <a 
                href={`mailto:${storeInfo.storeEmail}`}
                className="footer-social-link footer-social-email"
                aria-label="Email"
              >
                <FaEnvelope className="footer-social-icon" />
              </a>
            )}
            <a 
              href="https://www.google.com/maps/dir/32.3977216,35.045376/32.86528,35.30071/@32.865443,35.3005489,19.75z/data=!4m4!4m3!1m1!4e1!1m0?entry=ttu&g_ep=EgoyMDI1MTEyMy4xIKXMDSoASAFQAw%3D%3D" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-social-link footer-social-googlemaps"
              aria-label="Google Maps"
            >
              <FaMapMarkerAlt className="footer-social-icon" />
            </a>
            <a 
              href="https://waze.com/ul/hsvc558k99" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-social-link footer-social-waze"
              aria-label="Waze"
            >
              <WazeIcon size={20} className="footer-social-icon" />
            </a>
          </div>
          <div className="footer-welcome">
            <p>{t("footer.welcome")}</p>
            <p className="footer-welcome-subtitle">{t("footer.welcomeSubtitle")}</p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <div className="footer-bottom-left">
            <span>© {new Date().getFullYear()} Kingsman Saddlery. {t("footer.allRightsReserved")}</span>
          </div>
          <div className="footer-bottom-right">
            <div className="footer-payment-icons">
              <span className="footer-payment-text">{t("footer.weAccept")}</span>
              <div className="footer-payment-logos">
                <span className="footer-payment-logo">VISA</span>
                <span className="footer-payment-logo">MasterCard</span>
                <span className="footer-payment-logo">PayPal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

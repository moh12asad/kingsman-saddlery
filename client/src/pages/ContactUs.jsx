import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaPhone, FaWhatsapp, FaEnvelope, FaMapMarkerAlt, FaClock } from "react-icons/fa";
import { getStoreInfo, formatAddress, formatWorkingHours, getWhatsAppLink } from "../utils/storeInfo";
import "../styles/contact-us.css";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function ContactUs() {
  const { t } = useTranslation();
  const [storeInfo, setStoreInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadStoreInfo() {
      try {
        const data = await getStoreInfo();
        setStoreInfo(data);
      } catch (err) {
        console.error("Failed to load store info:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStoreInfo();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const response = await fetch(`${API}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("contactUs.error"));
      }

      setSuccess(t("contactUs.success"));
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (err) {
      setError(err.message || t("contactUs.error"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="page-contact-us">
        <div className="container-main">
          <div className="text-center">
            <div className="text-muted">{t("common.loading")}</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-contact-us">
      <div className="container-main">
        <h1 className="page-title">{t("contactUs.title")}</h1>

        <div className="contact-grid">
          {/* Contact Information */}
          <div className="page-card">
            <div className="page-content">
              <h2 className="page-section-title">{t("contactUs.getInTouch")}</h2>
              
              {storeInfo?.storePhone && (
                <div className="contact-item">
                  <FaPhone className="contact-icon" />
                  <div>
                    <strong>{t("contactUs.phone")}</strong>{" "}
                    <a href={`tel:${storeInfo.storePhone}`} className="contact-link">
                      {storeInfo.storePhone}
                    </a>
                  </div>
                </div>
              )}

              {storeInfo?.whatsappNumber && (
                <div className="contact-item">
                  <FaWhatsapp className="contact-icon" />
                  <div>
                    <strong>{t("contactUs.whatsapp")}</strong>{" "}
                    <a 
                      href={getWhatsAppLink(storeInfo.whatsappNumber)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="contact-link"
                    >
                      {storeInfo.whatsappNumber}
                    </a>
                  </div>
                </div>
              )}

              {storeInfo?.storeEmail && (
                <div className="contact-item">
                  <FaEnvelope className="contact-icon" />
                  <div>
                    <strong>{t("contactUs.email")}</strong>{" "}
                    <a href={`mailto:${storeInfo.storeEmail}`} className="contact-link">
                      {storeInfo.storeEmail}
                    </a>
                  </div>
                </div>
              )}

              {storeInfo?.location && formatAddress(storeInfo.location) && (
                <div className="contact-item">
                  <FaMapMarkerAlt className="contact-icon" />
                  <div>
                    <strong>{t("contactUs.address")}</strong>
                    <p className="contact-address">{formatAddress(storeInfo.location)}</p>
                  </div>
                </div>
              )}

              {storeInfo?.workingHours && (
                <div className="contact-item">
                  <FaClock className="contact-icon" />
                  <div>
                    <strong>{t("contactUs.businessHours")}</strong>
                    <div className="contact-hours">
                      {formatWorkingHours(storeInfo.workingHours).map((line, idx) => (
                        <p key={idx}>{line}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact Form */}
          <div className="page-card">
            <h2 className="page-section-title">{t("contactUs.sendMessage")}</h2>
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label className="form-label form-label-required">{t("contactUs.name")}</label>
                <input
                  className="input"
                  type="text"
                  placeholder={t("contactUs.namePlaceholder")}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">{t("contactUs.emailLabel")}</label>
                <input
                  className="input"
                  type="email"
                  placeholder={t("contactUs.emailPlaceholder")}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t("contactUs.phoneLabel")}</label>
                <input
                  className="input"
                  type="tel"
                  placeholder={t("contactUs.phonePlaceholder")}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">{t("contactUs.subject")}</label>
                <input
                  className="input"
                  type="text"
                  placeholder={t("contactUs.subjectPlaceholder")}
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">{t("contactUs.message")}</label>
                <textarea
                  className="input"
                  rows="6"
                  placeholder={t("contactUs.messagePlaceholder")}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                />
              </div>

              {error && <p className="form-error">{error}</p>}
              {success && <p className="text-success">{success}</p>}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? t("contactUs.sending") : t("contactUs.send")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

import { useEffect, useState } from "react";
import { FaPhone, FaWhatsapp, FaEnvelope, FaMapMarkerAlt, FaClock } from "react-icons/fa";
import { getStoreInfo, formatAddress, formatWorkingHours, getWhatsAppLink } from "../utils/storeInfo";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function ContactUs() {
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
        throw new Error(data.error || "Failed to send message");
      }

      setSuccess("Thank you for contacting us! We'll get back to you soon.");
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (err) {
      setError(err.message || "Unable to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="container-main padding-y-xl">
          <div className="text-center">
            <div className="text-muted">Loading...</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container-main padding-y-xl">
        <h1 className="heading-1 margin-bottom-lg">Contact Us</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg" style={{marginTop: "7rem"}}>
          {/* Contact Information */}
          <div className="card">
            <div className="spacing-y-md">
              <h2 className="heading-3 margin-bottom-md">Get in Touch</h2>
              
              {storeInfo?.storePhone && (
                <div className="flex-row flex-align-center flex-gap-md margin-bottom-md">
                  <FaPhone className="text-primary" style={{ fontSize: "1.25rem" }} />
                  <div>
                    <strong>Phone:</strong>{" "}
                    <a href={`tel:${storeInfo.storePhone}`} className="text-link">
                      {storeInfo.storePhone}
                    </a>
                  </div>
                </div>
              )}

              {storeInfo?.whatsappNumber && (
                <div className="flex-row flex-align-center flex-gap-md margin-bottom-md">
                  <FaWhatsapp className="text-primary" style={{ fontSize: "1.25rem" }} />
                  <div>
                    <strong>WhatsApp:</strong>{" "}
                    <a 
                      href={getWhatsAppLink(storeInfo.whatsappNumber)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-link"
                    >
                      {storeInfo.whatsappNumber}
                    </a>
                  </div>
                </div>
              )}

              {storeInfo?.storeEmail && (
                <div className="flex-row flex-align-center flex-gap-md margin-bottom-md">
                  <FaEnvelope className="text-primary" style={{ fontSize: "1.25rem" }} />
                  <div>
                    <strong>Email:</strong>{" "}
                    <a href={`mailto:${storeInfo.storeEmail}`} className="text-link">
                      {storeInfo.storeEmail}
                    </a>
                  </div>
                </div>
              )}

              {storeInfo?.location && formatAddress(storeInfo.location) && (
                <div className="flex-row flex-align-start flex-gap-md margin-bottom-md">
                  <FaMapMarkerAlt className="text-primary" style={{ fontSize: "1.25rem", marginTop: "4px" }} />
                  <div>
                    <strong>Address:</strong>
                    <p style={{ margin: "4px 0 0 0" }}>{formatAddress(storeInfo.location)}</p>
                  </div>
                </div>
              )}

              {storeInfo?.workingHours && (
                <div className="margin-top-md">
                  <div className="flex-row flex-align-start flex-gap-md margin-bottom-md">
                    <FaClock className="text-primary" style={{ fontSize: "1.25rem", marginTop: "4px" }} />
                    <div>
                      <strong>Business Hours:</strong>
                      <div className="margin-top-sm">
                        {formatWorkingHours(storeInfo.workingHours).map((line, idx) => (
                          <p key={idx} style={{ margin: "4px 0" }}>{line}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact Form */}
          <div className="card">
            <h2 className="heading-3 margin-bottom-md">Send us a Message</h2>
            <form onSubmit={handleSubmit} className="spacing-y-md">
              <div className="form-group">
                <label className="form-label form-label-required">Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">Email</label>
                <input
                  className="input"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  className="input"
                  type="tel"
                  placeholder="+1234567890"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">Subject</label>
                <input
                  className="input"
                  type="text"
                  placeholder="What is this regarding?"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">Message</label>
                <textarea
                  className="input"
                  rows="6"
                  placeholder="Tell us how we can help you..."
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
                {submitting ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}







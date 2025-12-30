import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaPhone, FaWhatsapp, FaMapMarkerAlt } from "react-icons/fa";
import { getStoreInfo, formatAddress, getWhatsAppLink } from "../utils/storeInfo";
import WazeIcon from "../components/icons/WazeIcon";
import "../styles/directions.css";

export default function ShippingReturns() {
  const { t } = useTranslation();
  const [storeInfo, setStoreInfo] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <main className="page-directions">
        <div className="container-main">
          <div className="text-center">
            <div className="text-muted">{t("common.loading")}</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-directions">
      <div className="container-main">
        <h1 className="page-title">{t("directions.title")}</h1>

        <div className="directions-grid">
          {/* Location Information */}
          {storeInfo?.location && formatAddress(storeInfo.location) && (
            <div className="page-card">
              <div className="page-content">
                <h2 className="page-section-title">{t("directions.location")}</h2>
                <div className="directions-item">
                  <FaMapMarkerAlt className="directions-icon" />
                  <p className="directions-address">{formatAddress(storeInfo.location)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Contact Options */}
          <div className="page-card">
            <div className="page-content">
              <h2 className="page-section-title">{t("directions.contact")}</h2>
              
              {storeInfo?.storePhone && (
                <div className="directions-contact-item">
                  <a href={`tel:${storeInfo.storePhone}`} className="directions-link">
                    <FaPhone className="directions-link-icon" />
                    <div>
                      <strong>{t("directions.phone")}</strong>
                      <span>{storeInfo.storePhone}</span>
                    </div>
                  </a>
                </div>
              )}

              {storeInfo?.whatsappNumber && (
                <div className="directions-contact-item">
                  <a 
                    href={getWhatsAppLink(storeInfo.whatsappNumber)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="directions-link"
                  >
                    <FaWhatsapp className="directions-link-icon" />
                    <div>
                      <strong>{t("directions.whatsapp")}</strong>
                      <span>{storeInfo.whatsappNumber}</span>
                    </div>
                  </a>
                </div>
              )}

              <div className="directions-contact-item">
                <a 
                  href="https://waze.com/ul/hsvc558k99" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="directions-link"
                >
                  <WazeIcon size={20} className="directions-link-icon" />
                  <div>
                    <strong>{t("directions.waze")}</strong>
                  </div>
                </a>
              </div>

              <div className="directions-contact-item">
                <a 
                  href="https://www.google.com/maps/dir/32.3977216,35.045376/32.86528,35.30071/@32.865443,35.3005489,19.75z/data=!4m4!4m3!1m1!4e1!1m0?entry=ttu&g_ep=EgoyMDI1MTEyMy4xIKXMDSoASAFQAw%3D%3D" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="directions-link"
                >
                  <FaMapMarkerAlt className="directions-link-icon" />
                  <div>
                    <strong>{t("directions.googleMaps")}</strong>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

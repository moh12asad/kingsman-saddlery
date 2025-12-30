import { useEffect, useState } from "react";
import { FaWhatsapp, FaFacebook, FaInstagram, FaTiktok, FaEnvelope, FaMapMarkerAlt } from "react-icons/fa";
import WazeIcon from "./icons/WazeIcon";
import { getStoreInfo, getWhatsAppLink } from "../utils/storeInfo";
import "../styles/social-buttons.css";

export default function SocialButtons() {
  const [storeInfo, setStoreInfo] = useState(null);

  useEffect(() => {
    async function loadStoreInfo() {
      try {
        const storeData = await getStoreInfo();
        setStoreInfo(storeData);
      } catch (err) {
        console.error("Failed to load store info:", err);
      }
    }
    loadStoreInfo();
  }, []);

  return (
    <div className="social-buttons-container">
      {/* WhatsApp */}
      {storeInfo?.whatsappNumber && (
        <a
          href={getWhatsAppLink(storeInfo.whatsappNumber)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          className="social-button social-button-whatsapp"
        >
          <FaWhatsapp size={24} className="social-button-icon" />
        </a>
      )}

      {/* Facebook */}
      <a
        href="https://www.facebook.com/profile.php?id=100063785065499"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Facebook"
        className="social-button social-button-facebook"
      >
        <FaFacebook size={24} className="social-button-icon" />
      </a>

      {/* Instagram */}
      <a
        href="https://www.instagram.com/kingsmansaddlery/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram"
        className="social-button social-button-instagram"
      >
        <FaInstagram size={24} className="social-button-icon" />
      </a>

      {/* TikTok */}
      <a
        href="https://www.tiktok.com/@kingsmansaddlery"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="TikTok"
        className="social-button social-button-tiktok"
      >
        <FaTiktok size={24} className="social-button-icon" />
      </a>

      {/* Email */}
      {storeInfo?.storeEmail && (
        <a
          href={`mailto:${storeInfo.storeEmail}`}
          aria-label="Email"
          className="social-button social-button-email"
        >
          <FaEnvelope size={24} className="social-button-icon" />
        </a>
      )}

      {/* Google Maps */}
      <a
        href="https://www.google.com/maps/dir/32.3977216,35.045376/32.86528,35.30071/@32.865443,35.3005489,19.75z/data=!4m4!4m3!1m1!4e1!1m0?entry=ttu&g_ep=EgoyMDI1MTEyMy4xIKXMDSoASAFQAw%3D%3D"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Google Maps"
        className="social-button social-button-googlemaps"
      >
        <FaMapMarkerAlt size={24} className="social-button-icon" />
      </a>

      {/* Waze */}
      <a
        href="https://waze.com/ul/hsvc558k99"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Navigate with Waze"
        className="social-button social-button-waze"
      >
        <WazeIcon size={24} className="social-button-icon" />
      </a>
    </div>
  );
}


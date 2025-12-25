import { FaWhatsapp } from "react-icons/fa";
import WazeIcon from "./icons/WazeIcon";
import "../styles/social-buttons.css";

export default function SocialButtons() {
  return (
    <div className="social-buttons-container">
      {/* WhatsApp */}
      <a
        href="https://wa.me/+972548740666"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        className="social-button social-button-whatsapp"
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 6px 12px rgba(0, 0, 0, 0.15)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
        }}
      >
        <FaWhatsapp size={26} className="social-button-icon" />
      </a>

      {/* Waze Navigation */}
      <a
        href="https://waze.com/ul/hsvc558k99"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Navigate with Waze"
        className="social-button social-button-waze"
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 6px 12px rgba(0, 0, 0, 0.15)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
        }}
      >
        <WazeIcon size={26} className="social-button-icon" />
      </a>
    </div>
  );
}


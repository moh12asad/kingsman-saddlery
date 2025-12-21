import { FaWhatsapp } from "react-icons/fa";

export default function SocialButtons() {
  return (
    <div 
      style={{
        position: 'fixed',
        left: '8px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 1001,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'auto'
      }}
    >
      {/* WhatsApp - Large and prominent */}
      <a
        href="https://wa.me/+972548740666"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        style={{
          width: "52px",
          height: "52px",
          backgroundColor: "#25D366",
          color: "white",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          textDecoration: "none",
          transition: "all 0.3s ease"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 6px 12px rgba(0, 0, 0, 0.15)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
        }}
      >
        <FaWhatsapp size={26} />
      </a>
    </div>
  );
}


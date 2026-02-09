import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FaSpinner, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { auth } from "../lib/firebase";
import "../styles/tranzila-payment.css";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function TranzilaPaymentIframe({ 
  paymentSessionId, 
  amount, 
  onPaymentSuccess, 
  onPaymentFailure,
  onClose 
}) {
  const { t } = useTranslation();
  const [iframeUrl, setIframeUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("pending"); // pending, processing, success, failed
  const iframeRef = useRef(null);
  const messageListenerRef = useRef(null);

  useEffect(() => {
    // Get iframe URL from server
    async function getIframeUrl() {
      try {
        setLoading(true);
        setError(null);

        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          setError("Authentication required");
          setLoading(false);
          return;
        }

        const response = await fetch(`${API}/api/payment/get-iframe-url`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            paymentSessionId: paymentSessionId,
            amount: amount
          })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to get payment iframe URL");
        }

        setIframeUrl(data.iframeUrl);
      } catch (err) {
        console.error("Error getting iframe URL:", err);
        setError(err.message || "Failed to initialize payment");
      } finally {
        setLoading(false);
      }
    }

    if (paymentSessionId) {
      getIframeUrl();
    }
  }, [paymentSessionId, amount]);

  // Listen for messages from iframe (Tranzila may send postMessage)
  useEffect(() => {
    const handleMessage = (event) => {
      // Verify origin for security (adjust based on Tranzila's domain)
      // For now, we'll handle it via URL parameters instead
      console.log("Message from iframe:", event);
    };

    window.addEventListener("message", handleMessage);
    messageListenerRef.current = handleMessage;

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // Handle iframe load
  const handleIframeLoad = () => {
    console.log("Payment iframe loaded");
  };

  if (loading) {
    return (
      <div className="tranzila-payment-container">
        <div className="tranzila-payment-loading">
          <FaSpinner className="animate-spin" style={{ fontSize: "2rem", marginBottom: "1rem" }} />
          <p>{t("payment.loadingIframe")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tranzila-payment-container">
        <div className="tranzila-payment-error">
          <FaTimesCircle style={{ fontSize: "2rem", marginBottom: "1rem", color: "#ef4444" }} />
          <p className="text-error">{error}</p>
          {onClose && (
            <button onClick={onClose} className="btn btn-secondary margin-top-md">
              {t("payment.close")}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!iframeUrl) {
    return (
      <div className="tranzila-payment-container">
        <div className="tranzila-payment-error">
          <p className="text-error">{t("payment.noIframeUrl")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tranzila-payment-container">
      <div className="tranzila-payment-header">
        <h3>{t("payment.completePayment")}</h3>
        <p className="text-muted">{t("payment.amount")}: {amount} ILS</p>
        {onClose && (
          <button onClick={onClose} className="tranzila-payment-close-btn">
            ×
          </button>
        )}
      </div>
      <div className="tranzila-payment-iframe-wrapper">
        <iframe
          ref={iframeRef}
          src={iframeUrl}
          className="tranzila-payment-iframe"
          title={t("payment.paymentForm")}
          onLoad={handleIframeLoad}
          allow="payment"
          sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation allow-popups"
        />
      </div>
      <div className="tranzila-payment-footer">
        <p className="text-xs text-muted">
          {t("payment.securePayment")}
        </p>
      </div>
    </div>
  );
}


import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FaSpinner, FaCheckCircle, FaTimesCircle, FaLock } from "react-icons/fa";
import "../styles/tranzila-payment.css";

/**
 * Tranzila Payment Component
 * 
 * Integrates Tranzila payment gateway using iframe
 * URL format: https://directng.tranzila.com/{terminalname}/iframenew.php
 * 
 * @param {Object} props
 * @param {number} props.amount - Payment amount in ILS
 * @param {string} props.currency - Currency code (default: ILS)
 * @param {string} props.customerName - Customer name
 * @param {string} props.customerEmail - Customer email
 * @param {string} props.customerPhone - Customer phone
 * @param {Function} props.onSuccess - Callback when payment succeeds
 * @param {Function} props.onError - Callback when payment fails
 * @param {Function} props.onCancel - Callback when payment is cancelled
 */
export default function TranzilaPayment({
  amount,
  currency = "ILS",
  customerName = "",
  customerEmail = "",
  customerPhone = "",
  onSuccess,
  onError,
  onCancel,
}) {
  const { t } = useTranslation();
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("pending"); // pending, processing, success, failed, cancelled
  const [transactionId, setTransactionId] = useState(null);

  // Get Tranzila terminal name from environment variable
  const terminalName = import.meta.env.VITE_TRANZILA_TERMINAL_NAME || "terminalname";
  
  // Build iframe URL with amount parameter
  // Tranzila requires the amount to be passed as a URL parameter
  // Tranzila expects amount in agorot (cents) - 1 ILS = 100 agorot
  const buildIframeUrl = useCallback(() => {
    const baseUrl = `https://directng.tranzila.com/${terminalName}/iframenew.php`;
    const params = new URLSearchParams();
    
    // Add amount (required by Tranzila) - send as is (24.66 ILS)
    // Ensure amount is a valid number and greater than 0
    const validAmount = Number(amount);
    if (validAmount && validAmount > 0 && !isNaN(validAmount)) {
      // Send amount directly in ILS format: 24.66
      params.append('sum', validAmount.toFixed(2));
      console.log('[Tranzila] Amount:', validAmount, 'ILS');
    } else {
      console.warn('[Tranzila] Invalid amount:', amount);
    }
    
    // Always send currency parameter (default is ILS)
    const currencyCode = currency || "ILS";
    params.append('currency', currencyCode);
    
    // Add success and failed redirect URLs (Tranzila will redirect here after payment)
    const currentOrigin = window.location.origin;
    params.append('success_url', `${currentOrigin}/payment/success`);
    params.append('error_url', `${currentOrigin}/payment/failed`);
    params.append('cancel_url', `${currentOrigin}/payment/failed`);
    
    // Add customer information if available (optional)
    if (customerEmail) {
      params.append('email', customerEmail);
    }
    if (customerPhone) {
      params.append('phone', customerPhone);
    }
    if (customerName) {
      params.append('contact', customerName);
    }
    
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }, [terminalName, amount, currency, customerEmail, customerPhone, customerName]);
  
  const iframeUrl = buildIframeUrl();

  useEffect(() => {
    // Listen for messages from Tranzila iframe
    const handleMessage = (event) => {
      // Security: Verify message origin (optional but recommended)
      // In production, you should verify event.origin matches Tranzila's domain
      // if (event.origin !== "https://directng.tranzila.com") return;

      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        console.log("[Tranzila] Received message:", data);

        // Handle different message types from Tranzila
        if (data.type === "payment_success" || data.status === "success" || data.Response === "000") {
          setPaymentStatus("success");
          setTransactionId(data.transactionId || data.TransactionId || data.RefNo || null);
          setLoading(false);
          
          if (onSuccess) {
            onSuccess({
              transactionId: data.transactionId || data.TransactionId || data.RefNo,
              amount: amount,
              currency: currency,
              response: data,
            });
          }
        } else if (data.type === "payment_failed" || data.status === "failed" || data.Response !== "000") {
          setPaymentStatus("failed");
          setError(data.message || data.ErrorMessage || t("payment.failed"));
          setLoading(false);
          
          if (onError) {
            onError({
              error: data.message || data.ErrorMessage || "Payment failed",
              response: data,
            });
          }
        } else if (data.type === "payment_cancelled" || data.status === "cancelled") {
          setPaymentStatus("cancelled");
          setLoading(false);
          
          if (onCancel) {
            onCancel();
          }
        } else if (data.type === "iframe_loaded") {
          setLoading(false);
        }
      } catch (err) {
        console.error("[Tranzila] Error parsing message:", err);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [amount, currency, onSuccess, onError, onCancel, t]);

  // Send payment data to iframe when it's ready
  useEffect(() => {
    if (iframeRef.current && !loading) {
      try {
        const paymentData = {
          type: "payment_data",
          amount: amount,
          currency: currency,
          customerName: customerName,
          customerEmail: customerEmail,
          customerPhone: customerPhone,
        };

        // Send data to iframe (if Tranzila supports this method)
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify(paymentData),
          "https://directng.tranzila.com"
        );
      } catch (err) {
        console.error("[Tranzila] Error sending payment data:", err);
      }
    }
  }, [amount, currency, customerName, customerEmail, customerPhone, loading]);

  const handleIframeLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError(t("payment.iframeError") || "Failed to load payment gateway");
    if (onError) {
      onError({ error: "Failed to load payment gateway" });
    }
  };

  return (
    <div className="tranzila-payment-container">
      <div className="tranzila-payment-header">
        <FaLock className="tranzila-lock-icon" />
        <h3>{t("payment.securePayment") || "Secure Payment"}</h3>
        <p className="tranzila-payment-amount">
          {t("payment.amount") || "Amount"}: <strong>{amount.toFixed(2)} {currency}</strong>
        </p>
      </div>

      {error && paymentStatus === "failed" && (
        <div className="tranzila-error-message">
          <FaTimesCircle />
          <span>{error}</span>
        </div>
      )}

      {paymentStatus === "success" && (
        <div className="tranzila-success-message">
          <FaCheckCircle />
          <span>{t("payment.success") || "Payment successful!"}</span>
          {transactionId && (
            <p className="tranzila-transaction-id">
              {t("payment.transactionId") || "Transaction ID"}: {transactionId}
            </p>
          )}
        </div>
      )}

      {paymentStatus === "cancelled" && (
        <div className="tranzila-cancelled-message">
          <FaTimesCircle />
          <span>{t("payment.cancelled") || "Payment was cancelled"}</span>
        </div>
      )}

      {paymentStatus === "pending" && (
        <div className="tranzila-iframe-wrapper">
          {loading && (
            <div className="tranzila-loading-overlay">
              <FaSpinner className="spinner" />
              <p>{t("payment.loading") || "Loading secure payment gateway..."}</p>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            className="tranzila-iframe"
            title="Tranzila Payment Gateway"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            allow="payment"
            sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation allow-popups"
          />
        </div>
      )}

      {paymentStatus === "processing" && (
        <div className="tranzila-processing">
          <FaSpinner className="spinner" />
          <p>{t("payment.processing") || "Processing your payment..."}</p>
        </div>
      )}
    </div>
  );
}


import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FaSpinner, FaLock } from "react-icons/fa";
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
          const txId = data.transactionId || data.TransactionId || data.RefNo || null;
          setLoading(false);
          
          // Call success callback first (for order creation)
          // The callback will handle order creation and then redirect the entire page
          if (onSuccess) {
            onSuccess({
              transactionId: txId,
              amount: amount,
              currency: currency,
              response: data,
            });
          } else {
            // If no callback, redirect entire page to success page
            const params = new URLSearchParams();
            if (txId) params.append('transactionId', txId);
            if (amount) params.append('amount', amount.toString());
            window.location.href = `/payment/success?${params.toString()}`;
          }
          
        } else if (data.type === "payment_failed" || data.status === "failed" || data.Response !== "000") {
          const errorMsg = data.message || data.ErrorMessage || t("payment.failed");
          const txId = data.transactionId || data.TransactionId || data.RefNo || null;
          setLoading(false);
          
          // Call error callback
          if (onError) {
            onError({
              error: errorMsg,
              response: data,
            });
          }
          
          // Redirect entire page to failed page with parameters
          const params = new URLSearchParams();
          params.append('error', errorMsg);
          if (txId) params.append('transactionId', txId);
          if (amount) params.append('amount', amount.toString());
          window.location.href = `/payment/failed?${params.toString()}`;
          
        } else if (data.type === "payment_cancelled" || data.status === "cancelled") {
          setLoading(false);
          
          // Call cancel callback
          if (onCancel) {
            onCancel();
          }
          
          // Redirect entire page to failed page with cancellation message
          const params = new URLSearchParams();
          params.append('error', t("payment.cancelled") || "Payment was cancelled");
          if (amount) params.append('amount', amount.toString());
          window.location.href = `/payment/failed?${params.toString()}`;
          
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
  };

  const handleIframeError = () => {
    setLoading(false);
    if (onError) {
      onError({ error: "Failed to load payment gateway" });
    }
    // Redirect entire page to failed page if iframe fails to load
    const params = new URLSearchParams();
    params.append('error', t("payment.iframeError") || "Failed to load payment gateway");
    if (amount) params.append('amount', amount.toString());
    window.location.href = `/payment/failed?${params.toString()}`;
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

    </div>
  );
}


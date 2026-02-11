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
  const paymentDataSentRef = useRef(false); // Track if payment data has been sent to prevent duplicate calls
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

  // Reset payment data sent flag when iframe URL changes (new payment)
  useEffect(() => {
    paymentDataSentRef.current = false;
  }, [iframeUrl]);

  useEffect(() => {
    // Listen for messages from Tranzila iframe
    const handleMessage = (event) => {
      // Security: Verify message origin (optional but recommended)
      // In production, you should verify event.origin matches Tranzila's domain
      // if (event.origin !== "https://directng.tranzila.com") return;

      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        console.log("[Tranzila] Received message:", data);

        // Handle redirect messages from success/failure pages loaded in iframe
        if (data.type === "payment_success_redirect") {
          // Iframe has navigated to success page
          setLoading(false);
          
          // Call success callback first (for order creation)
          // The callback will handle order creation and then redirect the entire page
          if (onSuccess) {
            onSuccess({
              transactionId: data.transactionId,
              amount: data.amount ? parseFloat(data.amount) : amount,
              currency: currency,
              response: data,
            });
            // Don't redirect here - let the callback handle it after order creation
            return;
          } else {
            // If no callback, redirect entire page to success page
            const params = new URLSearchParams();
            if (data.transactionId) params.append('transactionId', data.transactionId);
            if (data.amount) params.append('amount', data.amount);
            if (data.orderId) params.append('orderId', data.orderId);
            // Use the URL from the message or construct it
            const redirectUrl = data.url || `/payment/success?${params.toString()}`;
            window.location.href = redirectUrl;
            return;
          }
        }

        if (data.type === "payment_failed_redirect") {
          // Iframe has navigated to failed page - redirect entire page
          setLoading(false);
          const params = new URLSearchParams();
          if (data.error) params.append('error', data.error);
          if (data.transactionId) params.append('transactionId', data.transactionId);
          if (data.amount) params.append('amount', data.amount);
          // Use the URL from the message or construct it
          const redirectUrl = data.url || `/payment/failed?${params.toString()}`;
          window.location.href = redirectUrl;
          return;
        }

        // Handle different message types from Tranzila
        if (data.type === "payment_success" || data.status === "success" || data.Response === "000") {
          // Tranzila may send transaction ID as transactionId, TransactionId, RefNo, or TranzilaTK
          const txId = data.transactionId || data.TransactionId || data.RefNo || data.TranzilaTK || null;
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
          // Tranzila may send transaction ID as transactionId, TransactionId, RefNo, or TranzilaTK
          const txId = data.transactionId || data.TransactionId || data.RefNo || data.TranzilaTK || null;
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

  // Send payment data to iframe when it's ready (only once)
  useEffect(() => {
    // Only send if iframe is ready, not loading, and we haven't sent data yet
    if (iframeRef.current && !loading && !paymentDataSentRef.current) {
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
        paymentDataSentRef.current = true; // Mark as sent to prevent duplicates
      } catch (err) {
        // Log error with context for debugging
        console.error("[Tranzila] Error sending payment data to iframe:", {
          error: err,
          message: err.message,
          stack: err.stack,
          iframeReady: !!iframeRef.current,
          loading: loading
        });
      }
    }
  }, [amount, currency, customerName, customerEmail, customerPhone, loading]);

  const handleIframeLoad = () => {
    setLoading(false);
    
    // Check if iframe has navigated to our success/failure pages
    // This is a fallback in case postMessage doesn't work
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        // Try to access iframe's location (only works if same-origin)
        // Since Tranzila redirects to our domain, this should work after redirect
        const iframeUrl = iframe.contentWindow.location.href;
        
        if (iframeUrl.includes('/payment/success')) {
          // Iframe has navigated to success page
          // Extract transaction details from URL
          let txId = null;
          let amt = null;
          let ordId = null;
          
          try {
            const urlObj = new URL(iframeUrl);
            const params = urlObj.searchParams;
            // Tranzila sends transaction ID as TranzilaTK, RefNo, TransactionId, or transactionId
            txId = params.get("transactionId") || 
                   params.get("RefNo") || 
                   params.get("TransactionId") ||
                   params.get("TranzilaTK");
            amt = params.get("amount") || params.get("sum");
            ordId = params.get("orderId");
          } catch (urlErr) {
            // If URL parsing fails, log with context for debugging
            console.warn("[Tranzila] Failed to parse iframe URL:", {
              error: urlErr,
              message: urlErr.message,
              url: iframeUrl,
              iframeReady: !!iframe
            });
          }
          
          // Call success callback first (for order creation)
          // The callback will handle order creation and then redirect the entire page
          if (onSuccess) {
            onSuccess({
              transactionId: txId,
              amount: amt ? parseFloat(amt) : amount,
              currency: currency,
              response: { url: iframeUrl },
            });
            // Don't redirect here - let the callback handle it after order creation
            return;
          } else {
            // If no callback, redirect entire page to success page
            window.location.href = iframeUrl;
            return;
          }
        } else if (iframeUrl.includes('/payment/failed')) {
          // Iframe has navigated to failed page - redirect entire page
          window.location.href = iframeUrl;
        }
      }
    } catch (err) {
      // Check if this is a cross-origin error (expected) or a real error
      if (err.name === 'SecurityError' || err.message?.includes('cross-origin') || err.message?.includes('Blocked a frame')) {
        // Cross-origin error - iframe is still on Tranzila's domain
        // This is expected and normal. The postMessage approach will handle the redirect.
        // Silently ignore this expected error
      } else {
        // This is an unexpected error - log it for debugging
        console.error("[Tranzila] Unexpected error in handleIframeLoad:", {
          error: err,
          name: err.name,
          message: err.message,
          stack: err.stack,
          iframeReady: !!iframeRef.current
        });
      }
    }
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


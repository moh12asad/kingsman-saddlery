import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../context/CurrencyContext";
import { FaTimesCircle, FaShoppingCart, FaHome, FaRedo } from "react-icons/fa";
import "../styles/payment-result.css";

export default function PaymentFailed() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [errorMessage, setErrorMessage] = useState(null);
  const [transactionId, setTransactionId] = useState(null);
  const [amount, setAmount] = useState(null);

  useEffect(() => {
    // Get parameters from URL (Tranzila redirects with these)
    const error = searchParams.get("error") || searchParams.get("ErrorMessage") || searchParams.get("message");
    const txId = searchParams.get("transactionId") || searchParams.get("RefNo");
    const amt = searchParams.get("amount");

    if (error) setErrorMessage(error);
    if (txId) setTransactionId(txId);
    if (amt) setAmount(parseFloat(amt));

    // Notify parent window if we're inside an iframe (from Tranzila redirect)
    // This allows the checkout page to redirect the entire page instead of just the iframe
    if (window.self !== window.top) {
      const message = {
        type: "payment_failed_redirect",
        error: error,
        transactionId: txId,
        amount: amt,
        url: window.location.href
      };
      window.parent.postMessage(message, "*");
    }
  }, [searchParams]);

  const handleRetry = () => {
    // Navigate back to checkout
    navigate("/checkout");
  };

  return (
    <main className="page-with-navbar">
      <div className="container-main padding-y-xl">
        <div className="payment-result-container">
          <div className="payment-result-card payment-failed-card">
            <div className="payment-result-icon failed-icon">
              <FaTimesCircle />
            </div>
            
            <h1 className="payment-result-title">{t("paymentFailed.title") || "Payment Failed"}</h1>
            
            <p className="payment-result-message">
              {errorMessage || t("paymentFailed.message") || "Unfortunately, your payment could not be processed. Please try again."}
            </p>

            {transactionId && (
              <div className="payment-result-details">
                <div className="payment-result-detail-item">
                  <span className="detail-label">{t("paymentFailed.transactionId") || "Transaction ID"}:</span>
                  <span className="detail-value">{transactionId}</span>
                </div>
              </div>
            )}

            {amount && (
              <div className="payment-result-details">
                <div className="payment-result-detail-item">
                  <span className="detail-label">{t("paymentFailed.amount") || "Amount"}:</span>
                  <span className="detail-value">{formatPrice(amount)}</span>
                </div>
              </div>
            )}

            <div className="payment-result-info">
              <p className="payment-result-info-text">
                {t("paymentFailed.commonReasons") || "Common reasons for payment failure:"}
              </p>
              <ul className="payment-result-reasons">
                <li>{t("paymentFailed.reason1") || "Insufficient funds"}</li>
                <li>{t("paymentFailed.reason2") || "Incorrect card details"}</li>
                <li>{t("paymentFailed.reason3") || "Card expired or blocked"}</li>
                <li>{t("paymentFailed.reason4") || "Network or technical issues"}</li>
              </ul>
            </div>

            <div className="payment-result-actions">
              <button onClick={handleRetry} className="btn btn-primary">
                <FaRedo />
                {t("paymentFailed.tryAgain") || "Try Again"}
              </button>
              
              <Link to="/cart" className="btn btn-secondary">
                <FaShoppingCart />
                {t("paymentFailed.backToCart") || "Back to Cart"}
              </Link>
              
              <Link to="/shop" className="btn btn-secondary">
                <FaHome />
                {t("paymentFailed.continueShopping") || "Continue Shopping"}
              </Link>
            </div>

            <div className="payment-result-footer">
              <p className="payment-result-footer-text">
                {t("paymentFailed.footer") || "If you continue to experience issues, please contact our support team or try a different payment method."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}


import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../context/CurrencyContext";
import { FaCheckCircle, FaShoppingBag, FaHome, FaFileInvoice } from "react-icons/fa";
import "../styles/payment-result.css";

export default function PaymentSuccess() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [transactionId, setTransactionId] = useState(null);
  const [amount, setAmount] = useState(null);
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    // Get parameters from URL (Tranzila redirects with these)
    const txId = searchParams.get("transactionId") || searchParams.get("RefNo") || searchParams.get("TransactionId");
    const amt = searchParams.get("amount");
    const ordId = searchParams.get("orderId");

    if (txId) setTransactionId(txId);
    if (amt) setAmount(parseFloat(amt));
    if (ordId) setOrderId(ordId);

    // Notify parent window if we're inside an iframe (from Tranzila redirect)
    // This allows the checkout page to redirect the entire page instead of just the iframe
    if (window.self !== window.top) {
      const message = {
        type: "payment_success_redirect",
        transactionId: txId,
        amount: amt,
        orderId: ordId,
        url: window.location.href
      };
      window.parent.postMessage(message, "*");
    }
  }, [searchParams]);

  return (
    <main className="page-with-navbar">
      <div className="container-main padding-y-xl">
        <div className="payment-result-container">
          <div className="payment-result-card payment-success-card">
            <div className="payment-result-icon success-icon">
              <FaCheckCircle />
            </div>
            
            <h1 className="payment-result-title">{t("paymentSuccess.title") || "Payment Successful!"}</h1>
            
            <p className="payment-result-message">
              {t("paymentSuccess.message") || "Thank you for your purchase. Your payment has been processed successfully."}
            </p>

            {transactionId && (
              <div className="payment-result-details">
                <div className="payment-result-detail-item">
                  <span className="detail-label">{t("paymentSuccess.transactionId") || "Transaction ID"}:</span>
                  <span className="detail-value">{transactionId}</span>
                </div>
              </div>
            )}

            {amount && (
              <div className="payment-result-details">
                <div className="payment-result-detail-item">
                  <span className="detail-label">{t("paymentSuccess.amount") || "Amount Paid"}:</span>
                  <span className="detail-value">{formatPrice(amount)}</span>
                </div>
              </div>
            )}

            {orderId && (
              <div className="payment-result-info">
                <p className="payment-result-info-text">
                  {t("paymentSuccess.orderCreated") || "Your order has been created and you will receive a confirmation email shortly."}
                </p>
                <p className="payment-result-order-id">
                  {t("paymentSuccess.orderNumber") || "Order Number"}: <strong>{orderId}</strong>
                </p>
              </div>
            )}

            <div className="payment-result-actions">
              {orderId ? (
                <Link to={`/orders/${orderId}`} className="btn btn-cta btn-icon">
                  <FaFileInvoice />
                  {t("paymentSuccess.viewOrder") || "View Order"}
                </Link>
              ) : (
                <Link to="/orders" className="btn btn-cta btn-icon">
                  <FaShoppingBag />
                  {t("paymentSuccess.viewOrders") || "View My Orders"}
                </Link>
              )}
              
              <Link to="/shop" className="btn btn-secondary btn-icon">
                <FaHome />
                {t("paymentSuccess.continueShopping") || "Continue Shopping"}
              </Link>
            </div>

            <div className="payment-result-footer">
              <p className="payment-result-footer-text">
                {t("paymentSuccess.footer") || "If you have any questions about your order, please contact our support team."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}


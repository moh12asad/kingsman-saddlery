import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { auth } from "../lib/firebase";
import { FaCheckCircle, FaSpinner } from "react-icons/fa";
import "../styles/payment-pages.css";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function PaymentSuccess() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState(null);
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    async function verifyPayment() {
      try {
        const sessionId = searchParams.get("sessionId");
        const thtk = searchParams.get("thtk");
        const index = searchParams.get("index");

        if (!sessionId) {
          setError("Payment session ID is missing");
          setVerifying(false);
          return;
        }

        if (!thtk || !index) {
          setError("Payment verification parameters are missing");
          setVerifying(false);
          return;
        }

        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          setError("Authentication required");
          setVerifying(false);
          return;
        }

        // Verify payment with server
        const response = await fetch(`${API}/api/payment/verify-payment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            paymentSessionId: sessionId,
            thtk: thtk,
            index: index
          })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Payment verification failed");
        }

        setPaymentData(data);
        
        // Redirect to checkout (order confirmation) with payment success
        // The payment session will be used to create the order
        setTimeout(() => {
          navigate(`/checkout?paymentSuccess=true&sessionId=${sessionId}&transactionId=${data.transactionId}`);
        }, 2000);
      } catch (err) {
        console.error("Payment verification error:", err);
        setError(err.message || "Failed to verify payment");
      } finally {
        setVerifying(false);
      }
    }

    verifyPayment();
  }, [searchParams, navigate]);

  if (verifying) {
    return (
      <main className="page-with-navbar">
        <div className="container-main padding-y-xl">
          <div className="payment-status-container">
            <FaSpinner className="animate-spin" style={{ fontSize: "3rem", marginBottom: "1rem" }} />
            <h2>{t("payment.verifyingPayment")}</h2>
            <p className="text-muted">{t("payment.pleaseWait")}</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-with-navbar">
        <div className="container-main padding-y-xl">
          <div className="payment-status-container payment-error">
            <h2>{t("payment.verificationFailed")}</h2>
            <p className="text-error">{error}</p>
            <button onClick={() => navigate("/checkout")} className="btn btn-primary margin-top-md">
              {t("payment.backToOrder")}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-with-navbar">
      <div className="container-main padding-y-xl">
        <div className="payment-status-container payment-success">
          <FaCheckCircle style={{ fontSize: "3rem", marginBottom: "1rem", color: "#10b981" }} />
          <h2>{t("payment.paymentSuccessful")}</h2>
          {paymentData && (
            <div className="payment-details margin-top-md">
              <p><strong>{t("payment.transactionId")}:</strong> {paymentData.transactionId}</p>
              <p><strong>{t("payment.amount")}:</strong> {paymentData.amount} {paymentData.currency}</p>
            </div>
          )}
          <p className="text-muted margin-top-md">{t("payment.redirectingToOrder")}</p>
        </div>
      </div>
    </main>
  );
}


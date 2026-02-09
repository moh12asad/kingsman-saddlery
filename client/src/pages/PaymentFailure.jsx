import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaTimesCircle } from "react-icons/fa";
import "../styles/payment-pages.css";

export default function PaymentFailure() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [sessionId] = useState(searchParams.get("sessionId"));

  return (
    <main className="page-with-navbar">
      <div className="container-main padding-y-xl">
        <div className="payment-status-container payment-error">
          <FaTimesCircle style={{ fontSize: "3rem", marginBottom: "1rem", color: "#ef4444" }} />
          <h2>{t("payment.paymentFailed")}</h2>
          <p className="text-muted">{t("payment.paymentFailedMessage")}</p>
          <div className="flex gap-4 margin-top-lg">
            <button onClick={() => navigate("/checkout")} className="btn btn-primary">
              {t("payment.tryAgain")}
            </button>
            <button onClick={() => navigate("/cart")} className="btn btn-secondary">
              {t("payment.backToCart")}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}


import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { getTranslated } from "../utils/translations";
import { auth } from "../lib/firebase";
import AuthRoute from "../components/AuthRoute";
import { FaShoppingBag, FaCalendarAlt, FaCheckCircle, FaClock, FaTimesCircle, FaArrowRight } from "react-icons/fa";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function Orders() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setError(t("orders.errors.mustSignIn"));
        return;
      }

      const res = await fetch(`${API}/api/orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || t("orders.errors.failedToLoad"));
      }
    } catch (err) {
      console.error("Error loading orders:", err);
      setError(t("orders.errors.failedToLoadRetry"));
    } finally {
      setLoading(false);
    }
  }

  function getStatusIcon(status) {
    switch (status?.toLowerCase()) {
      case "completed":
        return <FaCheckCircle className="text-green-600" />;
      case "pending":
        return <FaClock className="text-yellow-600" />;
      case "cancelled":
        return <FaTimesCircle className="text-red-600" />;
      default:
        return <FaClock className="text-yellow-600" />;
    }
  }

  function getStatusBadgeClass(status) {
    switch (status?.toLowerCase()) {
      case "completed":
        return "badge-success";
      case "pending":
        return "badge-warning";
      case "cancelled":
        return "badge-danger";
      default:
        return "badge-warning";
    }
  }

  function formatDate(dateString) {
    if (!dateString) return t("common.notAvailable") || "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  return (
    <AuthRoute>
      <main className="page-with-navbar">
        <div className="container-main padding-y-xl">
          <div className="flex-row flex-gap-md margin-bottom-lg" style={{ alignItems: "center", justifyContent: "space-between" }}>
            <h1 className="heading-1 flex-row flex-gap-sm" style={{ margin: 0 }}>
              <FaShoppingBag />
              {t("orders.title")}
            </h1>
          </div>

          {error && (
            <div className="card padding-md margin-bottom-md" style={{ background: "#fee2e2", borderColor: "#ef4444" }}>
              <p className="text-error">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center padding-y-lg">
              <div className="loading-spinner mx-auto"></div>
              <p className="margin-top-md text-muted">{t("orders.loading")}</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="card-empty">
              <FaShoppingBag style={{ fontSize: "3rem", color: "var(--muted)", marginBottom: "1rem" }} />
              <p className="text-muted" style={{ fontSize: "1.125rem" }}>{t("orders.noOrders")}</p>
              <button
                onClick={() => navigate("/products")}
                className="btn-primary margin-top-md"
              >
                {t("orders.startShopping")}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="card order-card">
                  <div className="flex-row flex-gap-md" style={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div className="flex-1" style={{ minWidth: "250px" }}>
                      <div className="flex-row flex-gap-sm margin-bottom-sm" style={{ alignItems: "center" }}>
                        <h3 className="section-title" style={{ margin: 0 }}>
                          {t("orders.order")} #{order.id.substring(0, 8)}
                        </h3>
                        <span className={`badge ${getStatusBadgeClass(order.status)} flex-row flex-gap-xs`} style={{ alignItems: "center" }}>
                          {getStatusIcon(order.status)}
                          <span style={{ textTransform: "capitalize" }}>{t(`orders.status.${order.status?.toLowerCase() || "pending"}`) || order.status || "pending"}</span>
                        </span>
                      </div>
                      
                      <div className="flex-row flex-gap-md margin-top-sm" style={{ flexWrap: "wrap", gap: "1rem" }}>
                        <div className="flex-row flex-gap-xs" style={{ alignItems: "center", color: "var(--muted)" }}>
                          <FaCalendarAlt />
                          <span className="text-sm">{formatDate(order.createdAt)}</span>
                        </div>
                        <div className="text-sm" style={{ color: "var(--muted)" }}>
                          {order.items?.length || 0} {order.items?.length === 1 ? t("orders.item") : t("orders.items")}
                        </div>
                      </div>

                      {order.items && order.items.length > 0 && (
                        <div className="margin-top-md">
                          <div className="flex-row flex-gap-sm" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
                            {order.items.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="order-item-preview">
                                {item.image && (
                                  <img
                                    src={item.image}
                                    alt={getTranslated(item.name, i18n.language || 'en')}
                                    className="order-item-image"
                                  />
                                )}
                                <div className="order-item-info">
                                  <p className="text-sm font-semibold" style={{ margin: 0 }}>
                                    {getTranslated(item.name, i18n.language || 'en')}
                                  </p>
                                  <p className="text-xs text-muted" style={{ margin: 0 }}>
                                    {t("orderDetail.qty")} {item.quantity}
                                  </p>
                                </div>
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <div className="order-item-preview" style={{ alignItems: "center", justifyContent: "center" }}>
                                <span className="text-sm text-muted">+{order.items.length - 3} {t("orders.more")}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex-column flex-gap-sm" style={{ alignItems: "flex-end", minWidth: "150px" }}>
                      <div className="text-right">
                        <p className="text-sm text-muted" style={{ margin: 0 }}>{t("orders.total")}</p>
                        <p className="text-lg font-bold" style={{ margin: 0, marginTop: "0.25rem" }}>
                          {formatPrice(order.total || 0)}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="btn-primary btn-sm flex-row flex-gap-xs"
                        style={{ alignItems: "center" }}
                      >
                        <span>{t("orders.viewDetails")}</span>
                        <FaArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </AuthRoute>
  );
}


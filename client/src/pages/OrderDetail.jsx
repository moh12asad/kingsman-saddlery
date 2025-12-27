import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { auth } from "../lib/firebase";
import AuthRoute from "../components/AuthRoute";
import {
  FaShoppingBag,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
  FaUser,
  FaTimes,
  FaFileInvoice,
} from "react-icons/fa";
import Invoice from "../components/Invoice";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    if (user && id) {
      loadOrder();
    }
  }, [user, id]);

  // Check for success parameter on mount and when order is loaded
  useEffect(() => {
    const success = searchParams.get("success");
    if (success === "true" && order) {
      setShowSuccessMessage(true);
      // Remove the success parameter from URL without reloading
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("success");
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, order]);

  async function loadOrder() {
    try {
      setLoading(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setError(t("orderDetail.errors.mustSignIn"));
        return;
      }

      if (!id) {
        setError(t("orderDetail.errors.orderIdMissing"));
        return;
      }

      const res = await fetch(`${API}/api/orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        const orders = data.orders || [];
        
        // Try to find the order by exact ID match
        let foundOrder = orders.find(o => o.id === id);
        
        // If not found, try case-insensitive match (just in case)
        if (!foundOrder) {
          foundOrder = orders.find(o => o.id?.toLowerCase() === id?.toLowerCase());
        }
        
        if (foundOrder) {
          setOrder(foundOrder);
        } else {
          console.error("Order not found. Looking for ID:", id);
          console.error("Available order IDs:", orders.map(o => o.id));
          setError(t("orderDetail.errors.orderNotFound"));
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || t("orderDetail.errors.failedToLoad"));
      }
    } catch (err) {
      console.error("Error loading order:", err);
      setError(t("orderDetail.errors.failedToLoadRetry"));
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
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  if (loading) {
    return (
      <AuthRoute>
        <main className="page-with-navbar">
          <div className="container-main padding-y-xl">
            <div className="text-center padding-y-lg">
              <div className="loading-spinner mx-auto"></div>
              <p className="margin-top-md text-muted">{t("orderDetail.loading")}</p>
            </div>
          </div>
        </main>
      </AuthRoute>
    );
  }

  if (error || !order) {
    return (
      <AuthRoute>
        <main className="page-with-navbar">
          <div className="container-main padding-y-xl">
            <div className="card card-error padding-md">
              <p className="text-error">{error || t("orderDetail.notFound")}</p>
              <div className="margin-top-md">
                <Link to="/orders" className="btn-primary">
                  {t("orderDetail.backToOrders")}
                </Link>
              </div>
            </div>
          </div>
        </main>
      </AuthRoute>
    );
  }

  return (
    <AuthRoute>
      <main className="page-with-navbar">
        <div className="container-main padding-y-xl">
          {showSuccessMessage && (
            <div className="card padding-md margin-bottom-lg" style={{ background: "#dcfce7", borderColor: "#22c55e" }}>
              <div className="flex-row flex-gap-md" style={{ alignItems: "flex-start" }}>
                <FaCheckCircle style={{ color: "#16a34a", fontSize: "1.5rem", flexShrink: 0, marginTop: "0.125rem" }} />
                <div className="flex-1">
                  <h3 style={{ color: "#16a34a", margin: 0, marginBottom: "0.5rem", fontSize: "1.125rem", fontWeight: "600" }}>
                    {t("orderDetail.orderPlacedSuccessfully")}
                  </h3>
                  <p style={{ color: "#16a34a", margin: 0, fontSize: "0.875rem" }}>
                    {t("orderDetail.orderPlacedMessage")} {order?.customerEmail || t("orderConfirmation.notSet")}.
                  </p>
                </div>
                <button
                  onClick={() => setShowSuccessMessage(false)}
                  className="btn btn-sm"
                  style={{ 
                    color: "#16a34a", 
                    background: "transparent", 
                    border: "none", 
                    padding: "0.25rem",
                    cursor: "pointer",
                    flexShrink: 0
                  }}
                  aria-label="Close success message"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
          )}

          <div className="flex-row flex-gap-md margin-bottom-lg order-header-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div className="flex-row flex-gap-md" style={{ alignItems: "center" }}>
              <h1 className="heading-1 flex-row flex-gap-sm order-heading">
                <FaShoppingBag />
                {t("orderDetail.title")} #{order.id.substring(0, 8)}
              </h1>
              <span className={`badge ${getStatusBadgeClass(order.status)} flex-row flex-gap-xs order-badge`}>
                {getStatusIcon(order.status)}
                <span className="order-badge-text">{t(`orders.status.${order.status?.toLowerCase() || "pending"}`) || order.status || "pending"}</span>
              </span>
            </div>
            <button
              onClick={() => setShowInvoice(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <FaFileInvoice />
              {t("orderDetail.viewInvoice")}
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Column: Order Items */}
            <div className="space-y-6">
              <div className="card">
                <h2 className="section-title flex-row flex-gap-sm margin-bottom-md">
                  <FaShoppingBag />
                  {t("orderDetail.orderItems")} ({order.items?.length || 0})
                </h2>
                <div className="space-y-3">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => (
                      <div key={idx} className="flex gap-4 padding-y-sm border-bottom">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-lg border order-item-image-wrapper"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400 text-xs order-item-image-wrapper">
                            {t("orderDetail.noImage")}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-small">{item.name}</h3>
                          {item.category && (
                            <p className="text-xs text-muted">{item.category}</p>
                          )}
                          <div className="flex items-center gap-2 margin-top-xs">
                            <span className="text-sm text-muted">{t("orderDetail.qty")} {item.quantity}</span>
                            <span className="text-sm font-semibold">
                              {formatPrice((item.price || 0) * (item.quantity || 1))}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted text-sm">{t("orderDetail.noItems")}</p>
                  )}
                </div>
                <div className="margin-top-md padding-top-md border-top space-y-2">
                  {/* Subtotal before discount */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted">{t("orderDetail.subtotal")}</span>
                    <span className="text-sm font-semibold">
                      {formatPrice(order.subtotalBeforeDiscount || order.subtotal || 0)}
                    </span>
                  </div>
                  
                  {/* Discount information */}
                  {order.discount && order.discount.amount > 0 && (
                    <>
                      <div className="flex justify-between items-center" style={{ color: "#22c55e" }}>
                        <span className="text-sm font-semibold">
                          {order.discount.type === "new_user" ? t("orderDetail.newUserDiscount") : t("orderDetail.discount")} ({order.discount.percentage}%):
                        </span>
                        <span className="text-sm font-semibold">
                          -{formatPrice(order.discount.amount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted">{t("orderDetail.subtotalAfterDiscount")}</span>
                        <span className="text-sm font-semibold">
                          {formatPrice(order.subtotal || 0)}
                        </span>
                      </div>
                    </>
                  )}
                  
                  {/* Tax */}
                  {order.tax && order.tax > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted">{t("orderDetail.tax")}</span>
                      <span className="text-sm font-semibold">{formatPrice(order.tax)}</span>
                    </div>
                  )}
                  
                  {/* Delivery cost */}
                  {order.metadata?.deliveryType === "delivery" && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted">{t("orderDetail.delivery")}</span>
                      <span className="text-sm font-semibold">
                        {formatPrice((order.total || 0) - (order.subtotal || 0) - (order.tax || 0))}
                      </span>
                    </div>
                  )}
                  
                  {/* Final Total */}
                  <div className="flex justify-between items-center padding-top-sm border-top">
                    <span className="font-semibold">{t("orderDetail.total")}</span>
                    <span className="text-lg font-bold">{formatPrice(order.total || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Order Information */}
            <div className="space-y-6">
              {/* Order Details */}
              <div className="card">
                <h2 className="section-title margin-bottom-md">{t("orderDetail.orderInformation")}</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="text-muted" />
                    <div>
                      <p className="text-muted order-info-label">{t("orderDetail.orderDate")}</p>
                      <p className="order-info-value">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  {order.updatedAt && order.updatedAt !== order.createdAt && (
                    <div className="flex items-center gap-2">
                      <FaClock className="text-muted" />
                      <div>
                        <p className="text-muted order-info-label">{t("orderDetail.lastUpdated")}</p>
                        <p className="order-info-value">{formatDate(order.updatedAt)}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <FaShoppingBag className="text-muted" />
                    <div>
                      <p className="text-muted order-info-label">{t("orderDetail.orderId")}</p>
                      <p className="font-mono text-xs order-info-value-mono">{order.id}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="card">
                <h2 className="section-title margin-bottom-md flex-row flex-gap-sm">
                  <FaUser />
                  {t("orderDetail.customerInformation")}
                </h2>
                <div className="space-y-3 text-sm">
                  {order.customerName && (
                    <div className="flex items-center gap-2">
                      <FaUser className="text-muted" />
                      <span>{order.customerName}</span>
                    </div>
                  )}
                  {order.customerEmail && (
                    <div className="flex items-center gap-2">
                      <FaEnvelope className="text-muted" />
                      <span>{order.customerEmail}</span>
                    </div>
                  )}
                  {order.phone && (
                    <div className="flex items-center gap-2">
                      <FaPhone className="text-muted" />
                      <span>{order.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Address / Pickup Information */}
              {order.metadata?.deliveryType === "pickup" ? (
                <div className="card">
                  <h2 className="section-title margin-bottom-md flex-row flex-gap-sm">
                    <FaMapMarkerAlt />
                    {t("orderDetail.pickupInformation")}
                  </h2>
                  <div className="space-y-2 text-sm">
                    <p className="order-text-bold">{t("orderDetail.storePickup")}</p>
                    <p className="order-text-muted">{t("orderDetail.pickupMessage")}</p>
                  </div>
                </div>
              ) : order.shippingAddress ? (
                <div className="card">
                  <h2 className="section-title margin-bottom-md flex-row flex-gap-sm">
                    <FaMapMarkerAlt />
                    {t("orderDetail.deliveryAddress")}
                  </h2>
                  <div className="space-y-2 text-sm">
                    {order.shippingAddress.street && (
                      <p className="order-text-no-margin">{order.shippingAddress.street}</p>
                    )}
                    {(order.shippingAddress.city || order.shippingAddress.zipCode) && (
                      <p className="order-text-no-margin">
                        {order.shippingAddress.city} {order.shippingAddress.zipCode}
                      </p>
                    )}
                    {order.shippingAddress.country && (
                      <p className="order-text-no-margin">{order.shippingAddress.country}</p>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Notes */}
              {order.notes && (
                <div className="card">
                  <h2 className="section-title margin-bottom-md">{t("orderDetail.notes")}</h2>
                  <p className="text-sm order-text-no-margin">{order.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Modal */}
        {showInvoice && (
          <div
            className="invoice-modal-overlay"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 1000,
              overflowY: "auto",
              padding: "2rem",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowInvoice(false);
              }
            }}
          >
            <div style={{ position: "relative", maxWidth: "900px", margin: "0 auto" }}>
              <Invoice order={order} onClose={() => setShowInvoice(false)} />
            </div>
          </div>
        )}
      </main>
    </AuthRoute>
  );
}


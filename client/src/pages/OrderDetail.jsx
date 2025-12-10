import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
  FaArrowLeft,
  FaUser
} from "react-icons/fa";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && id) {
      loadOrder();
    }
  }, [user, id]);

  async function loadOrder() {
    try {
      setLoading(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setError("You must be signed in to view order details");
        return;
      }

      const res = await fetch(`${API}/api/orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        const foundOrder = data.orders?.find(o => o.id === id);
        if (foundOrder) {
          setOrder(foundOrder);
        } else {
          setError("Order not found");
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || "Failed to load order details");
      }
    } catch (err) {
      console.error("Error loading order:", err);
      setError("Failed to load order details. Please try again.");
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
    if (!dateString) return "N/A";
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
              <p className="margin-top-md text-muted">Loading order details...</p>
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
            <div className="card padding-md" style={{ background: "#fee2e2", borderColor: "#ef4444" }}>
              <p className="text-error">{error || "Order not found"}</p>
              <Link to="/orders" className="btn-primary margin-top-md">
                Back to Orders
              </Link>
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
          <button
            onClick={() => navigate("/orders")}
            className="btn-secondary margin-bottom-md flex-row flex-gap-xs"
            style={{ alignItems: "center" }}
          >
            <FaArrowLeft />
            <span>Back to Orders</span>
          </button>

          <div className="flex-row flex-gap-md margin-bottom-lg" style={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <h1 className="heading-1 flex-row flex-gap-sm" style={{ margin: 0 }}>
              <FaShoppingBag />
              Order #{order.id.substring(0, 8)}
            </h1>
            <span className={`badge ${getStatusBadgeClass(order.status)} flex-row flex-gap-xs`} style={{ alignItems: "center", fontSize: "0.875rem", padding: "0.5rem 1rem" }}>
              {getStatusIcon(order.status)}
              <span style={{ textTransform: "capitalize" }}>{order.status || "pending"}</span>
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Column: Order Items */}
            <div className="space-y-6">
              <div className="card">
                <h2 className="section-title flex-row flex-gap-sm margin-bottom-md">
                  <FaShoppingBag />
                  Order Items ({order.items?.length || 0})
                </h2>
                <div className="space-y-3">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => (
                      <div key={idx} className="flex gap-4 padding-y-sm border-bottom">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-lg border"
                            style={{ flexShrink: 0 }}
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400 text-xs" style={{ flexShrink: 0 }}>
                            No image
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-small">{item.name}</h3>
                          {item.category && (
                            <p className="text-xs text-muted">{item.category}</p>
                          )}
                          <div className="flex items-center gap-2 margin-top-xs">
                            <span className="text-sm text-muted">Qty: {item.quantity}</span>
                            <span className="text-sm font-semibold">
                              {formatPrice((item.price || 0) * (item.quantity || 1))}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted text-sm">No items found</p>
                  )}
                </div>
                <div className="margin-top-md padding-top-md border-top">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total:</span>
                    <span className="text-lg font-bold">{formatPrice(order.total || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Order Information */}
            <div className="space-y-6">
              {/* Order Details */}
              <div className="card">
                <h2 className="section-title margin-bottom-md">Order Information</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="text-muted" />
                    <div>
                      <p className="text-muted" style={{ margin: 0, fontSize: "0.75rem" }}>Order Date</p>
                      <p style={{ margin: 0, fontWeight: 600 }}>{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  {order.updatedAt && order.updatedAt !== order.createdAt && (
                    <div className="flex items-center gap-2">
                      <FaClock className="text-muted" />
                      <div>
                        <p className="text-muted" style={{ margin: 0, fontSize: "0.75rem" }}>Last Updated</p>
                        <p style={{ margin: 0, fontWeight: 600 }}>{formatDate(order.updatedAt)}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <FaShoppingBag className="text-muted" />
                    <div>
                      <p className="text-muted" style={{ margin: 0, fontSize: "0.75rem" }}>Order ID</p>
                      <p className="font-mono text-xs" style={{ margin: 0, fontWeight: 600 }}>{order.id}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="card">
                <h2 className="section-title margin-bottom-md flex-row flex-gap-sm">
                  <FaUser />
                  Customer Information
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

              {/* Shipping Address */}
              {order.shippingAddress && (
                <div className="card">
                  <h2 className="section-title margin-bottom-md flex-row flex-gap-sm">
                    <FaMapMarkerAlt />
                    Shipping Address
                  </h2>
                  <div className="space-y-2 text-sm">
                    {order.shippingAddress.street && (
                      <p style={{ margin: 0 }}>{order.shippingAddress.street}</p>
                    )}
                    {(order.shippingAddress.city || order.shippingAddress.zipCode) && (
                      <p style={{ margin: 0 }}>
                        {order.shippingAddress.city} {order.shippingAddress.zipCode}
                      </p>
                    )}
                    {order.shippingAddress.country && (
                      <p style={{ margin: 0 }}>{order.shippingAddress.country}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {order.notes && (
                <div className="card">
                  <h2 className="section-title margin-bottom-md">Notes</h2>
                  <p className="text-sm" style={{ margin: 0 }}>{order.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </AuthRoute>
  );
}


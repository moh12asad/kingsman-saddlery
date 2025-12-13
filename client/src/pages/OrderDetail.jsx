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

      if (!id) {
        setError("Order ID is missing");
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
          setError("Order not found. The order may have been removed or you don't have permission to view it.");
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
            <div className="card card-error padding-md">
              <p className="text-error">{error || "Order not found"}</p>
              <div className="margin-top-md">
                <Link to="/orders" className="btn-primary">
                  Back to Orders
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
          <button
            onClick={() => navigate("/orders")}
            className="btn-secondary margin-bottom-md flex-row flex-gap-xs flex-center"
          >
            <FaArrowLeft />
            <span>Back to Orders</span>
          </button>

          <div className="flex-row flex-gap-md margin-bottom-lg order-header-row">
            <h1 className="heading-1 flex-row flex-gap-sm order-heading">
              <FaShoppingBag />
              Order #{order.id.substring(0, 8)}
            </h1>
            <span className={`badge ${getStatusBadgeClass(order.status)} flex-row flex-gap-xs order-badge`}>
              {getStatusIcon(order.status)}
              <span className="order-badge-text">{order.status || "pending"}</span>
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
                            className="w-20 h-20 object-cover rounded-lg border order-item-image-wrapper"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400 text-xs order-item-image-wrapper">
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
                      <p className="text-muted order-info-label">Order Date</p>
                      <p className="order-info-value">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                  {order.updatedAt && order.updatedAt !== order.createdAt && (
                    <div className="flex items-center gap-2">
                      <FaClock className="text-muted" />
                      <div>
                        <p className="text-muted order-info-label">Last Updated</p>
                        <p className="order-info-value">{formatDate(order.updatedAt)}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <FaShoppingBag className="text-muted" />
                    <div>
                      <p className="text-muted order-info-label">Order ID</p>
                      <p className="font-mono text-xs order-info-value-mono">{order.id}</p>
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

              {/* Delivery Address / Pickup Information */}
              {order.metadata?.deliveryType === "pickup" ? (
                <div className="card">
                  <h2 className="section-title margin-bottom-md flex-row flex-gap-sm">
                    <FaMapMarkerAlt />
                    Pickup Information
                  </h2>
                  <div className="space-y-2 text-sm">
                    <p className="order-text-bold">Store Pickup</p>
                    <p className="order-text-muted">Please pick up your order from our store.</p>
                  </div>
                </div>
              ) : order.shippingAddress ? (
                <div className="card">
                  <h2 className="section-title margin-bottom-md flex-row flex-gap-sm">
                    <FaMapMarkerAlt />
                    Delivery Address
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
                  <h2 className="section-title margin-bottom-md">Notes</h2>
                  <p className="text-sm order-text-no-margin">{order.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </AuthRoute>
  );
}


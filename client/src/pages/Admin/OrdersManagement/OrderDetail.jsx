import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth } from "../../../lib/firebase";
import { useCurrency } from "../../../context/CurrencyContext";
import {
  FaShoppingBag,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
  FaArrowLeft,
  FaUser,
  FaArchive,
} from "react-icons/fa";

const API = import.meta.env.VITE_API_BASE_URL || "";

const STATUS_OPTIONS = {
  new: "New",
  paid: "New",
  pending: "New",
  "in-progress": "In Progress",
  processing: "In Progress",
  ready: "Ready",
  "delivered-to-delivery": "Delivered to Delivery",
  "delivered-to-customer": "Delivered to Customer",
  fulfilled: "Delivered to Customer",
  cancelled: "Cancelled",
};

const PAYMENT_METHODS = {
  credit_card: "Credit Card",
  cash: "Cash",
  placeholder: "Not Set",
};

const DELIVERY_TYPES = {
  delivery: "Delivery",
  pickup: "Store Pickup",
};

export default function AdminOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [pendingDeliveryType, setPendingDeliveryType] = useState(null);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  async function loadOrder() {
    try {
      setLoading(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      // First try regular orders
      let res = await fetch(`${API}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const foundOrder = data.orders?.find(o => o.id === id);
      if (foundOrder) {
        setOrder(foundOrder);
        setPendingStatus(null);
        setPendingDeliveryType(null);
        setLoading(false);
        return;
      }
      }

      // If not found, try archived orders
      res = await fetch(`${API}/api/orders/archived`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const foundOrder = data.orders?.find(o => o.id === id);
        if (foundOrder) {
          setOrder(foundOrder);
          setPendingStatus(null);
          setPendingDeliveryType(null);
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

  async function updateOrderStatus(newStatus, deliveryType = null) {
    try {
      setUpdatingStatus(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      const updateData = { status: newStatus };
      // Only include deliveryType if it has a value (not null or empty string)
      if (deliveryType) {
        updateData.deliveryType = deliveryType;
      }

      const res = await fetch(`${API}/api/orders/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update order status");
      }

      await loadOrder();
      
      // Clear pending changes after successful update
      setPendingStatus(null);
      setPendingDeliveryType(null);
    } catch (err) {
      setError(err.message || "Unable to update order status");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function archiveOrder() {
    if (!window.confirm("Are you sure you want to archive this order? It will be moved to archived orders and removed from the active orders list.")) {
      return;
    }

    try {
      setArchiving(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      const res = await fetch(`${API}/api/orders/${id}/archive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to archive order");
      }

      // Navigate back to orders list after successful archive
      navigate("/admin/orders");
    } catch (err) {
      setError(err.message || "Unable to archive order");
    } finally {
      setArchiving(false);
    }
  }

  function normalizeStatus(status) {
    if (status === "paid" || status === "pending") return "new";
    return status || "new";
  }

  function getStatusBadgeClass(status) {
    const normalized = normalizeStatus(status);
    const statusClasses = {
      new: "bg-blue-100 text-blue-800",
      "in-progress": "bg-purple-100 text-purple-800",
      ready: "bg-green-100 text-green-800",
      "delivered-to-delivery": "bg-indigo-100 text-indigo-800",
      "delivered-to-customer": "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return statusClasses[normalized] || "bg-gray-100 text-gray-800";
  }

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return "N/A";
    }
  }

  function getAvailableStatuses() {
    if (!order) return [];
    const paymentMethod = order.metadata?.paymentMethod;
    const allStatuses = [
      { value: "new", label: "New" },
      { value: "in-progress", label: "In Progress" },
      { value: "ready", label: "Ready" },
      { value: "delivered-to-delivery", label: "Delivered to Delivery" },
      { value: "delivered-to-customer", label: "Delivered to Customer" },
    ];

    if (paymentMethod === "cash") {
      return allStatuses.filter(s => s.value !== "delivered-to-delivery");
    }

    return allStatuses;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-gray-500">Loading order details…</div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-6">
        <div className="card bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error || "Order not found"}</p>
          <button
            onClick={() => navigate("/admin/orders")}
            className="btn btn-primary mt-4"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const paymentMethod = order.metadata?.paymentMethod;
  const deliveryType = order.metadata?.deliveryType;
  const normalizedStatus = normalizeStatus(order.status);
  const availableStatuses = getAvailableStatuses();
  
  // Use pending values if they exist, otherwise use current order values
  const currentStatus = pendingStatus !== null ? pendingStatus : normalizedStatus;
  const currentDeliveryType = pendingDeliveryType !== null ? pendingDeliveryType : deliveryType;
  const hasPendingChanges = 
    (pendingStatus !== null && pendingStatus !== normalizedStatus) || 
    (pendingDeliveryType !== null && pendingDeliveryType !== deliveryType);

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/admin/orders")}
        className="btn btn-ghost flex items-center gap-2"
      >
        <FaArrowLeft />
        <span>Back to Orders</span>
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Order #{order.id.substring(0, 8)}</h1>
          <p className="text-sm text-gray-600 mt-1">
            Created: {formatDate(order.createdAt)}
          </p>
        </div>
        <span className={`badge ${getStatusBadgeClass(order.status)}`}>
          {STATUS_OPTIONS[order.status] || normalizedStatus}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Customer Information */}
          <div className="card">
            <h2 className="section-title flex items-center gap-2 mb-4">
              <FaUser />
              Customer Information
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600">Name</label>
                <p className="font-semibold">{order.customerName || "Unnamed"}</p>
              </div>
              <div>
                <label className="text-xs text-gray-600 flex items-center gap-1">
                  <FaEnvelope />
                  Email
                </label>
                <p>{order.customerEmail || "N/A"}</p>
              </div>
              <div>
                <label className="text-xs text-gray-600 flex items-center gap-1">
                  <FaPhone />
                  Phone
                </label>
                <p>{order.phone || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Delivery Address / Pickup Information */}
          {order.metadata?.deliveryType === "pickup" ? (
            <div className="card">
              <h2 className="section-title flex items-center gap-2 mb-4">
                <FaMapMarkerAlt />
                Pickup Information
              </h2>
              <div className="space-y-2">
                <p className="font-semibold">Store Pickup</p>
                <p className="text-gray-600 text-sm">Customer will pick up order from store</p>
              </div>
            </div>
          ) : order.shippingAddress ? (
            <div className="card">
              <h2 className="section-title flex items-center gap-2 mb-4">
                <FaMapMarkerAlt />
                Delivery Address
              </h2>
              <div className="space-y-2">
                <p>{order.shippingAddress.street || ""}</p>
                <p>
                  {order.shippingAddress.city || ""}
                  {order.shippingAddress.zipCode && `, ${order.shippingAddress.zipCode}`}
                </p>
                {order.shippingAddress.country && (
                  <p>{order.shippingAddress.country}</p>
                )}
              </div>
            </div>
          ) : null}

          {/* Order Management */}
          <div className="card">
            <h2 className="section-title mb-4">Order Management</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">Status</label>
                <select
                  className="select w-full"
                  value={currentStatus}
                  onChange={(e) => {
                    setPendingStatus(e.target.value);
                  }}
                  disabled={updatingStatus || !!order.archivedAt}
                >
                  {availableStatuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {(!currentDeliveryType || pendingDeliveryType !== null) ? (
                <div>
                  <label className="text-sm font-semibold mb-2 block">Delivery/Pickup *</label>
                  <select
                    className="select w-full"
                    value={pendingDeliveryType !== null ? (pendingDeliveryType || "") : (currentDeliveryType || "")}
                    onChange={(e) => {
                      setPendingDeliveryType(e.target.value || null);
                    }}
                    disabled={updatingStatus || !!order.archivedAt}
                  >
                    <option value="">Select Option</option>
                    <option value="delivery">Delivery</option>
                    <option value="pickup">Store Pickup</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-sm text-gray-600">Delivery Type</label>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">
                      {DELIVERY_TYPES[currentDeliveryType] || currentDeliveryType}
                    </p>
                    {!order.archivedAt && (
                      <button
                        type="button"
                        onClick={() => setPendingDeliveryType("")}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Change
                      </button>
                    )}
                  </div>
                </div>
              )}

              {hasPendingChanges && !order.archivedAt && (
                <div className="pt-4 border-t">
                  <button
                    onClick={() => updateOrderStatus(currentStatus, currentDeliveryType)}
                    disabled={updatingStatus}
                    className="btn btn-primary w-full flex-center"
                  >
                    {updatingStatus ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={() => {
                      setPendingStatus(null);
                      setPendingDeliveryType(null);
                    }}
                    disabled={updatingStatus}
                    className="btn btn-ghost w-full mt-2"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {order.archivedAt ? (
                <div className="pt-4 border-t">
                  <div className="bg-gray-100 p-3 rounded">
                    <p className="text-sm text-gray-600">
                      <strong>Archived:</strong> {formatDate(order.archivedAt)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="pt-4 border-t">
                  <button
                    onClick={archiveOrder}
                    disabled={archiving}
                    className="btn btn-secondary btn-archive w-full flex-center"
                  >
                    <FaArchive />
                    {archiving ? "Archiving..." : "Archive Order"}
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    Archive this order to move it to archived orders and remove it from active orders.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Order Items */}
          <div className="card">
            <h2 className="section-title flex items-center gap-2 mb-4">
              <FaShoppingBag />
              Order Items ({order.items?.length || 0})
            </h2>
            <div className="space-y-3">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, idx) => (
                  <div key={idx} className="flex gap-4 pb-3 border-b last:border-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-lg border"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400 text-xs">
                        No image
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.name}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-gray-600">Qty: {item.quantity}</span>
                        <span className="font-semibold">
                          {formatPrice(Number(item.price || 0))} each
                        </span>
                        <span className="font-semibold text-lg">
                          {formatPrice(Number(item.price || 0) * (item.quantity || 1))}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No items in this order</p>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="card">
            <h2 className="section-title mb-4">Order Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">
                  {formatPrice(Number(order.subtotalBeforeDiscount || order.subtotal || 0))}
                </span>
              </div>
              
              {/* Discount information */}
              {order.discount && order.discount.amount > 0 && (
                <>
                  <div className="flex justify-between" style={{ color: "#22c55e" }}>
                    <span className="text-sm font-semibold">
                      {order.discount.type === "new_user" ? "New User Discount" : "Discount"} ({order.discount.percentage}%):
                    </span>
                    <span className="text-sm font-semibold">
                      -{formatPrice(Number(order.discount.amount))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm">Subtotal after discount:</span>
                    <span className="font-semibold text-sm">
                      {formatPrice(Number(order.subtotal || 0))}
                    </span>
                  </div>
                </>
              )}
              
              {order.tax && order.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax:</span>
                  <span className="font-semibold">{formatPrice(Number(order.tax))}</span>
                </div>
              )}
              
              {/* Delivery cost */}
              {order.metadata?.deliveryType === "delivery" && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery:</span>
                  <span className="font-semibold">
                    {formatPrice(Number((order.total || 0) - (order.subtotal || 0) - (order.tax || 0)))}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold text-lg">Total:</span>
                <span className="font-bold text-lg">{formatPrice(Number(order.total || 0))}</span>
              </div>
            </div>
          </div>

          {/* Payment & Delivery Info */}
          <div className="card">
            <h2 className="section-title mb-4">Payment & Delivery</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600">Payment Method</label>
                <p className="font-semibold">
                  {PAYMENT_METHODS[paymentMethod] || paymentMethod || "Not set"}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-600">Delivery Type</label>
                <p className="font-semibold">
                  {deliveryType ? (DELIVERY_TYPES[deliveryType] || deliveryType) : "Not set"}
                </p>
              </div>
              {order.transactionId && (
                <div>
                  <label className="text-xs text-gray-600">Transaction ID</label>
                  <p className="font-mono text-xs">{order.transactionId}</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="card">
              <h2 className="section-title mb-4">Notes</h2>
              <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}


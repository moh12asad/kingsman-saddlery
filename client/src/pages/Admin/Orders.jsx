import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";

const API = import.meta.env.VITE_API_BASE_URL || "";

// Order status workflow
const STATUS_OPTIONS = {
  new: "New",
  pending: "Pending", // Legacy status
  "payment-pending": "Payment Method",
  "in-progress": "In Progress",
  processing: "Processing", // Legacy status
  ready: "Ready",
  "delivered-to-delivery": "Delivered to Delivery",
  "delivered-to-customer": "Delivered to Customer",
  fulfilled: "Fulfilled", // Legacy status
  cancelled: "Cancelled",
};

const PAYMENT_METHODS = {
  credit_card: "Credit Card",
  cash: "Cash",
};

const DELIVERY_TYPES = {
  delivery: "Delivery",
  pickup: "Store Pickup",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState({});

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");
      const res = await fetch(`${API}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load orders");
      }
      const body = await res.json();
      setOrders(body.orders || []);
    } catch (err) {
      setError(err.message || "Unable to load orders");
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId, newStatus, paymentMethod = null, deliveryType = null) {
    try {
      setUpdatingStatus(prev => ({ ...prev, [orderId]: true }));
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      const updateData = { status: newStatus };
      if (paymentMethod) updateData.paymentMethod = paymentMethod;
      if (deliveryType) updateData.deliveryType = deliveryType;

      const res = await fetch(`${API}/api/orders/${orderId}`, {
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

      await loadOrders();
    } catch (err) {
      setError(err.message || "Unable to update order status");
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [orderId]: false }));
    }
  }

  function getAvailableStatuses(order) {
    const currentStatus = order.status || "new";
    const paymentMethod = order.metadata?.paymentMethod;

    const allStatuses = [
      { value: "new", label: "New" },
      { value: "payment-pending", label: "Payment Method" },
      { value: "in-progress", label: "In Progress" },
      { value: "ready", label: "Ready" },
      { value: "delivered-to-delivery", label: "Delivered to Delivery" },
      { value: "delivered-to-customer", label: "Delivered to Customer" },
    ];

    // Filter based on payment method
    // If payment is cash, skip "delivered-to-delivery" status
    // Only show "delivered-to-delivery" for credit card payments
    if (paymentMethod === "cash") {
      return allStatuses.filter(s => s.value !== "delivered-to-delivery");
    }

    // If payment method is not set yet, show all statuses
    return allStatuses;
  }

  function getStatusBadgeClass(status) {
    const statusClasses = {
      new: "bg-blue-100 text-blue-800",
      "payment-pending": "bg-yellow-100 text-yellow-800",
      "in-progress": "bg-purple-100 text-purple-800",
      ready: "bg-green-100 text-green-800",
      "delivered-to-delivery": "bg-indigo-100 text-indigo-800",
      "delivered-to-customer": "bg-gray-100 text-gray-800",
      pending: "bg-gray-100 text-gray-800",
      processing: "bg-blue-100 text-blue-800",
      fulfilled: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return statusClasses[status] || "bg-gray-100 text-gray-800";
  }

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return "N/A";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="section-title">Order Dashboard</h1>
        <button
          onClick={loadOrders}
          className="btn btn-ghost"
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="card bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="card">
        <div className="section-title">All Orders</div>
        {loading ? (
          <div className="text-gray-500 text-sm py-8 text-center">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="text-gray-500 text-sm py-8 text-center">No orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table text-sm w-full">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Delivery</th>
                  <th>Total</th>
                  <th>Items</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const paymentMethod = order.metadata?.paymentMethod;
                  const deliveryType = order.metadata?.deliveryType;
                  const availableStatuses = getAvailableStatuses(order);
                  const isUpdating = updatingStatus[order.id];

                  return (
                    <tr key={order.id}>
                      <td>
                        <div className="font-mono text-xs">
                          {order.id.substring(0, 8)}...
                        </div>
                      </td>
                      <td>
                        <div className="font-semibold">{order.customerName || "Unnamed"}</div>
                        <div className="text-gray-500 text-xs">{order.customerEmail}</div>
                        {order.phone && (
                          <div className="text-gray-500 text-xs">{order.phone}</div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                          {STATUS_OPTIONS[order.status] || (order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : "New")}
                        </span>
                      </td>
                      <td>
                        {paymentMethod ? (
                          <span className="text-xs">
                            {PAYMENT_METHODS[paymentMethod] || paymentMethod}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Not set</span>
                        )}
                      </td>
                      <td>
                        {deliveryType ? (
                          <span className="text-xs">
                            {DELIVERY_TYPES[deliveryType] || deliveryType}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Not set</span>
                        )}
                      </td>
                      <td>
                        <div className="font-semibold">
                          ${Number(order.total || 0).toFixed(2)}
                        </div>
                      </td>
                      <td>
                        <ul className="text-gray-600 space-y-1 text-xs">
                          {(order.items || []).slice(0, 2).map((item, idx) => (
                            <li key={idx}>
                              {item.quantity} × {item.name}
                            </li>
                          ))}
                          {(order.items || []).length > 2 && (
                            <li className="text-gray-400">
                              +{(order.items || []).length - 2} more
                            </li>
                          )}
                        </ul>
                      </td>
                      <td>
                        <div className="text-xs text-gray-600">
                          {formatDate(order.createdAt)}
                        </div>
                      </td>
                      <td>
                        <div className="space-y-2 min-w-[200px]">
                          <div>
                            <label className="text-xs text-gray-600 mb-1 block">Status</label>
                            <select
                              className="select text-xs w-full"
                              value={order.status || "new"}
                              onChange={(e) => {
                                const newStatus = e.target.value;
                                updateOrderStatus(order.id, newStatus, paymentMethod, deliveryType);
                              }}
                              disabled={isUpdating}
                            >
                              {availableStatuses.map((status) => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              ))}
                              {/* Show current status if it's not in available statuses (for legacy statuses) */}
                              {!availableStatuses.find(s => s.value === (order.status || "new")) && order.status && (
                                <option value={order.status}>
                                  {STATUS_OPTIONS[order.status] || order.status}
                                </option>
                              )}
                            </select>
                          </div>
                          
                          {(order.status === "payment-pending" || !paymentMethod) && (
                            <div className="space-y-1">
                              <div>
                                <label className="text-xs text-gray-600 mb-1 block">Payment Method</label>
                                <select
                                  className="select text-xs w-full"
                                  value={paymentMethod || ""}
                                  onChange={(e) => {
                                    const method = e.target.value;
                                    updateOrderStatus(order.id, order.status, method, deliveryType);
                                  }}
                                  disabled={isUpdating}
                                >
                                  <option value="">Select Payment</option>
                                  <option value="credit_card">Credit Card</option>
                                  <option value="cash">Cash</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-gray-600 mb-1 block">Delivery Type</label>
                                <select
                                  className="select text-xs w-full"
                                  value={deliveryType || ""}
                                  onChange={(e) => {
                                    const type = e.target.value;
                                    updateOrderStatus(order.id, order.status, paymentMethod, type);
                                  }}
                                  disabled={isUpdating}
                                >
                                  <option value="">Select Delivery</option>
                                  <option value="delivery">Delivery</option>
                                  <option value="pickup">Store Pickup</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

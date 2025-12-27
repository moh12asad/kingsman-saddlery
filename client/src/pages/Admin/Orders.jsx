import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "../../lib/firebase";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function AdminOrders() {
  const { t } = useTranslation();
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
      if (!token) throw new Error(t('admin.orders.errors.mustSignIn'));
      const res = await fetch(`${API}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || t('admin.orders.errors.failedToLoad'));
      }
      const body = await res.json();
      setOrders(body.orders || []);
    } catch (err) {
      setError(err.message || t('admin.orders.errors.unableToLoad'));
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId, newStatus, paymentMethod = null, deliveryType = null) {
    try {
      setUpdatingStatus(prev => ({ ...prev, [orderId]: true }));
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error(t('admin.orders.errors.mustSignIn'));

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
        throw new Error(body.error || t('admin.orders.errors.failedToUpdate'));
      }

      await loadOrders();
    } catch (err) {
      setError(err.message || t('admin.orders.errors.unableToUpdate'));
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [orderId]: false }));
    }
  }

  function getAvailableStatuses(order) {
    const currentStatus = order.status || "new";
    const paymentMethod = order.metadata?.paymentMethod;

    const allStatuses = [
      { value: "new", label: t('admin.orders.statuses.new') },
      { value: "payment-pending", label: t('admin.orders.statuses.paymentPending') },
      { value: "in-progress", label: t('admin.orders.statuses.inProgress') },
      { value: "ready", label: t('admin.orders.statuses.ready') },
      { value: "delivered-to-delivery", label: t('admin.orders.statuses.deliveredToDelivery') },
      { value: "delivered-to-customer", label: t('admin.orders.statuses.deliveredToCustomer') },
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
        <h1 className="section-title">{t('admin.orders.title')}</h1>
        <button
          onClick={loadOrders}
          className="btn btn-ghost"
          disabled={loading}
        >
          {loading ? t('admin.orders.loading') : t('admin.orders.refresh')}
        </button>
      </div>

      {error && (
        <div className="card bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="card">
        <div className="section-title">{t('admin.orders.title')}</div>
        {loading ? (
          <div className="text-gray-500 text-sm py-8 text-center">{t('admin.orders.loading')}</div>
        ) : orders.length === 0 ? (
          <div className="text-gray-500 text-sm py-8 text-center">{t('admin.orders.noOrders')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table text-sm w-full">
              <thead>
                <tr>
                  <th>{t('admin.orders.orderId')}</th>
                  <th>{t('admin.orders.customer')}</th>
                  <th>{t('admin.orders.status')}</th>
                  <th>{t('admin.orders.paymentMethod')}</th>
                  <th>{t('admin.orders.deliveryType')}</th>
                  <th>{t('admin.orders.total')}</th>
                  <th>{t('admin.orders.items')}</th>
                  <th>{t('admin.orders.date')}</th>
                  <th>{t('admin.orders.actions')}</th>
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
                        <div className="font-semibold">{order.customerName || t('admin.orders.unnamed')}</div>
                        <div className="text-gray-500 text-xs">{order.customerEmail}</div>
                        {order.phone && (
                          <div className="text-gray-500 text-xs">{order.phone}</div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                          {order.status === "new" ? t('admin.orders.statuses.new') : 
                           order.status === "payment-pending" ? t('admin.orders.statuses.paymentPending') :
                           order.status === "in-progress" ? t('admin.orders.statuses.inProgress') :
                           order.status === "ready" ? t('admin.orders.statuses.ready') :
                           order.status === "delivered-to-delivery" ? t('admin.orders.statuses.deliveredToDelivery') :
                           order.status === "delivered-to-customer" ? t('admin.orders.statuses.deliveredToCustomer') :
                           order.status === "pending" ? t('admin.orders.statuses.pending') :
                           order.status === "processing" ? t('admin.orders.statuses.processing') :
                           order.status === "fulfilled" ? t('admin.orders.statuses.fulfilled') :
                           order.status === "cancelled" ? t('admin.orders.statuses.cancelled') :
                           (order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : t('admin.orders.statuses.new'))}
                        </span>
                      </td>
                      <td>
                        {paymentMethod ? (
                          <span className="text-xs">
                            {paymentMethod === "credit_card" ? t('admin.orders.paymentMethods.creditCard') :
                             paymentMethod === "cash" ? t('admin.orders.paymentMethods.cash') :
                             paymentMethod}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">{t('common.notSet')}</span>
                        )}
                      </td>
                      <td>
                        {deliveryType ? (
                          <span className="text-xs">
                            {deliveryType === "delivery" ? t('admin.orders.deliveryTypes.delivery') :
                             deliveryType === "pickup" ? t('admin.orders.deliveryTypes.pickup') :
                             deliveryType}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">{t('common.notSet')}</span>
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
                              +{(order.items || []).length - 2} {t('admin.orders.more')}
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
                            <label className="text-xs text-gray-600 mb-1 block">{t('admin.orders.status')}</label>
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
                                  {order.status === "new" ? t('admin.orders.statuses.new') : 
                                   order.status === "payment-pending" ? t('admin.orders.statuses.paymentPending') :
                                   order.status === "in-progress" ? t('admin.orders.statuses.inProgress') :
                                   order.status === "ready" ? t('admin.orders.statuses.ready') :
                                   order.status === "delivered-to-delivery" ? t('admin.orders.statuses.deliveredToDelivery') :
                                   order.status === "delivered-to-customer" ? t('admin.orders.statuses.deliveredToCustomer') :
                                   order.status === "pending" ? t('admin.orders.statuses.pending') :
                                   order.status === "processing" ? t('admin.orders.statuses.processing') :
                                   order.status === "fulfilled" ? t('admin.orders.statuses.fulfilled') :
                                   order.status === "cancelled" ? t('admin.orders.statuses.cancelled') :
                                   order.status}
                                </option>
                              )}
                            </select>
                          </div>
                          
                          {(order.status === "payment-pending" || !paymentMethod) && (
                            <div className="space-y-1">
                              <div>
                                <label className="text-xs text-gray-600 mb-1 block">{t('admin.orders.paymentMethod')}</label>
                                <select
                                  className="select text-xs w-full"
                                  value={paymentMethod || ""}
                                  onChange={(e) => {
                                    const method = e.target.value;
                                    updateOrderStatus(order.id, order.status, method, deliveryType);
                                  }}
                                  disabled={isUpdating}
                                >
                                  <option value="">{t('admin.orders.selectPayment')}</option>
                                  <option value="credit_card">{t('admin.orders.paymentMethods.creditCard')}</option>
                                  <option value="cash">{t('admin.orders.paymentMethods.cash')}</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-gray-600 mb-1 block">{t('admin.orders.deliveryType')}</label>
                                <select
                                  className="select text-xs w-full"
                                  value={deliveryType || ""}
                                  onChange={(e) => {
                                    const type = e.target.value;
                                    updateOrderStatus(order.id, order.status, paymentMethod, type);
                                  }}
                                  disabled={isUpdating}
                                >
                                  <option value="">{t('admin.orders.selectDelivery')}</option>
                                  <option value="delivery">{t('admin.orders.deliveryTypes.delivery')}</option>
                                  <option value="pickup">{t('admin.orders.deliveryTypes.pickup')}</option>
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

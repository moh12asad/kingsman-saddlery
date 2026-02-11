import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "../../lib/firebase";
import { FaExclamationTriangle, FaUser, FaEnvelope, FaCreditCard, FaCalendar, FaEdit, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import { useCurrency } from "../../context/CurrencyContext";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function FailedOrders() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [failedOrders, setFailedOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingComment, setEditingComment] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [updating, setUpdating] = useState(false);

  const STATUS_OPTIONS = useMemo(() => ({
    pending: t("admin.failedOrders.status.pending"),
    resolved: t("admin.failedOrders.status.resolved"),
    refunded: t("admin.failedOrders.status.refunded"),
  }), [t]);

  useEffect(() => {
    loadFailedOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [failedOrders, statusFilter, searchQuery]);

  async function loadFailedOrders() {
    try {
      setLoading(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      const response = await fetch(`${API}/api/orders/failed`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load failed orders");
      }

      const data = await response.json();
      setFailedOrders(data.failedOrders || []);
    } catch (err) {
      console.error("Error loading failed orders:", err);
      setError(err.message || "Failed to load failed orders");
    } finally {
      setLoading(false);
    }
  }

  function filterOrders() {
    let filtered = failedOrders;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.transactionId?.toLowerCase().includes(query) ||
          order.userEmail?.toLowerCase().includes(query) ||
          order.userName?.toLowerCase().includes(query) ||
          order.comment?.toLowerCase().includes(query)
      );
    }

    // Sort by newest first
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    setFilteredOrders(filtered);
  }

  async function updateOrderStatus(orderId, newStatus) {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      const response = await fetch(`${API}/api/orders/failed/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update order status");
      }

      // Reload orders
      await loadFailedOrders();
    } catch (err) {
      console.error("Error updating order status:", err);
      setError(err.message || "Failed to update order status");
    }
  }

  async function updateComment(orderId) {
    try {
      setUpdating(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      const response = await fetch(`${API}/api/orders/failed/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment: newComment }),
      });

      if (!response.ok) {
        throw new Error("Failed to update comment");
      }

      setEditingComment(false);
      setNewComment("");
      await loadFailedOrders();
    } catch (err) {
      console.error("Error updating comment:", err);
      setError(err.message || "Failed to update comment");
    } finally {
      setUpdating(false);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return "N/A";
    }
  }

  function getStatusBadgeClass(status) {
    const statusClasses = {
      pending: "bg-yellow-100 text-yellow-800",
      resolved: "bg-green-100 text-green-800",
      refunded: "bg-blue-100 text-blue-800",
    };
    return statusClasses[status] || "bg-gray-100 text-gray-800";
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="loading-spinner mx-auto"></div>
        <p className="mt-4 text-gray-600">{t("admin.failedOrders.loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("admin.failedOrders.title")}</h2>
          <p className="text-gray-600 mt-1">{t("admin.failedOrders.subtitle")}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("admin.failedOrders.filterByStatus")}
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="all">{t("admin.failedOrders.status.all")}</option>
              {Object.entries(STATUS_OPTIONS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("admin.failedOrders.search")}
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("admin.failedOrders.searchPlaceholder")}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-sm text-gray-600">{t("admin.failedOrders.total")}</div>
          <div className="text-2xl font-bold">{failedOrders.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-600">{t("admin.failedOrders.pending")}</div>
          <div className="text-2xl font-bold text-yellow-600">
            {failedOrders.filter((o) => o.status === "pending").length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-600">{t("admin.failedOrders.totalAmount")}</div>
          <div className="text-2xl font-bold">
            {formatPrice(failedOrders.reduce((sum, o) => sum + (o.amount || 0), 0))}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="card p-8 text-center text-gray-500">
            {t("admin.failedOrders.noOrders")}
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FaExclamationTriangle className="text-red-500" />
                    <h3 className="text-lg font-semibold">
                      {t("admin.failedOrders.order")} #{order.id.slice(0, 8)}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                      {STATUS_OPTIONS[order.status] || order.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <FaCreditCard className="text-gray-400" />
                      <span>
                        <strong>{t("admin.failedOrders.transactionId")}:</strong> {order.transactionId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaCalendar className="text-gray-400" />
                      <span>
                        <strong>{t("admin.failedOrders.date")}:</strong> {formatDate(order.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaUser className="text-gray-400" />
                      <span>
                        <strong>{t("admin.failedOrders.customer")}:</strong> {order.userName || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaEnvelope className="text-gray-400" />
                      <span>
                        <strong>{t("admin.failedOrders.email")}:</strong> {order.userEmail || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">
                    {formatPrice(order.amount || 0)}
                  </div>
                </div>
              </div>

              {/* Comment Section */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">{t("admin.failedOrders.issue")}:</h4>
                  {!editingComment && (
                    <button
                      onClick={() => {
                        setSelectedOrder(order.id);
                        setNewComment(order.comment || "");
                        setEditingComment(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                    >
                      <FaEdit className="text-xs" />
                      {t("admin.failedOrders.edit")}
                    </button>
                  )}
                </div>
                {editingComment && selectedOrder === order.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                      className="w-full p-2 border rounded"
                      placeholder={t("admin.failedOrders.commentPlaceholder")}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateComment(order.id)}
                        disabled={updating}
                        className="btn btn-primary btn-sm"
                      >
                        {updating ? t("admin.failedOrders.saving") : t("admin.failedOrders.save")}
                      </button>
                      <button
                        onClick={() => {
                          setEditingComment(false);
                          setSelectedOrder(null);
                          setNewComment("");
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        {t("admin.failedOrders.cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {order.comment || t("admin.failedOrders.noComment")}
                  </p>
                )}
              </div>

              {/* Order Items Preview */}
              {order.orderData?.items && order.orderData.items.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-2">{t("admin.failedOrders.items")}:</h4>
                  <div className="space-y-1">
                    {order.orderData.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="text-sm text-gray-600">
                        {item.quantity}x {item.name} - {formatPrice(item.price || 0)}
                      </div>
                    ))}
                    {order.orderData.items.length > 3 && (
                      <div className="text-sm text-gray-500">
                        +{order.orderData.items.length - 3} {t("admin.failedOrders.moreItems")}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="border-t pt-4 mt-4 flex gap-2">
                {order.status !== "resolved" && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "resolved")}
                    className="btn btn-success btn-sm flex items-center gap-2"
                  >
                    <FaCheckCircle />
                    {t("admin.failedOrders.markResolved")}
                  </button>
                )}
                {order.status !== "refunded" && (
                  <button
                    onClick={() => updateOrderStatus(order.id, "refunded")}
                    className="btn btn-secondary btn-sm flex items-center gap-2"
                  >
                    <FaTimesCircle />
                    {t("admin.failedOrders.markRefunded")}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


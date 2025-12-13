import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "../../../lib/firebase";
import { useCurrency } from "../../../context/CurrencyContext";

const API = import.meta.env.VITE_API_BASE_URL || "";

// Order status workflow
const STATUS_OPTIONS = {
  new: "New",
  paid: "New", // Map paid to new
  pending: "New", // Legacy status
  "in-progress": "In Progress",
  processing: "In Progress", // Legacy status
  ready: "Ready",
  "delivered-to-delivery": "Delivered to Delivery",
  "delivered-to-customer": "Delivered to Customer",
  fulfilled: "Delivered to Customer", // Legacy status
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

export default function OrdersDashboard() {
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  // Determine filter based on route
  const getStatusFilter = () => {
    const path = location.pathname;
    if (path.includes("/archived")) return "archived";
    if (path.includes("/new")) return "new";
    if (path.includes("/in-progress")) return "in-progress";
    if (path.includes("/ready")) return "ready";
    if (path.includes("/delivery")) return "delivered-to-delivery";
    if (path.includes("/completed")) return "delivered-to-customer";
    return null; // Show all
  };

  useEffect(() => {
    loadOrders();
  }, [location.pathname]);

  useEffect(() => {
    filterOrders();
  }, [orders, location.pathname, searchQuery]);

  function filterOrders() {
    let filtered = orders;

    // Apply status filter (skip for archived orders - they're already filtered)
    const statusFilter = getStatusFilter();
    if (statusFilter && statusFilter !== "archived") {
      filtered = filtered.filter(order => {
        const orderStatus = normalizeStatus(order.status);
        return orderStatus === statusFilter;
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => {
        const customerName = (order.customerName || "").toLowerCase();
        const customerEmail = (order.customerEmail || "").toLowerCase();
        const orderId = (order.id || "").toLowerCase();
        const phone = (order.phone || "").toLowerCase();
        
        return (
          customerName.includes(query) ||
          customerEmail.includes(query) ||
          orderId.includes(query) ||
          phone.includes(query) ||
          (order.items || []).some(item => 
            (item.name || "").toLowerCase().includes(query)
          )
        );
      });
    }

    setFilteredOrders(filtered);
  }

  function normalizeStatus(status) {
    // Map paid, pending to new
    if (status === "paid" || status === "pending") return "new";
    return status || "new";
  }

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");
      
      const statusFilter = getStatusFilter();
      const endpoint = statusFilter === "archived" 
        ? `${API}/api/orders/archived`
        : `${API}/api/orders`;
      
      const res = await fetch(endpoint, {
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

  const displayOrders = filteredOrders;
  const statusFilter = getStatusFilter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="section-title">
          {statusFilter === "archived"
            ? "Archived Orders"
            : statusFilter 
            ? STATUS_OPTIONS[statusFilter] || "Orders"
            : "All Orders"}
        </h1>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search orders..."
            className="input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ minWidth: "250px" }}
          />
          <button
            onClick={loadOrders}
            className="btn btn-ghost"
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="card bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="card">
        <div className="section-title">
          {statusFilter === "archived"
            ? `Archived Orders (${displayOrders.length})`
            : statusFilter 
            ? `${STATUS_OPTIONS[statusFilter]} Orders (${displayOrders.length})`
            : `All Orders (${displayOrders.length})`}
        </div>
        {loading ? (
          <div className="text-gray-500 text-sm py-8 text-center">Loading orders…</div>
        ) : displayOrders.length === 0 ? (
          <div className="text-gray-500 text-sm py-8 text-center">No orders found.</div>
        ) : (
          <div className="overflow-x-auto" style={{ width: "100%" }}>
            <table className="table" style={{ fontSize: "0.875rem", width: "100%", minWidth: "1400px" }}>
              <thead>
                <tr>
                  <th style={{ padding: "1rem", minWidth: "150px" }}>Order ID</th>
                  <th style={{ padding: "1rem", minWidth: "250px" }}>Customer</th>
                  <th style={{ padding: "1rem", minWidth: "150px" }}>Status</th>
                  <th style={{ padding: "1rem", minWidth: "150px" }}>Payment</th>
                  <th style={{ padding: "1rem", minWidth: "180px" }}>Delivery/Pickup</th>
                  <th style={{ padding: "1rem", minWidth: "120px" }}>Total</th>
                  <th style={{ padding: "1rem", minWidth: "300px" }}>Items</th>
                  <th style={{ padding: "1rem", minWidth: "200px" }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {displayOrders.map((order) => {
                  const paymentMethod = order.metadata?.paymentMethod;
                  const deliveryType = order.metadata?.deliveryType;

                  return (
                    <tr 
                      key={order.id}
                      onClick={() => navigate(`/admin/orders/${order.id}`)}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{ cursor: "pointer" }}
                    >
                      <td style={{ padding: "1rem" }}>
                        <div className="font-mono">
                          {order.id.substring(0, 8)}...
                        </div>
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <div className="font-semibold">{order.customerName || "Unnamed"}</div>
                        <div className="text-gray-500 text-sm">{order.customerEmail}</div>
                        {order.phone && (
                          <div className="text-gray-500 text-sm">{order.phone}</div>
                        )}
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <div className="flex flex-col gap-1">
                          <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                            {STATUS_OPTIONS[order.status] || (order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : "New")}
                          </span>
                          {order.archivedAt && (
                            <span className="badge bg-gray-200 text-gray-700 text-xs">
                              Archived
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "1rem" }}>
                        {paymentMethod ? (
                          <span>
                            {PAYMENT_METHODS[paymentMethod] || paymentMethod}
                          </span>
                        ) : (
                          <span className="text-gray-400">Not set</span>
                        )}
                      </td>
                      <td style={{ padding: "1rem" }}>
                        {deliveryType ? (
                          <span className="font-medium">
                            {DELIVERY_TYPES[deliveryType] || deliveryType}
                          </span>
                        ) : (
                          <span className="text-gray-400">Not set</span>
                        )}
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <div className="font-semibold">
                          {formatPrice(Number(order.total || 0))}
                        </div>
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <ul className="text-gray-600 space-y-1">
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
                      <td style={{ padding: "1rem" }}>
                        <div className="text-gray-600">
                          {formatDate(order.createdAt)}
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


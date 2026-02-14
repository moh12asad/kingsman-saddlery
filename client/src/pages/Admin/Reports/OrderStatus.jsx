import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "../../../lib/firebase";
import { useCurrency } from "../../../context/CurrencyContext";

const API = import.meta.env.VITE_API_BASE_URL || "";

const STATUS_LABELS = {
  "new": "New",
  "in-progress": "In Progress",
  "ready": "Ready",
  "delivered-to-delivery": "Delivered to Delivery",
  "delivered-to-customer": "Delivered to Customer",
  "cancelled": "Cancelled"
};

export default function OrderStatus() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`${API}/api/reports/order-status?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load order status report");
      }

      const body = await res.json();
      setData(body);
    } catch (err) {
      setError(err.message || "Unable to load data");
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadgeClass(status) {
    const statusClasses = {
      new: "bg-blue-100 text-blue-800",
      "in-progress": "bg-purple-100 text-purple-800",
      ready: "bg-green-100 text-green-800",
      "delivered-to-delivery": "bg-indigo-100 text-indigo-800",
      "delivered-to-customer": "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return statusClasses[status] || "bg-gray-100 text-gray-800";
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="section-title margin-bottom-md">{t('admin.reports.orderStatus')}</div>
        
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">{t('admin.reports.startDate')}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('admin.reports.endDate')}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
            />
          </div>
        </div>

        {error && (
          <div className="card bg-red-50 border border-red-200 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">{t('admin.reports.loading')}</div>
        ) : data && data.statusBreakdown ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="card bg-blue-50">
                <div className="text-sm text-gray-600 mb-1">{t('admin.reports.totalOrders')}</div>
                <div className="text-2xl font-bold text-blue-700">{data.totalOrders}</div>
              </div>
              <div className="card bg-green-50">
                <div className="text-sm text-gray-600 mb-1">{t('admin.reports.totalRevenue')}</div>
                <div className="text-2xl font-bold text-green-700">{formatPrice(data.totalRevenue)}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="table" style={{ fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    <th>{t('admin.reports.status')}</th>
                    <th className="text-right">{t('admin.reports.count')}</th>
                    <th className="text-right">{t('admin.reports.percentage')}</th>
                    <th className="text-right">{t('admin.reports.revenue')}</th>
                    <th className="text-right">{t('admin.reports.revenuePercentage')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.statusBreakdown.map((item) => (
                    <tr key={item.status}>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                          {STATUS_LABELS[item.status] || item.status}
                        </span>
                      </td>
                      <td className="text-right">{item.count}</td>
                      <td className="text-right">{item.percentage.toFixed(1)}%</td>
                      <td className="text-right font-semibold">{formatPrice(item.revenue)}</td>
                      <td className="text-right">{item.revenuePercentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}


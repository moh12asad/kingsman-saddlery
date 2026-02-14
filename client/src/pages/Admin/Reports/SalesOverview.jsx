import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "../../../lib/firebase";
import { useCurrency } from "../../../context/CurrencyContext";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function SalesOverview() {
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

      const res = await fetch(`${API}/api/reports/sales-overview?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load sales overview");
      }

      const body = await res.json();
      setData(body);
    } catch (err) {
      setError(err.message || "Unable to load data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="section-title margin-bottom-md">{t('admin.reports.salesOverview')}</div>
        
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
          <div className="flex items-end">
            <button onClick={loadData} className="btn btn-primary" disabled={loading}>
              {loading ? t('admin.reports.loading') : t('admin.reports.refresh')}
            </button>
          </div>
        </div>

        {error && (
          <div className="card bg-red-50 border border-red-200 mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">{t('admin.reports.loading')}</div>
        ) : data ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card bg-blue-50">
              <div className="text-sm text-gray-600 mb-1">{t('admin.reports.totalRevenue')}</div>
              <div className="text-2xl font-bold text-blue-700">{formatPrice(data.totalRevenue)}</div>
              {data.revenueGrowth !== 0 && (
                <div className={`text-sm mt-1 ${data.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(data.revenueGrowth).toFixed(1)}%
                </div>
              )}
            </div>

            <div className="card bg-green-50">
              <div className="text-sm text-gray-600 mb-1">{t('admin.reports.totalOrders')}</div>
              <div className="text-2xl font-bold text-green-700">{data.totalOrders}</div>
              <div className="text-sm text-gray-500 mt-1">
                {t('admin.reports.cancelled')}: {data.cancelledOrders}
              </div>
            </div>

            <div className="card bg-purple-50">
              <div className="text-sm text-gray-600 mb-1">{t('admin.reports.averageOrderValue')}</div>
              <div className="text-2xl font-bold text-purple-700">{formatPrice(data.averageOrderValue)}</div>
            </div>

            <div className="card bg-orange-50">
              <div className="text-sm text-gray-600 mb-1">{t('admin.reports.totalDiscounts')}</div>
              <div className="text-2xl font-bold text-orange-700">{formatPrice(data.totalDiscounts)}</div>
            </div>

            <div className="card bg-gray-50">
              <div className="text-sm text-gray-600 mb-1">{t('admin.reports.totalSubtotal')}</div>
              <div className="text-xl font-semibold">{formatPrice(data.totalSubtotal)}</div>
            </div>

            <div className="card bg-gray-50">
              <div className="text-sm text-gray-600 mb-1">{t('admin.reports.totalTax')}</div>
              <div className="text-xl font-semibold">{formatPrice(data.totalTax)}</div>
            </div>

            <div className="card bg-gray-50">
              <div className="text-sm text-gray-600 mb-1">{t('admin.reports.totalDeliveryCost')}</div>
              <div className="text-xl font-semibold">{formatPrice(data.totalDeliveryCost)}</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}


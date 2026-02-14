import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "../../../lib/firebase";
import { useCurrency } from "../../../context/CurrencyContext";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function ProductsByCategory() {
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

      const res = await fetch(`${API}/api/reports/products-by-category?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load products by category");
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
        <div className="section-title margin-bottom-md">{t('admin.reports.productsByCategory')}</div>
        
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
        ) : data && data.categories ? (
          <>
            <div className="card bg-blue-50 mb-6">
              <div className="text-sm text-gray-600 mb-1">{t('admin.reports.totalRevenue')}</div>
              <div className="text-2xl font-bold text-blue-700">{formatPrice(data.totalRevenue)}</div>
              <div className="text-sm text-gray-500 mt-1">
                {t('admin.reports.totalCategories')}: {data.totalCategories}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="table" style={{ fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    <th>{t('admin.reports.category')}</th>
                    <th>{t('admin.reports.subCategory')}</th>
                    <th className="text-right">{t('admin.reports.revenue')}</th>
                    <th className="text-right">{t('admin.reports.quantity')}</th>
                    <th className="text-right">{t('admin.reports.orderCount')}</th>
                    <th className="text-right">{t('admin.reports.productCount')}</th>
                    <th className="text-right">{t('admin.reports.averageOrderValue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categories.map((cat, idx) => (
                    <tr key={idx}>
                      <td className="font-semibold">{cat.category}</td>
                      <td>{cat.subCategory || "-"}</td>
                      <td className="text-right font-semibold">{formatPrice(cat.revenue)}</td>
                      <td className="text-right">{cat.quantity}</td>
                      <td className="text-right">{cat.orderCount}</td>
                      <td className="text-right">{cat.productCount}</td>
                      <td className="text-right">{formatPrice(cat.averageOrderValue)}</td>
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


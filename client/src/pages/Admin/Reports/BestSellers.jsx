import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "../../../lib/firebase";
import { useCurrency } from "../../../context/CurrencyContext";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function BestSellers() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("quantity");
  const [limit, setLimit] = useState("50");

  useEffect(() => {
    loadData();
  }, [startDate, endDate, sortBy, limit]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      params.append("sortBy", sortBy);
      params.append("limit", limit);

      const res = await fetch(`${API}/api/reports/best-sellers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load best sellers");
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
        <div className="section-title margin-bottom-md">{t('admin.reports.bestSellers')}</div>
        
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
          <div>
            <label className="block text-sm font-medium mb-1">{t('admin.reports.sortBy')}</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input">
              <option value="quantity">{t('admin.reports.quantity')}</option>
              <option value="revenue">{t('admin.reports.revenue')}</option>
              <option value="orders">{t('admin.reports.orderCount')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('admin.reports.limit')}</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="input"
              min="10"
              max="200"
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
        ) : data && data.bestSellers ? (
          <div className="overflow-x-auto">
            <table className="table" style={{ fontSize: "0.875rem" }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('admin.reports.product')}</th>
                  <th>{t('admin.reports.category')}</th>
                  <th>{t('admin.reports.brand')}</th>
                  <th className="text-right">{t('admin.reports.quantity')}</th>
                  <th className="text-right">{t('admin.reports.revenue')}</th>
                  <th className="text-right">{t('admin.reports.orderCount')}</th>
                </tr>
              </thead>
              <tbody>
                {data.bestSellers.map((product, idx) => {
                  const productName = typeof product.productName === 'string' 
                    ? product.productName 
                    : (product.productName?.en || product.productName?.ar || product.productName?.he || t('admin.reports.unknownProduct'));
                  
                  return (
                    <tr key={product.productId}>
                      <td>{idx + 1}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          {product.productImage && (
                            <img 
                              src={product.productImage} 
                              alt={productName}
                              className="w-10 h-10 object-cover rounded"
                            />
                          )}
                          <span>{productName}</span>
                        </div>
                      </td>
                      <td>{product.category || "-"}</td>
                      <td>{product.brand || "-"}</td>
                      <td className="text-right">{product.totalQuantity}</td>
                      <td className="text-right font-semibold">{formatPrice(product.totalRevenue)}</td>
                      <td className="text-right">{product.orderCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}


import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "../../../lib/firebase";
import { useCurrency } from "../../../context/CurrencyContext";

const API = import.meta.env.VITE_API_BASE_URL || "";

const DELIVERY_ZONE_LABELS = {
  "telaviv_north": "Tel Aviv North",
  "jerusalem": "Jerusalem",
  "south": "South",
  "westbank": "West Bank"
};

export default function GeographicSales() {
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

      const res = await fetch(`${API}/api/reports/geographic-sales?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load geographic sales");
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
        <div className="section-title margin-bottom-md">{t('admin.reports.geographicSales')}</div>
        
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
        ) : data ? (
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

            {/* Delivery Type Breakdown */}
            <div className="card mb-6">
              <div className="section-title margin-bottom-md">{t('admin.reports.deliveryTypeBreakdown')}</div>
              <div className="overflow-x-auto">
                <table className="table" style={{ fontSize: "0.875rem" }}>
                  <thead>
                    <tr>
                      <th>{t('admin.reports.deliveryType')}</th>
                      <th className="text-right">{t('admin.reports.orderCount')}</th>
                      <th className="text-right">{t('admin.reports.revenue')}</th>
                      <th className="text-right">{t('admin.reports.averageOrderValue')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.deliveryTypeBreakdown.map((item) => (
                      <tr key={item.deliveryType}>
                        <td className="font-semibold capitalize">{item.deliveryType}</td>
                        <td className="text-right">{item.orderCount}</td>
                        <td className="text-right font-semibold">{formatPrice(item.revenue)}</td>
                        <td className="text-right">{formatPrice(item.averageOrderValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* City Sales */}
            <div className="card mb-6">
              <div className="section-title margin-bottom-md">{t('admin.reports.salesByCity')}</div>
              <div className="overflow-x-auto">
                <table className="table" style={{ fontSize: "0.875rem" }}>
                  <thead>
                    <tr>
                      <th>{t('admin.reports.city')}</th>
                      <th>{t('admin.reports.zipCode')}</th>
                      <th className="text-right">{t('admin.reports.orderCount')}</th>
                      <th className="text-right">{t('admin.reports.revenue')}</th>
                      <th className="text-right">{t('admin.reports.averageOrderValue')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.citySales.map((city, idx) => (
                      <tr key={idx}>
                        <td className="font-semibold">{city.city}</td>
                        <td>{city.zipCode || "-"}</td>
                        <td className="text-right">{city.orderCount}</td>
                        <td className="text-right font-semibold">{formatPrice(city.revenue)}</td>
                        <td className="text-right">{formatPrice(city.averageOrderValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Zone Sales */}
            {data.zoneSales && data.zoneSales.length > 0 && (
              <div className="card">
                <div className="section-title margin-bottom-md">{t('admin.reports.salesByDeliveryZone')}</div>
                <div className="overflow-x-auto">
                  <table className="table" style={{ fontSize: "0.875rem" }}>
                    <thead>
                      <tr>
                        <th>{t('admin.reports.deliveryZone')}</th>
                        <th className="text-right">{t('admin.reports.orderCount')}</th>
                        <th className="text-right">{t('admin.reports.revenue')}</th>
                        <th className="text-right">{t('admin.reports.averageOrderValue')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.zoneSales.map((zone, idx) => (
                        <tr key={idx}>
                          <td className="font-semibold">
                            {DELIVERY_ZONE_LABELS[zone.zone] || zone.zone}
                          </td>
                          <td className="text-right">{zone.orderCount}</td>
                          <td className="text-right font-semibold">{formatPrice(zone.revenue)}</td>
                          <td className="text-right">{formatPrice(zone.averageOrderValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}


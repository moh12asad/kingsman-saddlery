import { useCurrency } from "../context/CurrencyContext";
import { FaPrint } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { getTranslated } from "../utils/translations";

const PAYMENT_METHODS = {
  credit_card: "Credit Card",
  cash: "Cash",
  placeholder: "Not Set",
};

const DELIVERY_TYPES = {
  delivery: "Delivery",
  pickup: "Store Pickup",
};

export default function Invoice({ order, onClose }) {
  const { formatPrice } = useCurrency();
  const { i18n } = useTranslation();

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const paymentMethod = order.metadata?.paymentMethod;
  const deliveryType = order.metadata?.deliveryType;
  const deliveryCost = order.metadata?.deliveryType === "delivery" 
    ? (order.total || 0) - (order.subtotal || 0) - (order.tax || 0)
    : 0;

  // Company information (can be customized or fetched from settings)
  const companyInfo = {
    name: "Kingsman Saddlery",
    email: "info@kingsmansaddlery.com",
    phone: "+972-54-874-0666",
    address: {
      street: "Store Address",
      city: "City",
      zipCode: "ZIP Code",
      country: "Israel",
    },
  };

  return (
    <>
      <style>{`
        @media print {
          @page {
            margin: 0.8cm;
            size: A4;
            overflow: hidden;
          }
          html, body {
            width: 100% !important;
            overflow-x: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden;
          }
          .invoice-modal-overlay,
          .invoice-modal-overlay * {
            visibility: visible;
          }
          .invoice-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: white;
            padding: 0;
            margin: 0;
            overflow: hidden !important;
            overflow-x: hidden !important;
            height: auto !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .invoice-container {
            position: relative;
            margin: 0;
            padding: 0.5rem !important;
            box-shadow: none;
            border: none;
            max-width: 100% !important;
            width: 100% !important;
            font-size: 12px;
            overflow: hidden !important;
            overflow-x: hidden !important;
            box-sizing: border-box !important;
          }
          * {
            box-sizing: border-box;
          }
          /* Ensure tables don't overflow */
          .invoice-table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed;
          }
          .invoice-table th,
          .invoice-table td {
            word-wrap: break-word;
            overflow-wrap: break-word;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .invoice-table th:first-child,
          .invoice-table td:first-child {
            width: 40% !important;
            max-width: 40% !important;
          }
          .invoice-table th:nth-child(2),
          .invoice-table td:nth-child(2) {
            width: 15% !important;
            max-width: 15% !important;
          }
          .invoice-table th:nth-child(3),
          .invoice-table td:nth-child(3) {
            width: 22.5% !important;
            max-width: 22.5% !important;
          }
          .invoice-table th:nth-child(4),
          .invoice-table td:nth-child(4) {
            width: 22.5% !important;
            max-width: 22.5% !important;
          }
          /* Ensure grids fit within page */
          [style*="grid-template-columns"] {
            max-width: 100% !important;
            width: 100% !important;
            gap: 0.6rem !important;
            box-sizing: border-box !important;
          }
          /* Prevent any element from causing overflow */
          .invoice-container * {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          /* Ensure text doesn't overflow */
          .invoice-container {
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          /* Force all divs to respect container width */
          div {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          .invoice-title {
            font-size: 1.5rem !important;
            margin-bottom: 0.3rem !important;
          }
          .invoice-header {
            margin-bottom: 0.8rem !important;
            padding-bottom: 0.8rem !important;
          }
          .invoice-section {
            margin-bottom: 0.8rem !important;
          }
          .invoice-section-title {
            font-size: 1rem !important;
            margin-bottom: 0.5rem !important;
            padding-bottom: 0.3rem !important;
          }
          .invoice-table {
            font-size: 11px;
          }
          .invoice-table th,
          .invoice-table td {
            padding: 0.4rem !important;
          }
          .invoice-totals {
            margin-top: 0.8rem !important;
            padding-top: 0.5rem !important;
          }
          .invoice-total-row {
            padding: 0.3rem 0 !important;
            font-size: 11px;
          }
          .invoice-total-final {
            font-size: 1rem !important;
            padding-top: 0.5rem !important;
            margin-top: 0.3rem !important;
          }
          .invoice-footer {
            margin-top: 0.8rem !important;
            padding-top: 0.8rem !important;
            font-size: 10px !important;
          }
          .no-print {
            display: none !important;
          }
          /* Prevent URLs from appearing in print */
          a {
            text-decoration: none;
            color: inherit;
          }
          /* Hide any potential browser-generated content */
          body::before,
          body::after {
            display: none !important;
          }
        }
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          padding: 1.2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          font-size: 14px;
          width: 100%;
          box-sizing: border-box;
          overflow-x: hidden;
        }
        .invoice-header {
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 1rem;
          margin-bottom: 1.2rem;
        }
        .invoice-title {
          font-size: 1.75rem;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 0.4rem;
        }
        .invoice-meta {
          display: flex;
          justify-content: space-between;
          margin-top: 1rem;
        }
        .invoice-section {
          margin-bottom: 1.2rem;
        }
        .invoice-section-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.6rem;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.4rem;
        }
        .invoice-table {
          width: 100%;
          max-width: 100%;
          border-collapse: collapse;
          margin-top: 0.6rem;
          font-size: 13px;
          table-layout: fixed;
        }
        .invoice-table th:first-child,
        .invoice-table td:first-child {
          width: 40%;
          max-width: 40%;
        }
        .invoice-table th:nth-child(2),
        .invoice-table td:nth-child(2) {
          width: 15%;
          max-width: 15%;
        }
        .invoice-table th:nth-child(3),
        .invoice-table td:nth-child(3) {
          width: 22.5%;
          max-width: 22.5%;
        }
        .invoice-table th:nth-child(4),
        .invoice-table td:nth-child(4) {
          width: 22.5%;
          max-width: 22.5%;
        }
        .invoice-table th {
          background-color: #f9fafb;
          padding: 0.5rem;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
          font-size: 12px;
        }
        .invoice-table td {
          padding: 0.5rem;
          border-bottom: 1px solid #e5e7eb;
          font-size: 12px;
        }
        .invoice-table tr:last-child td {
          border-bottom: none;
        }
        .text-right {
          text-align: right;
        }
        .text-bold {
          font-weight: 600;
        }
        .invoice-totals {
          margin-top: 1rem;
          border-top: 2px solid #e5e7eb;
          padding-top: 0.6rem;
        }
        .invoice-total-row {
          display: flex;
          justify-content: space-between;
          padding: 0.3rem 0;
          font-size: 13px;
        }
        .invoice-total-final {
          font-size: 1.1rem;
          font-weight: bold;
          border-top: 2px solid #1f2937;
          padding-top: 0.5rem;
          margin-top: 0.4rem;
        }
        .invoice-footer {
          margin-top: 1.2rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #6b7280;
          font-size: 0.75rem;
        }
      `}</style>

      <div className="invoice-container">
        <div className="no-print" style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button onClick={handlePrint} className="btn btn-primary flex items-center gap-2">
            <FaPrint />
            Print Invoice
          </button>
          {onClose && (
            <button onClick={onClose} className="btn btn-secondary">
              Close
            </button>
          )}
        </div>

        <div className="invoice-header">
          <div className="invoice-title">INVOICE</div>
          <div className="invoice-meta">
            <div>
              <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Invoice #</div>
              <div style={{ color: "#6b7280" }}>{order.id.substring(0, 8).toUpperCase()}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Date</div>
              <div style={{ color: "#6b7280" }}>{formatDate(order.createdAt)}</div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          <div className="invoice-section">
            <div className="invoice-section-title">From</div>
            <div style={{ lineHeight: "1.5", fontSize: "0.9rem" }}>
              <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.3rem" }}>
                {companyInfo.name}
              </div>
              <div>{companyInfo.address.street}</div>
              <div>
                {companyInfo.address.city}, {companyInfo.address.zipCode}
              </div>
              <div>{companyInfo.address.country}</div>
              <div style={{ marginTop: "0.3rem", fontSize: "0.85rem" }}>Email: {companyInfo.email}</div>
              <div style={{ fontSize: "0.85rem" }}>Phone: {companyInfo.phone}</div>
            </div>
          </div>

          <div className="invoice-section">
            <div className="invoice-section-title">Bill To</div>
            <div style={{ lineHeight: "1.5", fontSize: "0.9rem" }}>
              <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.3rem" }}>
                {order.customerName || "Customer"}
              </div>
              {order.shippingAddress ? (
                <>
                  <div>{order.shippingAddress.street || ""}</div>
                  <div>
                    {order.shippingAddress.city || ""}
                    {order.shippingAddress.zipCode && `, ${order.shippingAddress.zipCode}`}
                  </div>
                  {order.shippingAddress.country && <div>{order.shippingAddress.country}</div>}
                </>
              ) : (
                <div>Store Pickup</div>
              )}
              {order.customerEmail && (
                <div style={{ marginTop: "0.3rem", fontSize: "0.85rem" }}>Email: {order.customerEmail}</div>
              )}
              {order.phone && <div style={{ fontSize: "0.85rem" }}>Phone: {order.phone}</div>}
            </div>
          </div>
        </div>

        <div className="invoice-section">
          <div className="invoice-section-title">Order Items</div>
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="text-right">Quantity</th>
                <th className="text-right">Unit Price</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items && order.items.length > 0 ? (
                order.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{getTranslated(item.name, i18n.language || 'en')}</div>
                    </td>
                    <td className="text-right">{item.quantity || 1}</td>
                    <td className="text-right">{formatPrice(Number(item.price || 0))}</td>
                    <td className="text-right text-bold">
                      {formatPrice(Number(item.price || 0) * (item.quantity || 1))}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center", color: "#6b7280" }}>
                    No items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="invoice-section">
          <div className="invoice-totals">
            <div className="invoice-total-row">
              <span>Subtotal:</span>
              <span className="text-bold">
                {formatPrice(Number(order.subtotalBeforeDiscount || order.subtotal || 0))}
              </span>
            </div>

            {order.discount && order.discount.amount > 0 && (
              <>
                <div className="invoice-total-row" style={{ color: "#22c55e" }}>
                  <span>
                    {order.discount.type === "new_user" ? "New User Discount" : "Discount"} (
                    {order.discount.percentage}%):
                  </span>
                  <span className="text-bold">-{formatPrice(Number(order.discount.amount))}</span>
                </div>
                <div className="invoice-total-row">
                  <span>Subtotal after discount:</span>
                  <span className="text-bold">{formatPrice(Number(order.subtotal || 0))}</span>
                </div>
              </>
            )}

            {order.tax && Number(order.tax) > 0 && (
              <div className="invoice-total-row">
                <span>Tax:</span>
                <span className="text-bold">{formatPrice(Number(order.tax))}</span>
              </div>
            )}

            {deliveryType === "delivery" && deliveryCost > 0 && (
              <div className="invoice-total-row">
                <span>Delivery:</span>
                <span className="text-bold">{formatPrice(Number(deliveryCost))}</span>
              </div>
            )}

            <div className="invoice-total-row invoice-total-final">
              <span>Total:</span>
              <span>{formatPrice(Number(order.total || 0))}</span>
            </div>
          </div>
        </div>

        <div className="invoice-section">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Payment Method</div>
              <div>{PAYMENT_METHODS[paymentMethod] || paymentMethod || "Not set"}</div>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Delivery Type</div>
              <div>
                {deliveryType ? DELIVERY_TYPES[deliveryType] || deliveryType : "Not set"}
              </div>
            </div>
          </div>
          {order.transactionId && (
            <div style={{ marginTop: "1rem" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Transaction ID</div>
              <div style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
                {order.transactionId}
              </div>
            </div>
          )}
        </div>

        {order.notes && (
          <div className="invoice-section">
            <div className="invoice-section-title">Notes</div>
            <div style={{ whiteSpace: "pre-wrap", color: "#6b7280" }}>{order.notes}</div>
          </div>
        )}

        <div className="invoice-footer">
          <div>Thank you for your business!</div>
          <div style={{ marginTop: "0.5rem" }}>
            {companyInfo.name} - {companyInfo.email} - {companyInfo.phone}
          </div>
        </div>
      </div>
    </>
  );
}


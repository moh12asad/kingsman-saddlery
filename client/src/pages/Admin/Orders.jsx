import { useEffect, useMemo, useState } from "react";
import { auth } from "../../lib/firebase";
import { useLanguage } from "../../context/LanguageContext";
import { getTranslatedContent } from "../../utils/getTranslatedContent";

const API = import.meta.env.VITE_API_BASE_URL || "";

const emptyItem = () => ({ productId: "", name: "", quantity: 1, price: 0 });

export default function AdminOrders(){
  const { language } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customerId: "",
    customerName: "",
    customerEmail: "",
    status: "pending",
    notes: "",
    items: [emptyItem()],
  });

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0);
    const tax = 0;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [form.items]);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders(){
    try {
      setLoading(true);
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

  function updateItem(index, key, value) {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [key]: value } : item),
    }));
  }

  function addItem() {
    setForm(prev => ({ ...prev, items: [...prev.items, emptyItem()] }));
  }

  function removeItem(index) {
    setForm(prev => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_, i) => i !== index) : prev.items,
    }));
  }

  async function createOrder(event) {
    event?.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      const payload = {
        ...form,
        items: form.items.map(item => ({
          productId: item.productId,
          name: item.name,
          quantity: Number(item.quantity) || 1,
          price: Number(item.price) || 0,
        })),
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
      };

      const res = await fetch(`${API}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create order");
      }

      setForm({
        customerId: "",
        customerName: "",
        customerEmail: "",
        status: "pending",
        notes: "",
        items: [emptyItem()],
      });
      await loadOrders();
    } catch (err) {
      setError(err.message || "Unable to create order");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <form className="card space-y-4" onSubmit={createOrder}>
        <div className="section-title">Create Order</div>
        <div className="grid md:grid-cols-2 gap-4">
          <input className="input" placeholder="Customer name" value={form.customerName} onChange={e=>setForm(prev=>({...prev,customerName:e.target.value}))} />
          <input className="input" placeholder="Customer email" value={form.customerEmail} onChange={e=>setForm(prev=>({...prev,customerEmail:e.target.value}))} />
          <input className="input" placeholder="Customer ID (optional)" value={form.customerId} onChange={e=>setForm(prev=>({...prev,customerId:e.target.value}))} />
          <select className="select" value={form.status} onChange={e=>setForm(prev=>({...prev,status:e.target.value}))}>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="space-y-2">
          <div className="section-title text-base">Items</div>
          {form.items.map((item, idx) => (
            <div key={idx} className="grid md:grid-cols-5 gap-2 items-end">
              <input className="input" placeholder="Product ID" value={item.productId} onChange={e=>updateItem(idx, "productId", e.target.value)} />
              <input className="input" placeholder="Name" value={item.name} onChange={e=>updateItem(idx, "name", e.target.value)} />
              <input className="input" type="number" min="1" placeholder="Qty" value={item.quantity} onChange={e=>updateItem(idx, "quantity", e.target.value)} />
              <input className="input" type="number" min="0" step="0.01" placeholder="Price" value={item.price} onChange={e=>updateItem(idx, "price", e.target.value)} />
              <button type="button" className="btn btn-ghost" onClick={()=>removeItem(idx)}>Remove</button>
            </div>
          ))}
          <button type="button" className="btn" onClick={addItem}>Add item</button>
        </div>

        <textarea className="input" rows={3} placeholder="Notes" value={form.notes} onChange={e=>setForm(prev=>({...prev,notes:e.target.value}))} />

        <div className="text-sm text-gray-600">
          <p>Subtotal: ${totals.subtotal.toFixed(2)}</p>
          <p>Total: ${totals.total.toFixed(2)}</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create order"}
        </button>
      </form>

      <div className="card">
        <div className="section-title">Recent orders</div>
        {loading ? (
          <div className="text-gray-500 text-sm">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="text-gray-500 text-sm">No orders yet.</div>
        ) : (
          <table className="table text-sm">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Status</th>
                <th>Total</th>
                <th>Items</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td>
                    <div className="font-semibold">{order.customerName || "Unnamed"}</div>
                    <div className="text-gray-500">{order.customerEmail}</div>
                  </td>
                  <td>{order.status}</td>
                  <td>${Number(order.total || 0).toFixed(2)}</td>
                  <td>
                    <ul className="text-gray-600 space-y-1">
                      {(order.items || []).map((item, idx) => {
                        const itemName = typeof item.name === 'object' 
                          ? getTranslatedContent(item.name, language) 
                          : item.name;
                        return <li key={idx}>{item.quantity} × {itemName}</li>;
                      })}
                    </ul>
                  </td>
                  <td>{order.createdAt ? new Date(order.createdAt).toLocaleString() : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}



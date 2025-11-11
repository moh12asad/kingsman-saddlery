import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../lib/firebase";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function AdminCategories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", description: "" });

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      const res = await fetch(`${API}/api/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load categories");
      }

      const body = await res.json();
      setCategories(body.categories || []);
    } catch (err) {
      setError(err.message || "Unable to load categories");
    } finally {
      setLoading(false);
    }
  }

  async function createCategory(e) {
    e?.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      const res = await fetch(`${API}/api/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create category");
      }

      setForm({ name: "", description: "" });
      await loadCategories();
    } catch (err) {
      setError(err.message || "Unable to create category");
    } finally {
      setSubmitting(false);
    }
  }


  async function deleteCategory(id) {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      setSubmitting(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      const res = await fetch(`${API}/api/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete category");
      }

      await loadCategories();
    } catch (err) {
      setError(err.message || "Unable to delete category");
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <div className="space-y-6">
      <form className="card space-y-4" onSubmit={createCategory}>
        <div className="section-title">Create Category</div>
        <div className="grid md:grid-cols-2 gap-4">
          <input
            className="input"
            placeholder="Category name *"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <input
            className="input"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Create Category"}
          </button>
        </div>
      </form>

      <div className="card">
        <div className="section-title">Categories</div>
        {loading ? (
          <div className="text-gray-500 text-sm">Loading categories…</div>
        ) : categories.length === 0 ? (
          <div className="text-gray-500 text-sm">No categories yet. Create one above.</div>
        ) : (
          <table className="table text-sm">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Name</th>
                <th style={{ textAlign: 'left' }}>Description</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td className="font-semibold" style={{ textAlign: 'left' }}>{category.name}</td>
                  <td className="text-gray-600" style={{ textAlign: 'left' }}>{category.description || "-"}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex-row flex-gap-sm" style={{ justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/admin/categories/edit/${category.id}`)}
                        disabled={submitting}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteCategory(category.id)}
                        disabled={submitting}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth } from "../../lib/firebase";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function EditCategory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCategory();
  }, [id]);

  async function loadCategory() {
    try {
      setLoading(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      const response = await fetch(`${API}/api/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      const found = (data.categories || []).find(c => c.id === id);
      if (!found) {
        setError("Category not found");
        return;
      }
      setCategory(found);
    } catch (err) {
      setError(err.message || "Failed to load category");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      if (!category.name || category.name.trim() === "") {
        throw new Error("Category name is required");
      }

      const payload = {
        name: category.name.trim(),
        description: category.description || "",
      };

      const res = await fetch(`${API}/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to update category" }));
        throw new Error(data.error || "Failed to update category");
      }

      navigate("/admin/categories");
    } catch (err) {
      setError(err.message || "Unable to update category");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="text-center padding-y-lg">
          <div className="text-muted">Loading category...</div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="card">
        <div className="text-center padding-y-lg">
          <p className="text-error">{error || "Category not found"}</p>
          <button onClick={() => navigate("/admin/categories")} className="btn btn-primary margin-top-md">
            Back to Categories
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="spacing-y-lg">
      <div className="flex-row-between">
        <h2 className="section-title">Edit Category</h2>
        <button onClick={() => navigate("/admin/categories")} className="btn btn-sm">
          ← Back to Categories
        </button>
      </div>

      <div className="card">
        <div className="grid-form">
          <div>
            <div className="form-group">
              <label className="form-label form-label-required">Category Name</label>
              <input
                className="input"
                placeholder="Category name"
                value={category.name || ""}
                onChange={e => setCategory({ ...category, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                className="input"
                placeholder="Description (optional)"
                value={category.description || ""}
                onChange={e => setCategory({ ...category, description: e.target.value })}
              />
            </div>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="flex-row flex-gap-md margin-top-lg">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !category.name || category.name.trim() === ""}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            className="btn"
            onClick={() => navigate("/admin/categories")}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}


import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProduct();
    loadCategories();
  }, [id]);

  async function loadProduct() {
    try {
      setLoading(true);
      const response = await fetch(`${API}/api/products`);
      const data = await response.json();
      const found = (data.products || []).find(p => p.id === id);
      if (!found) {
        setError("Product not found");
        return;
      }
      setProduct(found);
    } catch (err) {
      setError(err.message || "Failed to load product");
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const r = await fetch(`${API}/api/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const b = await r.json();
      setCategories(b.categories || []);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  }

  async function uploadImage(file) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `products/${id}-${Date.now()}-${safeName}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const publicUrl = await uploadImage(file);
      setProduct(prev => ({ ...prev, image: publicUrl }));
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      const payload = {
        name: product.name,
        price: Number(product.price) || 0,
        category: product.category || "",
        image: product.image || "",
        description: product.description ? product.description.trim() : "",
        available: product.available,
        sale: product.sale,
        sale_proce: Number(product.sale_proce) || 0,
      };

      const res = await fetch(`${API}/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to update product" }));
        throw new Error(data.error || "Failed to update product");
      }

      navigate("/admin/products");
    } catch (err) {
      setError(err.message || "Unable to update product");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="text-center padding-y-lg">
          <div className="text-muted">Loading product...</div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="card">
        <div className="text-center padding-y-lg">
          <p className="text-error">{error || "Product not found"}</p>
          <button onClick={() => navigate("/admin/products")} className="btn btn-primary margin-top-md">
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="spacing-y-lg">
      <div className="flex-row-between">
        <h2 className="section-title">Edit Product</h2>
        <button onClick={() => navigate("/admin/products")} className="btn btn-sm">
          ← Back to Products
        </button>
      </div>

      <div className="card">
        <div className="grid-form grid-form-3">
          <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
            <div className="form-group">
              <label className="form-label form-label-required">Product Name</label>
              <input
                className="input"
                placeholder="Product name"
                value={product.name || ""}
                onChange={e => setProduct({ ...product, name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <div className="form-group">
              <label className="form-label form-label-required">Price</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  className="input"
                  type="number"
                  placeholder="Price"
                  value={product.price || ""}
                  onChange={e => setProduct({ ...product, price: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="select"
                value={product.category || ""}
                onChange={e => setProduct({ ...product, category: e.target.value })}
              >
                <option value="">Select category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="input"
                placeholder="Product description (optional)"
                rows="4"
                value={product.description || ""}
                onChange={e => setProduct({ ...product, description: e.target.value })}
              />
            </div>
          </div>

          <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
            <div className="form-group">
              <label className="form-label">Image URL</label>
              <input
                className="input"
                placeholder="Image URL (optional)"
                value={product.image || ""}
                onChange={e => setProduct({ ...product, image: e.target.value })}
              />
            </div>
          </div>

          <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
            <div className="form-group">
              <label className="form-label">Upload Image</label>
              <label className="flex-row flex-gap-sm border rounded padding-x-md padding-y-sm cursor-pointer transition">
                <span>Choose file</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
              {uploadingImage && <span className="text-small text-muted margin-top-sm">Uploading...</span>}
            </div>
          </div>

          {product.image && (
            <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
              <div className="form-group">
                <label className="form-label">Image Preview</label>
                <img src={product.image} alt={product.name} className="w-40 h-40 object-cover rounded-lg border shadow-sm" />
              </div>
            </div>
          )}

          <div className="grid-col-span-full md:col-span-2 lg:col-span-3 flex-row flex-gap-xl">
            <label className="flex-row flex-gap-sm cursor-pointer">
              <input
                type="checkbox"
                checked={product.available}
                onChange={e => setProduct({ ...product, available: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-small">Available</span>
            </label>

            <label className="flex-row flex-gap-sm cursor-pointer">
              <input
                type="checkbox"
                checked={product.sale}
                onChange={e => setProduct({ ...product, sale: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-small">On Sale</span>
            </label>
          </div>

          {product.sale && (
            <div>
              <div className="form-group">
                <label className="form-label">Sale Price</label>
                <div className="input-group">
                  <span className="input-group-text">$</span>
                  <input
                    className="input"
                    type="number"
                    placeholder="Sale price"
                    value={product.sale_proce || ""}
                    onChange={e => setProduct({ ...product, sale_proce: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="flex-row flex-gap-md margin-top-lg">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !product.name || !product.price}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            className="btn"
            onClick={() => navigate("/admin/products")}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}


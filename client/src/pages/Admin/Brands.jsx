import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { checkAdmin } from "../../utils/checkAdmin";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function AdminBrands() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    logo: "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function loadBrands() {
    try {
      setLoading(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      
      const res = await fetch(`${API}/api/brands`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setBrands(data.brands || []);
    } catch (err) {
      setError(err.message || "Failed to load brands");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBrands();
  }, []);

  async function uploadImage(file) {
    // Ensure user is authenticated
    if (!auth.currentUser) {
      throw new Error("You must be signed in to upload images");
    }

    // Check if user is admin
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      throw new Error("Only administrators can upload brand logos");
    }
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error("Image size must be less than 5MB");
    }

    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storageRef = ref(storage, `brands/${Date.now()}_${safeName}`);
    
    try {
      await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          uploadedBy: auth.currentUser.uid,
          uploadedAt: new Date().toISOString()
        }
      });
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Upload error:", error);
      if (error.code === 'storage/unauthorized') {
        throw new Error("Storage permission denied. Please update Firebase Storage rules in Firebase Console (Storage → Rules) to include: match /brands/{allPaths=**} { allow read: if true; allow write: if request.auth != null; }");
      } else if (error.code === 'storage/canceled') {
        throw new Error("Upload was canceled");
      } else if (error.code) {
        throw new Error(`Upload failed: ${error.message}`);
      }
      throw error;
    }
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    setError("");
    try {
      const publicUrl = await uploadImage(file);
      setForm(prev => ({ ...prev, logo: publicUrl }));
    } catch (err) {
      setError(err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  }

  async function createBrand(e) {
    e?.preventDefault();
    try {
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      if (!form.name || form.name.trim() === "") {
        throw new Error("Brand name is required");
      }

      if (!form.logo || form.logo.trim() === "") {
        throw new Error("Brand logo is required");
      }

      const res = await fetch(`${API}/api/brands`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create brand");
      }

      setForm({ name: "", logo: "" });
      await loadBrands();
    } catch (err) {
      setError(err.message || "Failed to create brand");
    }
  }

  async function deleteBrand(id) {
    try {
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      const res = await fetch(`${API}/api/brands/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete brand");
      }

      await loadBrands();
      setConfirmDelete(null);
      setDeletingId(null);
    } catch (err) {
      setError(err.message || "Failed to delete brand");
    }
  }

  return (
    <div>
      <div className="section-title">Manage Brands</div>

      {error && (
        <div className="alert alert-error margin-bottom-md">
          {error}
        </div>
      )}

      {/* Create Brand Form */}
      <div className="card margin-bottom-lg">
        <h2 className="heading-3 margin-bottom-md">Add New Brand</h2>
        <form onSubmit={createBrand}>
          <div className="form-group">
            <label htmlFor="brand-name">Brand Name</label>
            <input
              id="brand-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter brand name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="brand-logo">Brand Logo</label>
            <input
              id="brand-logo"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={uploadingImage}
            />
            {uploadingImage && <p className="text-small text-muted">Uploading...</p>}
            {form.logo && (
              <div className="margin-top-sm">
                <img
                  src={form.logo}
                  alt="Brand logo preview"
                  style={{ maxWidth: "200px", maxHeight: "100px", objectFit: "contain" }}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={uploadingImage || !form.name || !form.logo}
          >
            {uploadingImage ? "Uploading..." : "Create Brand"}
          </button>
        </form>
      </div>

      {/* Brands List */}
      <div className="card">
        <h2 className="heading-3 margin-bottom-md">All Brands</h2>
        {loading ? (
          <p className="text-muted">Loading brands...</p>
        ) : brands.length === 0 ? (
          <p className="text-muted">No brands found. Create your first brand above.</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Logo</th>
                  <th>Name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {brands.map((brand) => (
                  <tr key={brand.id}>
                    <td>
                      {brand.logo ? (
                        <img
                          src={brand.logo}
                          alt={brand.name}
                          style={{ maxWidth: "100px", maxHeight: "60px", objectFit: "contain" }}
                        />
                      ) : (
                        <span className="text-muted">No logo</span>
                      )}
                    </td>
                    <td>{brand.name}</td>
                    <td>
                      <button
                        className="btn-secondary btn-small"
                        onClick={() => {
                          setDeletingId(brand.id);
                          setConfirmDelete(brand);
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => {
          setConfirmDelete(null);
          setDeletingId(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="heading-3 margin-bottom-md">Delete Brand?</h2>
            <p className="margin-bottom-lg">
              Are you sure you want to delete "{confirmDelete.name}"? This action cannot be undone.
            </p>
            <div className="flex-row flex-gap-md">
              <button
                className="btn-secondary btn-full"
                onClick={() => {
                  setConfirmDelete(null);
                  setDeletingId(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn-danger btn-full"
                onClick={() => deleteBrand(confirmDelete.id)}
                disabled={deletingId === confirmDelete.id}
              >
                {deletingId === confirmDelete.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




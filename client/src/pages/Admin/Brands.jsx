import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../lib/firebase";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function AdminBrands() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
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


  async function deleteBrand(id) {
    try {
      setError("");
      setDeletingId(id);
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
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Brands</h1>
        <button
          className="btn btn-cta"
          onClick={() => navigate("/admin/brands/create")}
        >
          + Add Brand
        </button>
      </div>

      {error && (
        <div className="card bg-red-50 border-2 border-red-200 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="card">
        <h2 className="heading-3 margin-bottom-md">All Brands</h2>
        {loading ? (
          <p className="text-muted">Loading brands...</p>
        ) : brands.length === 0 ? (
          <p className="text-muted">No brands found. Create your first brand!</p>
        ) : (
          <div className="table-responsive">
            <table className="table brands-table">
              <thead>
                <tr>
                  <th style={{ width: "150px" }}>Logo</th>
                  <th>Name</th>
                  <th style={{ width: "200px", textAlign: "left" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {brands.map((brand) => (
                  <tr key={brand.id}>
                    <td style={{ verticalAlign: "middle" }}>
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
                    <td style={{ verticalAlign: "middle" }}>{brand.name}</td>
                    <td style={{ verticalAlign: "middle", textAlign: "left" }}>
                      <div className="flex-row flex-gap-sm">
                        <button
                          className="btn-primary btn-small"
                          onClick={() => navigate(`/admin/brands/edit/${brand.id}`)}
                          disabled={deletingId === brand.id}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-secondary btn-small"
                          onClick={() => {
                            setConfirmDelete(brand);
                          }}
                          disabled={deletingId === brand.id}
                        >
                          Delete
                        </button>
                      </div>
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




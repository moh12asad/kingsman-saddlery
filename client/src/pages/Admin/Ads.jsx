import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../lib/firebase";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function AdminAds() {
  const navigate = useNavigate();
  const [ads, setAds] = useState([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [adError, setAdError] = useState("");
  const [deletingAdId, setDeletingAdId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function loadAds() {
    try {
      setLoadingAds(true);
      setAdError(""); // Clear any previous errors
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      // Load all ads (including inactive) for admin view with all languages
      const res = await fetch(`${API}/api/ads/all?all=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Failed to load ads" }));
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }
      
      const data = await res.json();
      setAds(data.ads || []);
    } catch (err) {
      // Show error instead of silently falling back to incomplete data
      setAdError(err.message || "Failed to load ads. Please refresh the page.");
      setAds([]); // Clear ads to avoid showing incomplete data
    } finally {
      setLoadingAds(false);
    }
  }

  useEffect(() => {
    loadAds();
  }, []);


  async function deleteAd(id) {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    setDeletingAdId(id);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API}/api/ads/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete");
      setConfirmDelete(null);
      await loadAds();
    } catch (err) {
      setAdError(err.message || "Failed to delete ad");
    } finally {
      setDeletingAdId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Promotional Banner Ads</h1>
          <p className="text-gray-600 text-sm mt-1">
            Upload and manage sliding images for the promotional banner. These will appear as a carousel on the shop page.
          </p>
        </div>
        <button
          className="btn btn-cta"
          onClick={() => navigate("/admin/ads/create")}
        >
          + Add Ad
        </button>
      </div>

      {adError && (
        <div className="card bg-red-50 border-2 border-red-200 p-4">
          <p className="text-sm text-red-600">{adError}</p>
        </div>
      )}

      <div className="card">
        <h3 className="text-lg font-semibold mb-3">Current Ads ({ads.length})</h3>
          {loadingAds ? (
            <p className="text-gray-500">Loading ads...</p>
          ) : ads.length === 0 ? (
            <p className="text-gray-500">No ads yet. Create your first ad above!</p>
          ) : (
            <div className="space-y-4">
              {ads.map(ad => (
                <div key={ad.id} className={`border rounded-lg p-4 flex gap-4 items-start ${!ad.active ? 'opacity-60' : ''}`}>
                  <img
                    src={ad.image}
                    alt={ad.title || "Ad"}
                    className="w-32 h-20 object-cover rounded border"
                  />
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {typeof ad.title === 'string' ? ad.title : (ad.title?.en || ad.title?.ar || ad.title?.he || "No title")}
                      {!ad.active && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Inactive</span>}
                    </div>
                    <div className="text-sm text-gray-600">
                      {typeof ad.subtitle === 'string' ? ad.subtitle : (ad.subtitle?.en || ad.subtitle?.ar || ad.subtitle?.he || "No subtitle")}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {ad.link && <span>Link: {ad.link} | </span>}
                      Order: {ad.order || 0}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate(`/admin/ads/edit/${ad.id}`)}
                      disabled={deletingAdId === ad.id}
                    >
                      Edit
                    </button>
                    {confirmDelete === ad.id ? (
                      <div className="flex gap-1">
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => deleteAd(ad.id)}
                          disabled={deletingAdId === ad.id}
                        >
                          {deletingAdId === ad.id ? "..." : "Confirm"}
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => setConfirmDelete(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setConfirmDelete(ad.id)}
                        disabled={deletingAdId === ad.id}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}






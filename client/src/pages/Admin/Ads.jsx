import { useState, useEffect } from "react";
import { auth, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { checkAdmin } from "../../utils/checkAdmin";
import MultiLanguageInput from "../../components/Admin/MultiLanguageInput";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function AdminAds() {
  const [ads, setAds] = useState([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [adForm, setAdForm] = useState({
    image: "",
    title: { en: "", ar: "", he: "" },
    subtitle: { en: "", ar: "", he: "" },
    link: "",
    order: 0,
    active: true
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [adError, setAdError] = useState("");
  const [editingAdId, setEditingAdId] = useState(null);
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

  async function uploadImage(file) {
    if (!auth.currentUser) {
      throw new Error("You must be signed in to upload images");
    }

    // Check if user is admin
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      throw new Error("Only administrators can upload ad images");
    }
    
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }
    
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `ads/${Date.now()}-${safeName}`;
    const storageRef = ref(storage, path);
    
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
        throw new Error("You don't have permission to upload images. Please check Firebase Storage rules.");
      }
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setAdError("Image size must be less than 5MB");
      return;
    }
    
    setUploadingImage(true);
    setAdError("");
    try {
      const publicUrl = await uploadImage(file);
      setAdForm(prev => ({ ...prev, image: publicUrl }));
    } catch (err) {
      setAdError(err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  }

  async function saveAd() {
    try {
      setAdError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      if (!adForm.image) {
        setAdError("Image is required");
        return;
      }

      const payload = {
        image: adForm.image,
        title: adForm.title || "",
        subtitle: adForm.subtitle || "",
        link: adForm.link || "",
        order: Number(adForm.order) || 0,
        active: adForm.active
      };

      let res;
      if (editingAdId) {
        res = await fetch(`${API}/api/ads/${editingAdId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API}/api/ads`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to save ad" }));
        throw new Error(data.error || "Failed to save ad");
      }

      setAdForm({ 
        image: "", 
        title: { en: "", ar: "", he: "" }, 
        subtitle: { en: "", ar: "", he: "" }, 
        link: "", 
        order: 0, 
        active: true 
      });
      setEditingAdId(null);
      await loadAds();
    } catch (err) {
      setAdError(err.message || "Unable to save ad");
    }
  }

  // Helper to ensure translation object format
  function ensureTranslationObject(value) {
    if (typeof value === 'string') {
      return { en: value, ar: "", he: "" };
    }
    if (typeof value === 'object' && value !== null) {
      return {
        en: value.en || "",
        ar: value.ar || "",
        he: value.he || ""
      };
    }
    return { en: "", ar: "", he: "" };
  }
  
  function editAd(ad) {
    setAdForm({
      image: ad.image || "",
      title: ensureTranslationObject(ad.title),
      subtitle: ensureTranslationObject(ad.subtitle),
      link: ad.link || "",
      order: ad.order || 0,
      active: ad.active !== false
    });
    setEditingAdId(ad.id);
    setAdError("");
  }
  
  function cancelEdit() {
    setAdForm({ 
      image: "", 
      title: { en: "", ar: "", he: "" }, 
      subtitle: { en: "", ar: "", he: "" }, 
      link: "", 
      order: 0, 
      active: true 
    });
    setEditingAdId(null);
    setAdError("");
  }

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
      <div className="card top:7.5rem">
        <div className="section-title">Manage Promotional Banner Ads</div>
        <p className="text-gray-600 text-sm mb-4">
          Upload and manage sliding images for the promotional banner. These will appear as a carousel on the shop page.
        </p>

        {/* Create/Edit Form */}
        <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Image *</label>
              <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium mb-1">📐 Recommended Image Size:</p>
                <p className="text-xs text-blue-700">
                  <strong>2000 × 800 pixels</strong> (2.5:1 aspect ratio)
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  💡 <strong>Tip:</strong> Fill the background with black for best results
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Image URL"
                  value={adForm.image}
                  onChange={e => setAdForm({ ...adForm, image: e.target.value })}
                />
                <label className="flex items-center gap-2 border rounded px-3 py-2 cursor-pointer hover:bg-gray-50 transition text-sm whitespace-nowrap">
                  <span>{uploadingImage ? "Uploading..." : "Upload"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={uploadingImage} />
                </label>
              </div>
            </div>
            <div className="md:col-span-2">
              <MultiLanguageInput
                label="Title"
                value={adForm.title}
                onChange={(value) => setAdForm({ ...adForm, title: value })}
                placeholder="Enter ad title"
              />
            </div>
            <input
              className="input"
              type="number"
              placeholder="Order (0, 1, 2...)"
              value={adForm.order || ""}
              onChange={e => setAdForm({ ...adForm, order: Number(e.target.value) || 0 })}
            />
            <div className="md:col-span-2">
              <MultiLanguageInput
                label="Subtitle"
                value={adForm.subtitle}
                onChange={(value) => setAdForm({ ...adForm, subtitle: value })}
                placeholder="Enter ad subtitle"
                type="textarea"
                rows={2}
              />
            </div>
            <input
              className="input md:col-span-2"
              placeholder="Link URL (optional)"
              value={adForm.link}
              onChange={e => setAdForm({ ...adForm, link: e.target.value })}
            />
            <div className="md:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={adForm.active}
                onChange={e => setAdForm({ ...adForm, active: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="active" className="text-sm text-gray-700">Active (visible on site)</label>
            </div>
          </div>
          {adForm.image && (
            <div className="mt-2">
              <div className="text-sm text-gray-600 mb-2">Preview:</div>
              <img src={adForm.image} alt="preview" className="w-full max-w-md h-48 object-cover rounded-lg border shadow-sm" />
            </div>
          )}
          <div className="flex gap-2">
            <button
              className="btn btn-primary btn-sm"
              onClick={saveAd}
              disabled={!adForm.image}
            >
              {editingAdId ? "Update Ad" : "Create Ad"}
            </button>
            {editingAdId && (
              <button
                className="btn btn-sm"
                onClick={cancelEdit}
              >
                Cancel
              </button>
            )}
          </div>
          {adError && <p className="text-sm text-red-600">{adError}</p>}
        </div>

        {/* Ads List */}
        <div>
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
                      onClick={() => editAd(ad)}
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
    </div>
  );
}






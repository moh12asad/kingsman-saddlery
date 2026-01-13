import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { checkAdmin } from "../../utils/checkAdmin";
import MultiLanguageInput from "../../components/Admin/MultiLanguageInput";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function EditAd() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    image: "",
    title: { en: "", ar: "", he: "" },
    subtitle: { en: "", ar: "", he: "" },
    link: "",
    order: 0,
    active: true
  });

  useEffect(() => {
    loadAd();
  }, [id]);

  async function loadAd() {
    try {
      setLoading(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      const res = await fetch(`${API}/api/ads/all?all=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error("Failed to load ad");
      }
      
      const data = await res.json();
      const found = (data.ads || []).find(a => a.id === id);
      if (!found) {
        setError("Ad not found");
        return;
      }

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

      setAd(found);
      setForm({
        image: found.image || "",
        title: ensureTranslationObject(found.title),
        subtitle: ensureTranslationObject(found.subtitle),
        link: found.link || "",
        order: found.order || 0,
        active: found.active !== false
      });
    } catch (err) {
      setError(err.message || "Failed to load ad");
    } finally {
      setLoading(false);
    }
  }

  async function uploadImage(file) {
    if (!auth.currentUser) {
      throw new Error("You must be signed in to upload images");
    }

    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      throw new Error("Only administrators can upload ad images");
    }
    
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }
    
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `ads/${id}-${Date.now()}-${safeName}`;
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
      setError("Image size must be less than 5MB");
      return;
    }
    
    setUploadingImage(true);
    setError("");
    try {
      const publicUrl = await uploadImage(file);
      setForm(prev => ({ ...prev, image: publicUrl }));
    } catch (err) {
      setError(err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  }

  async function updateAd(e) {
    e?.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      if (!form.image) {
        setError("Image is required");
        return;
      }

      const payload = {
        image: form.image,
        title: form.title || "",
        subtitle: form.subtitle || "",
        link: form.link || "",
        order: Number(form.order) || 0,
        active: form.active
      };

      const res = await fetch(`${API}/api/ads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to update ad" }));
        throw new Error(data.error || "Failed to update ad");
      }

      navigate("/admin/ads");
    } catch (err) {
      setError(err.message || "Unable to update ad");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="card">
        <div className="text-red-600 text-sm">Ad not found</div>
        <button className="btn btn-secondary mt-4" onClick={() => navigate("/admin/ads")}>
          Back to Ads
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Promotional Ad</h1>
        <button
          className="btn btn-secondary"
          onClick={() => navigate("/admin/ads")}
        >
          Cancel
        </button>
      </div>

      <form className="card space-y-4" onSubmit={updateAd}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Image *</label>
            <div className="mb-2 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
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
                value={form.image}
                onChange={e => setForm({ ...form, image: e.target.value })}
              />
              <label className="btn btn-cta btn-sm inline-flex items-center gap-2 cursor-pointer whitespace-nowrap">
                <span>{uploadingImage ? "Uploading..." : "Upload"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={uploadingImage} />
              </label>
            </div>
          </div>
          <div className="md:col-span-2">
            <MultiLanguageInput
              label="Title"
              value={form.title}
              onChange={(value) => setForm({ ...form, title: value })}
              placeholder="Enter ad title"
            />
          </div>
          <input
            className="input"
            type="number"
            placeholder="Order (0, 1, 2...)"
            value={form.order || ""}
            onChange={e => setForm({ ...form, order: Number(e.target.value) || 0 })}
          />
          <div className="md:col-span-2">
            <MultiLanguageInput
              label="Subtitle"
              value={form.subtitle}
              onChange={(value) => setForm({ ...form, subtitle: value })}
              placeholder="Enter ad subtitle"
              type="textarea"
              rows={2}
            />
          </div>
          <input
            className="input md:col-span-2"
            placeholder="Link URL (optional)"
            value={form.link}
            onChange={e => setForm({ ...form, link: e.target.value })}
          />
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={form.active}
              onChange={e => setForm({ ...form, active: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="active" className="text-sm text-gray-700">Active (visible on site)</label>
          </div>
        </div>
        {form.image && (
          <div className="mt-2">
            <div className="text-sm text-gray-600 mb-2">Preview:</div>
            <img src={form.image} alt="preview" className="w-full max-w-md h-48 object-cover rounded-lg border-2 border-gray-300 shadow-sm" />
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            className="btn btn-cta"
            type="submit"
            disabled={submitting || uploadingImage || !form.image}
          >
            {submitting ? "Updating..." : "Update Ad"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/admin/ads")}
            disabled={submitting || uploadingImage}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}


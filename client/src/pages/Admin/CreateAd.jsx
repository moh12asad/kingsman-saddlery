import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { checkAdmin } from "../../utils/checkAdmin";
import MultiLanguageInput from "../../components/Admin/MultiLanguageInput";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function CreateAd() {
  const navigate = useNavigate();
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

  async function createAd(e) {
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

      const res = await fetch(`${API}/api/ads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to create ad" }));
        throw new Error(data.error || "Failed to create ad");
      }

      navigate("/admin/ads");
    } catch (err) {
      setError(err.message || "Unable to create ad");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create Promotional Ad</h1>
        <button
          className="btn btn-secondary"
          onClick={() => navigate("/admin/ads")}
        >
          Cancel
        </button>
      </div>

      <form className="card space-y-4" onSubmit={createAd}>
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
            {submitting ? "Creating..." : "Create Ad"}
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


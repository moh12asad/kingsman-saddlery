import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { auth, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { checkAdmin } from "../../utils/checkAdmin";
import MultiLanguageInput from "../../components/Admin/MultiLanguageInput";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function CreateCategory() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ 
    name: { en: "", ar: "", he: "" }, 
    description: { en: "", ar: "", he: "" }, 
    image: ""
  });

  async function uploadImage(file) {
    if (!auth.currentUser) {
      throw new Error("You must be signed in to upload images");
    }

    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      throw new Error("Only administrators can upload category images");
    }
    
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }
    
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `categories/new-${Date.now()}-${safeName}`;
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
        throw new Error("Storage permission denied. Please update Firebase Storage rules.");
      }
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  async function handleCategoryImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError(t('admin.categories.errors.imageSizeLimit'));
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

  async function createCategory(e) {
    e?.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error(t('admin.categories.errors.mustSignIn'));

      const cleanTranslation = (trans) => {
        if (typeof trans === 'string') return trans;
        if (typeof trans === 'object' && trans !== null) {
          const cleaned = {};
          if (trans.en) cleaned.en = trans.en.trim();
          if (trans.ar) cleaned.ar = trans.ar.trim();
          if (trans.he) cleaned.he = trans.he.trim();
          return Object.keys(cleaned).length > 0 ? cleaned : "";
        }
        return "";
      };

      const payload = {
        name: cleanTranslation(form.name),
        description: cleanTranslation(form.description),
        image: form.image || "",
        subCategories: []
      };

      const res = await fetch(`${API}/api/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create category");
      }

      navigate("/admin/categories");
    } catch (err) {
      setError(err.message || "Unable to create category");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('admin.categories.createCategory')}</h1>
        <button
          className="btn btn-secondary"
          onClick={() => navigate("/admin/categories")}
        >
{t('admin.categories.cancel')}
        </button>
      </div>

      <form className="card space-y-4" onSubmit={createCategory}>
        <div className="space-y-4">
          <MultiLanguageInput
            label={t('admin.categories.name')}
            value={form.name}
            onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
            placeholder="Category name"
            required={true}
          />
          <MultiLanguageInput
            label={t('admin.categories.description')}
            value={form.description}
            onChange={(value) => setForm((prev) => ({ ...prev, description: value }))}
            placeholder="Category description"
            type="textarea"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label className="form-label">Category Image</label>
          <div className="flex gap-2 items-center">
            <input
              className="input"
              placeholder="Image URL (optional)"
              value={form.image}
              onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
            />
            <label className="btn btn-cta btn-sm inline-flex items-center gap-2 cursor-pointer">
              <span>Upload</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleCategoryImageChange} />
            </label>
          </div>
          {uploadingImage && <span className="text-sm text-gray-500">Uploading...</span>}
          {form.image && (
            <img src={form.image} alt="Category preview" className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300 shadow-sm mt-2" />
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button className="btn btn-cta" type="submit" disabled={submitting || uploadingImage}>
            {submitting ? t('admin.categories.creating') : t('admin.categories.create')}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/admin/categories")}
            disabled={submitting || uploadingImage}
          >
  {t('admin.categories.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}


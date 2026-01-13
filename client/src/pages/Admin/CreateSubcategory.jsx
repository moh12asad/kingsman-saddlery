import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { auth, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { checkAdmin } from "../../utils/checkAdmin";
import MultiLanguageInput from "../../components/Admin/MultiLanguageInput";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function CreateSubcategory() {
  const { categoryId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ 
    name: { en: "", ar: "", he: "" }, 
    image: ""
  });

  useEffect(() => {
    loadCategory();
  }, [categoryId]);

  async function loadCategory() {
    try {
      setLoading(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      const response = await fetch(`${API}/api/categories?all=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      const found = (data.categories || []).find(c => c.id === categoryId);
      if (!found) {
        setError("Category not found");
        return;
      }
      setCategory(found);
    } catch (err) {
      setError(err.message || "Unable to load category");
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
      throw new Error("Only administrators can upload images");
    }
    
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }
    
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `categories/sub-${categoryId}-${Date.now()}-${safeName}`;
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

  async function handleSubCategoryImageChange(event) {
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

  async function createSubcategory(e) {
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

      // Add the new subcategory to the existing subcategories
      const existingSubCategories = category.subCategories || [];
      const newSubCategory = {
        name: cleanTranslation(form.name),
        image: form.image || ""
      };

      const updatedSubCategories = [...existingSubCategories, newSubCategory];

      const payload = {
        subCategories: updatedSubCategories
      };

      const res = await fetch(`${API}/api/categories/${categoryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create subcategory");
      }

      navigate("/admin/categories");
    } catch (err) {
      setError(err.message || "Unable to create subcategory");
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

  if (!category) {
    return (
      <div className="card">
        <div className="text-red-600 text-sm">Category not found</div>
        <button className="btn btn-secondary mt-4" onClick={() => navigate("/admin/categories")}>
          Back to Categories
        </button>
      </div>
    );
  }

  const categoryName = typeof category.name === 'string' 
    ? category.name 
    : (category.name?.en || category.name?.ar || category.name?.he || 'Category');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('admin.categories.createSubCategory')}</h1>
          <p className="text-gray-600 mt-1">For category: <span className="font-semibold">{categoryName}</span></p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => navigate("/admin/categories")}
        >
{t('admin.categories.cancel')}
        </button>
      </div>

      <form className="card space-y-4" onSubmit={createSubcategory}>
        <div className="space-y-4">
          <MultiLanguageInput
            label={t('admin.categories.name') || 'Subcategory Name'}
            value={form.name}
            onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
            placeholder="Subcategory name"
            required={true}
          />
        </div>

        <div className="space-y-2">
          <label className="form-label">Subcategory Image</label>
          <div className="flex gap-2 items-center">
            <input
              className="input"
              placeholder="Image URL (optional)"
              value={form.image}
              onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
            />
            <label className="btn btn-cta btn-sm inline-flex items-center gap-2 cursor-pointer">
              <span>Upload</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleSubCategoryImageChange} />
            </label>
          </div>
          {uploadingImage && <span className="text-sm text-gray-500">Uploading...</span>}
          {form.image && (
            <img src={form.image} alt="Subcategory preview" className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300 shadow-sm mt-2" />
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button className="btn btn-cta" type="submit" disabled={submitting || uploadingImage}>
            {submitting ? t('admin.categories.creating') : t('admin.categories.createSubCategory')}
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


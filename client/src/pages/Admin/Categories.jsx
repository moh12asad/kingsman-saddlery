import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { auth, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { checkAdmin } from "../../utils/checkAdmin";
import MultiLanguageInput from "../../components/Admin/MultiLanguageInput";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function AdminCategories() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ 
    name: { en: "", ar: "", he: "" }, 
    description: { en: "", ar: "", he: "" }, 
    image: "", 
    subCategories: [] 
  });

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error(t('admin.categories.errors.mustSignIn'));

      // Fetch with all=true to get full translation objects for admin display
      const res = await fetch(`${API}/api/categories?all=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load categories");
      }

      const body = await res.json();
      setCategories(body.categories || []);
    } catch (err) {
      setError(err.message || "Unable to load categories");
    } finally {
      setLoading(false);
    }
  }

  async function uploadImage(file, categoryId = null) {
    if (!auth.currentUser) {
      throw new Error("You must be signed in to upload images");
    }

    // Check if user is admin
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      throw new Error("Only administrators can upload category images");
    }
    
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }
    
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = categoryId 
      ? `categories/${categoryId}-${Date.now()}-${safeName}`
      : `categories/new-${Date.now()}-${safeName}`;
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
        throw new Error("Storage permission denied. Please update Firebase Storage rules in Firebase Console (Storage → Rules) to include: match /categories/{allPaths=**} { allow read: if true; allow write: if request.auth != null; }");
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

  function addSubCategory() {
    setForm(prev => ({
      ...prev,
      subCategories: [...(prev.subCategories || []), { name: { en: "", ar: "", he: "" }, image: "" }]
    }));
  }

  function removeSubCategory(index) {
    setForm(prev => ({
      ...prev,
      subCategories: prev.subCategories.filter((_, i) => i !== index)
    }));
  }

  function updateSubCategory(index, field, value) {
    setForm(prev => ({
      ...prev,
      subCategories: prev.subCategories.map((sub, i) => 
        i === index ? { ...sub, [field]: value } : sub
      )
    }));
  }

  async function handleSubCategoryImageChange(index, event) {
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
      const publicUrl = await uploadImage(file, `sub-${index}`);
      updateSubCategory(index, "image", publicUrl);
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

      // Helper to clean translation objects (remove empty strings)
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
        subCategories: (form.subCategories || []).map(sub => ({
          name: cleanTranslation(sub.name),
          image: sub.image || ""
        }))
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

      setForm({ name: { en: "", ar: "", he: "" }, description: { en: "", ar: "", he: "" }, image: "", subCategories: [] });
      await loadCategories();
    } catch (err) {
      setError(err.message || "Unable to create category");
    } finally {
      setSubmitting(false);
    }
  }


  async function deleteCategory(id) {
    if (!confirm(t('admin.categories.confirmDelete'))) return;

    try {
      setSubmitting(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error(t('admin.categories.errors.mustSignIn'));

      const res = await fetch(`${API}/api/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete category");
      }

      await loadCategories();
    } catch (err) {
      setError(err.message || "Unable to delete category");
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <div className="space-y-6">
      <form className="card space-y-4" onSubmit={createCategory}>
        <div className="section-title">{t('admin.categories.createCategory')}</div>
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
            <label className="flex items-center gap-2 border rounded px-3 py-2 cursor-pointer hover:bg-gray-50 transition text-sm">
              <span>Upload</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleCategoryImageChange} />
            </label>
          </div>
          {uploadingImage && <span className="text-sm text-gray-500">Uploading...</span>}
          {form.image && (
            <img src={form.image} alt="Category preview" className="w-32 h-32 object-cover rounded-lg border shadow-sm mt-2" />
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="form-label">Sub-Categories</label>
            <button
              type="button"
              className="btn btn-sm"
              onClick={addSubCategory}
            >
              + {t('admin.categories.addSubCategory')}
            </button>
          </div>
          {form.subCategories && form.subCategories.length > 0 && (
            <div className="space-y-3 border rounded p-3">
              {form.subCategories.map((sub, index) => (
                <div key={index} className="space-y-3 p-3 bg-gray-50 rounded">
                  <MultiLanguageInput
                    label="Sub-category name"
                    value={sub.name}
                    onChange={(value) => updateSubCategory(index, "name", value)}
                    placeholder="Sub-category name"
                    required={true}
                  />
                  <div className="flex gap-2 items-center">
                    <input
                      className="input"
                      placeholder="Image URL (optional)"
                      value={sub.image}
                      onChange={(e) => updateSubCategory(index, "image", e.target.value)}
                    />
                    <label className="flex items-center gap-2 border rounded px-2 py-1.5 cursor-pointer hover:bg-gray-100 transition text-sm">
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleSubCategoryImageChange(index, e)}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => removeSubCategory(index)}
                    >
                      {t('admin.categories.removeSubCategory')}
                    </button>
                  </div>
                  {sub.image && (
                    <div className="md:col-span-2">
                      <img src={sub.image} alt="Sub-category preview" className="w-24 h-24 object-cover rounded-lg border shadow-sm" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button className="btn btn-primary" type="submit" disabled={submitting || uploadingImage}>
            {submitting ? t('admin.categories.creating') : t('admin.categories.create')}
          </button>
        </div>
      </form>

      <div className="card">
        <div className="section-title">{t('admin.categories.title')}</div>
        {loading ? (
          <div className="text-gray-500 text-sm">{t('admin.categories.loading')}</div>
        ) : categories.length === 0 ? (
          <div className="text-gray-500 text-sm">{t('admin.categories.noCategories')}</div>
        ) : (
          <table className="table text-sm">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>{t('admin.categories.image')}</th>
                <th style={{ textAlign: 'left' }}>{t('admin.categories.name')}</th>
                <th style={{ textAlign: 'left' }}>{t('admin.categories.description')}</th>
                <th style={{ textAlign: 'left' }}>{t('admin.categories.subCategories')}</th>
                <th style={{ textAlign: 'right' }}>{t('admin.categories.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td style={{ textAlign: 'left' }}>
                    {category.image ? (
                      <img src={category.image} alt={typeof category.name === 'string' ? category.name : (category.name?.en || category.name?.ar || category.name?.he || '')} className="w-16 h-16 object-cover rounded-lg border shadow-sm" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400 text-xs">No image</div>
                    )}
                  </td>
                  <td className="font-semibold" style={{ textAlign: 'left' }}>{typeof category.name === 'string' ? category.name : (category.name?.en || category.name?.ar || category.name?.he || "-")}</td>
                  <td className="text-gray-600" style={{ textAlign: 'left' }}>{typeof category.description === 'string' ? category.description : (category.description?.en || category.description?.ar || category.description?.he || "-")}</td>
                  <td style={{ textAlign: 'left' }}>
                    {category.subCategories && category.subCategories.length > 0 ? (
                      <div className="text-sm space-y-1">
                        <div className="font-medium text-gray-700 mb-2">
                          {category.subCategories.length} sub-categor{category.subCategories.length === 1 ? 'y' : 'ies'}
                        </div>
                        {category.subCategories.map((sub, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-1.5 bg-gray-50 rounded border border-gray-200">
                            {sub.image ? (
                              <img src={sub.image} alt={typeof sub.name === 'string' ? sub.name : (sub.name?.en || sub.name?.ar || sub.name?.he || '')} className="w-8 h-8 object-cover rounded border" />
                            ) : (
                              <div className="w-8 h-8 bg-gray-200 rounded border flex items-center justify-center text-gray-400 text-xs">
                                No img
                              </div>
                            )}
                            <span className="font-medium">{typeof sub.name === 'string' ? sub.name : (sub.name?.en || sub.name?.ar || sub.name?.he || "-")}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">No sub-categories</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex-row flex-gap-sm" style={{ justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/admin/categories/edit/${category.id}`)}
                        disabled={submitting}
                      >
                        {t('admin.categories.edit')}
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteCategory(category.id)}
                        disabled={submitting}
                      >
                        {t('admin.categories.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { checkAdmin } from "../../utils/checkAdmin";
import { useLanguage } from "../../context/LanguageContext";
import { useTranslatedContent } from "../../hooks/useTranslatedContent";
import { getTranslatedContent } from "../../utils/getTranslatedContent";
import MultilingualInput from "../../components/MultilingualInput";

const API = import.meta.env.VITE_API_BASE_URL || "";

// Helper components for displaying translated category names
function CategoryNameCell({ name }) {
  const translatedName = useTranslatedContent(name);
  return <span>{translatedName || "-"}</span>;
}

function CategoryDescriptionCell({ description }) {
  const translatedDesc = useTranslatedContent(description);
  return <span>{translatedDesc || "-"}</span>;
}

function SubCategoryNameCell({ name }) {
  const translatedName = useTranslatedContent(name);
  return <span>{translatedName || "-"}</span>;
}

function CategoryImageCell({ image, name }) {
  const altText = useTranslatedContent(name);
  return <img src={image} alt={altText} className="w-16 h-16 object-cover rounded-lg border shadow-sm" />;
}

export default function AdminCategories() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
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
      if (!token) throw new Error("You must be signed in");

      const res = await fetch(`${API}/api/categories`, {
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
      setError("Image size must be less than 5MB");
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
      if (!token) throw new Error("You must be signed in");

      // Helper to clean multilingual object
      const cleanMultilingual = (obj) => {
        if (!obj || typeof obj !== 'object') return { en: "", ar: "", he: "" };
        return {
          en: (obj.en || "").trim(),
          ar: (obj.ar || "").trim(),
          he: (obj.he || "").trim()
        };
      };

      const payload = {
        name: cleanMultilingual(form.name),
        description: cleanMultilingual(form.description),
        image: form.image || "",
        subCategories: (form.subCategories || []).map(sub => ({
          name: cleanMultilingual(sub.name),
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
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      setSubmitting(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

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
        <div className="section-title">{t("admin.categories")}</div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <MultilingualInput
              label={t("admin.name")}
              value={form.name}
              onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
              placeholder="Category name"
              required
            />
          </div>
          <div className="md:col-span-2">
            <MultilingualInput
              label={t("admin.description")}
              value={form.description}
              onChange={(value) => setForm((prev) => ({ ...prev, description: value }))}
              placeholder="Description (optional)"
              rows={2}
            />
          </div>
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
              + Add Sub-Category
            </button>
          </div>
          {form.subCategories && form.subCategories.length > 0 && (
            <div className="space-y-3 border rounded p-3">
              {form.subCategories.map((sub, index) => (
                <div key={index} className="space-y-3 p-3 bg-gray-50 rounded">
                  <MultilingualInput
                    label={t("admin.subCategory")}
                    value={sub.name}
                    onChange={(value) => updateSubCategory(index, "name", value)}
                    placeholder="Sub-category name"
                    required
                  />
                  <div className="grid md:grid-cols-2 gap-3">
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
                        {t("common.remove")}
                      </button>
                    </div>
                    {sub.image && (
                      <div className="md:col-span-2">
                        <img src={sub.image} alt="Sub-category preview" className="w-24 h-24 object-cover rounded-lg border shadow-sm" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button className="btn btn-primary" type="submit" disabled={submitting || uploadingImage}>
            {submitting ? "Saving..." : "Create Category"}
          </button>
        </div>
      </form>

      <div className="card">
        <div className="section-title">Categories</div>
        {loading ? (
          <div className="text-gray-500 text-sm">Loading categories…</div>
        ) : categories.length === 0 ? (
          <div className="text-gray-500 text-sm">No categories yet. Create one above.</div>
        ) : (
          <table className="table text-sm">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Image</th>
                <th style={{ textAlign: 'left' }}>Name</th>
                <th style={{ textAlign: 'left' }}>Description</th>
                <th style={{ textAlign: 'left' }}>Sub-Categories</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td style={{ textAlign: 'left' }}>
                    {category.image ? (
                      <CategoryImageCell image={category.image} name={category.name} />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400 text-xs">No image</div>
                    )}
                  </td>
                  <td className="font-semibold" style={{ textAlign: 'left' }}>
                    <CategoryNameCell name={category.name} />
                  </td>
                  <td className="text-gray-600" style={{ textAlign: 'left' }}>
                    <CategoryDescriptionCell description={category.description} />
                  </td>
                  <td style={{ textAlign: 'left' }}>
                    {category.subCategories && category.subCategories.length > 0 ? (
                      <div className="text-sm space-y-1">
                        <div className="font-medium text-gray-700 mb-2">
                          {category.subCategories.length} sub-categor{category.subCategories.length === 1 ? 'y' : 'ies'}
                        </div>
                        {category.subCategories.map((sub, idx) => {
                          const subNameForAlt = getTranslatedContent(sub.name, language);
                          return (
                            <div key={idx} className="flex items-center gap-2 p-1.5 bg-gray-50 rounded border border-gray-200">
                              {sub.image ? (
                                <img src={sub.image} alt={subNameForAlt} className="w-8 h-8 object-cover rounded border" />
                              ) : (
                                <div className="w-8 h-8 bg-gray-200 rounded border flex items-center justify-center text-gray-400 text-xs">
                                  No img
                                </div>
                              )}
                              <span className="font-medium">
                                <SubCategoryNameCell name={sub.name} />
                              </span>
                            </div>
                          );
                        })}
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
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteCategory(category.id)}
                        disabled={submitting}
                      >
                        Delete
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


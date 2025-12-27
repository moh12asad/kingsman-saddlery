import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { checkAdmin } from "../../utils/checkAdmin";
import MultiLanguageInput from "../../components/Admin/MultiLanguageInput";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function EditCategory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCategory();
  }, [id]);

  async function loadCategory() {
    try {
      setLoading(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      // Fetch with all=true to get full translation objects for admin editing
      const response = await fetch(`${API}/api/categories?all=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      const found = (data.categories || []).find(c => c.id === id);
      if (!found) {
        setError("Category not found");
        return;
      }
      // Helper to ensure translation objects are properly formatted
      const ensureTranslationObject = (field) => {
        if (typeof field === 'string') {
          return { en: field, ar: "", he: "" };
        }
        if (typeof field === 'object' && field !== null) {
          return {
            en: field.en || "",
            ar: field.ar || "",
            he: field.he || ""
          };
        }
        return { en: "", ar: "", he: "" };
      };
      
      // Ensure subCategories is an array and format translation objects
      const formattedCategory = {
        ...found,
        name: ensureTranslationObject(found.name),
        description: ensureTranslationObject(found.description),
        subCategories: (found.subCategories || []).map(sub => ({
          ...sub,
          name: ensureTranslationObject(sub.name)
        }))
      };
      setCategory(formattedCategory);
    } catch (err) {
      setError(err.message || "Failed to load category");
    } finally {
      setLoading(false);
    }
  }

  async function uploadImage(file, subCategoryIndex = null) {
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
    const path = subCategoryIndex !== null
      ? `categories/${id}/sub-${subCategoryIndex}-${Date.now()}-${safeName}`
      : `categories/${id}-${Date.now()}-${safeName}`;
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
      setCategory(prev => ({ ...prev, image: publicUrl }));
    } catch (err) {
      setError(err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
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
      const publicUrl = await uploadImage(file, index);
      setCategory(prev => ({
        ...prev,
        subCategories: prev.subCategories.map((sub, i) => 
          i === index ? { ...sub, image: publicUrl } : sub
        )
      }));
    } catch (err) {
      setError(err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  }

  function addSubCategory() {
    setCategory(prev => ({
      ...prev,
      subCategories: [...(prev.subCategories || []), { name: { en: "", ar: "", he: "" }, image: "" }]
    }));
  }

  function removeSubCategory(index) {
    setCategory(prev => ({
      ...prev,
      subCategories: prev.subCategories.filter((_, i) => i !== index)
    }));
  }

  function updateSubCategory(index, field, value) {
    setCategory(prev => ({
      ...prev,
      subCategories: prev.subCategories.map((sub, i) => 
        i === index ? { ...sub, [field]: value } : sub
      )
    }));
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

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

      const nameObj = typeof category.name === 'string' ? { en: category.name } : category.name;
      if (!nameObj || !nameObj.en || nameObj.en.trim() === "") {
        throw new Error("Category name (English) is required");
      }

      const payload = {
        name: cleanTranslation(category.name),
        description: cleanTranslation(category.description),
        image: category.image || "",
        subCategories: (category.subCategories || []).map(sub => ({
          name: cleanTranslation(sub.name),
          image: sub.image || ""
        })).filter(sub => {
          const subName = typeof sub.name === 'string' ? sub.name : (sub.name?.en || "");
          return subName.trim() !== "";
        }),
      };

      const res = await fetch(`${API}/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to update category" }));
        throw new Error(data.error || "Failed to update category");
      }

      navigate("/admin/categories");
    } catch (err) {
      setError(err.message || "Unable to update category");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="text-center padding-y-lg">
          <div className="text-muted">Loading category...</div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="card">
        <div className="text-center padding-y-lg">
          <p className="text-error">{error || "Category not found"}</p>
          <button onClick={() => navigate("/admin/categories")} className="btn btn-primary margin-top-md">
            Back to Categories
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="spacing-y-lg">
      <div className="flex-row-between">
        <h2 className="section-title">Edit Category</h2>
        <button onClick={() => navigate("/admin/categories")} className="btn btn-sm">
          ← Back to Categories
        </button>
      </div>

      <div className="card">
        <div className="grid-form">
          <div className="grid-col-span-full">
            <MultiLanguageInput
              label="Category Name"
              value={category.name}
              onChange={(value) => setCategory({ ...category, name: value })}
              placeholder="Category name"
              required={true}
            />
          </div>

          <div className="grid-col-span-full">
            <MultiLanguageInput
              label="Description"
              value={category.description}
              onChange={(value) => setCategory({ ...category, description: value })}
              placeholder="Category description"
              type="textarea"
              rows={3}
            />
          </div>

          <div className="grid-col-span-full">
            <div className="form-group">
              <label className="form-label">Category Image</label>
              <div className="flex gap-2 items-center">
                <input
                  className="input"
                  placeholder="Image URL (optional)"
                  value={category.image || ""}
                  onChange={e => setCategory({ ...category, image: e.target.value })}
                />
                <label className="flex-row flex-gap-sm border rounded padding-x-md padding-y-sm cursor-pointer transition">
                  <span>Upload</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleCategoryImageChange} />
                </label>
              </div>
              {uploadingImage && <span className="text-small text-muted margin-top-sm">Uploading...</span>}
              {category.image && (
                <div className="margin-top-sm">
                  <img src={category.image} alt={category.name} className="w-32 h-32 object-cover rounded-lg border shadow-sm" />
                </div>
              )}
            </div>
          </div>

          <div className="grid-col-span-full">
            <div className="form-group">
              <div className="flex-row-between margin-bottom-md">
                <label className="form-label">Sub-Categories</label>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={addSubCategory}
                >
                  + Add Sub-Category
                </button>
              </div>
              {category.subCategories && category.subCategories.length > 0 && (
                <div className="space-y-3 border rounded padding-md">
                  {category.subCategories.map((sub, index) => (
                    <div key={index} className="space-y-3 padding-md bg-gray-50 rounded">
                      <div>
                        <MultiLanguageInput
                          label="Sub-Category Name"
                          value={sub.name}
                          onChange={(value) => updateSubCategory(index, "name", value)}
                          placeholder="Sub-category name"
                          required={true}
                        />
                      </div>
                      <div>
                        <label className="form-label">Sub-Category Image</label>
                        <div className="flex gap-2 items-center">
                          <input
                            className="input"
                            placeholder="Image URL (optional)"
                            value={sub.image || ""}
                            onChange={e => updateSubCategory(index, "image", e.target.value)}
                          />
                          <label className="flex-row flex-gap-sm border rounded padding-x-sm padding-y-xs cursor-pointer transition text-sm">
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
                            Remove
                          </button>
                        </div>
                        {sub.image && (
                          <div className="margin-top-sm">
                            <img src={sub.image} alt={typeof sub.name === 'string' ? sub.name : (sub.name?.en || sub.name?.ar || sub.name?.he || "")} className="w-24 h-24 object-cover rounded-lg border shadow-sm" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="flex-row flex-gap-md margin-top-lg">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || uploadingImage || !(typeof category.name === 'string' ? category.name : (category.name?.en || ""))}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            className="btn"
            onClick={() => navigate("/admin/categories")}
            disabled={saving || uploadingImage}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}


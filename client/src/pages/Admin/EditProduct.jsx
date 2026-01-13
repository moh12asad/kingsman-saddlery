import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { auth, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { checkAdmin } from "../../utils/checkAdmin";
import MultiLanguageInput from "../../components/Admin/MultiLanguageInput";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingImages, setUploadingImages] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProduct();
    loadCategories();
  }, [id]);

  async function loadProduct() {
    try {
      setLoading(true);
      // Fetch with all=true to get full translation objects for admin editing
      const response = await fetch(`${API}/api/products?all=true`);
      const data = await response.json();
      const found = (data.products || []).find(p => p.id === id);
        if (!found) {
          setError(t('admin.editProduct.notFound'));
          return;
        }
        // Ensure translation objects are properly formatted (fill missing languages with empty strings)
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
        
        const formattedProduct = {
          ...found,
          name: ensureTranslationObject(found.name),
          description: ensureTranslationObject(found.description),
          technicalDetails: ensureTranslationObject(found.technicalDetails),
          additionalDetails: ensureTranslationObject(found.additionalDetails),
          warranty: ensureTranslationObject(found.warranty),
          shippingInfo: ensureTranslationObject(found.shippingInfo),
          weight: found.weight || 0,
        };
        setProduct(formattedProduct);
    } catch (err) {
      setError(err.message || t('admin.editProduct.errors.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      // Fetch with all=true to get full translation objects for admin display
      const r = await fetch(`${API}/api/categories?all=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const b = await r.json();
      setCategories(b.categories || []);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  }

  async function uploadImage(file, customKey = "") {
    // Ensure user is authenticated
    if (!auth.currentUser) {
      throw new Error(t('admin.createProduct.errors.mustSignInUpload'));
    }

    // Check if user is admin
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      throw new Error(t('admin.createProduct.errors.onlyAdminUpload'));
    }
    
    // Verify file type
    if (!file.type.startsWith("image/")) {
      throw new Error(t('admin.createProduct.errors.fileMustBeImage'));
    }
    
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `products/${customKey || id}-${Date.now()}-${safeName}`;
    const storageRef = ref(storage, path);
    
    try {
      // Upload with metadata
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
      } else if (error.code === 'storage/canceled') {
        throw new Error("Upload was canceled");
      } else if (error.code) {
        throw new Error(`Upload failed: ${error.message}`);
      }
      throw error;
    }
  }

  async function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check file size (e.g., max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError(t('admin.categories.errors.imageSizeLimit'));
      return;
    }
    
    setUploadingImage(true);
    setError("");
    try {
      const publicUrl = await uploadImage(file);
      setProduct(prev => ({ ...prev, image: publicUrl }));
    } catch (err) {
      setError(err.message || t('admin.createProduct.errors.uploadFailed'));
      console.error("Image upload error:", err);
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleMultipleImagesChange(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    
    // Check file sizes
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter(f => f.size > maxSize);
    if (oversizedFiles.length > 0) {
      setError(`Some images exceed 5MB limit: ${oversizedFiles.map(f => f.name).join(", ")}`);
      return;
    }
    
    setUploadingImages(files.map((_, i) => i));
    setError("");
    
    try {
      const uploadedUrls = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const publicUrl = await uploadImage(file, `${id}-${Date.now()}-${i}`);
        uploadedUrls.push(publicUrl);
        setUploadingImages(prev => prev.filter(idx => idx !== i));
      }
      
      // First image becomes main if no main exists, rest go to additional
      if (!product.image && uploadedUrls.length > 0) {
        setProduct(prev => ({ 
          ...prev, 
          image: uploadedUrls[0],
          additionalImages: [...(prev.additionalImages || []), ...uploadedUrls.slice(1)]
        }));
      } else {
        setProduct(prev => ({ 
          ...prev, 
          additionalImages: [...(prev.additionalImages || []), ...uploadedUrls]
        }));
      }
    } catch (err) {
      setError(err.message || "Failed to upload images");
      console.error("Image upload error:", err);
    } finally {
      setUploadingImages([]);
    }
  }

  function removeImage(index, isMain = false) {
    if (isMain) {
      // If removing main image, make first additional image the new main
      const newMain = product.additionalImages?.[0] || "";
      const newAdditional = product.additionalImages?.slice(1) || [];
      setProduct(prev => ({ 
        ...prev, 
        image: newMain,
        additionalImages: newAdditional
      }));
    } else {
      // Remove from additional images
      setProduct(prev => ({
        ...prev,
        additionalImages: prev.additionalImages?.filter((_, i) => i !== index) || []
      }));
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error(t('admin.editProduct.errors.mustSignIn'));

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
        name: cleanTranslation(product.name),
        price: Number(product.price) || 0,
        category: product.category || "",
        subCategory: product.subCategory || "",
        image: product.image || "",
        description: cleanTranslation(product.description),
        available: product.available,
        sale: product.sale,
        sale_proce: Number(product.sale_proce) || 0,
        featured: product.featured || false,
        sku: product.sku || "",
        brand: product.brand || "",
        technicalDetails: cleanTranslation(product.technicalDetails),
        additionalDetails: cleanTranslation(product.additionalDetails),
        warranty: cleanTranslation(product.warranty),
        shippingInfo: cleanTranslation(product.shippingInfo),
        videoUrl: product.videoUrl || "",
        additionalImages: product.additionalImages || [],
        weight: Number(product.weight) || 0,
      };

      const res = await fetch(`${API}/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to update product" }));
        throw new Error(data.error || "Failed to update product");
      }

      navigate("/admin/products");
    } catch (err) {
      setError(err.message || "Unable to update product");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="text-center padding-y-lg">
          <div className="text-muted">Loading product...</div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="card">
        <div className="text-center padding-y-lg">
          <p className="text-error">{error || t('admin.editProduct.notFound')}</p>
          <button onClick={() => navigate("/admin/products")} className="btn btn-primary margin-top-md">
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="spacing-y-lg">
      <div className="flex-row-between">
        <h2 className="section-title">{t('admin.editProduct.title')}</h2>
        <button onClick={() => navigate("/admin/products")} className="btn btn-sm">
          ← {t('common.back')}
        </button>
      </div>

      <div className="card">
        <div className="grid-form grid-form-3">
          <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
            <MultiLanguageInput
              label="Product Name"
              value={product.name}
              onChange={(value) => setProduct({ ...product, name: value })}
              placeholder="Product name"
              required={true}
            />
          </div>

          <div>
            <div className="form-group">
              <label className="form-label form-label-required">Price (₪ ILS)</label>
              <div className="input-group">
                <span className="input-group-text">₪</span>
                <input
                  className="input"
                  type="number"
                  placeholder="Price"
                  value={product.price || ""}
                  onChange={e => setProduct({ ...product, price: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="form-group">
              <label className="form-label">Weight (kg)</label>
              <div className="input-group">
                <span className="input-group-text">kg</span>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Weight"
                  value={product.weight || ""}
                  onChange={e => {
                    const value = Number(e.target.value);
                    setProduct({ ...product, weight: value >= 0 ? value : 0 });
                  }}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="select"
                value={typeof product.category === 'string' ? product.category : (product.category?.en || product.category?.ar || product.category?.he || "")}
                onChange={e => setProduct({ ...product, category: e.target.value, subCategory: "" })}
              >
                <option value="">Select category...</option>
                {categories.map(cat => {
                  const catName = typeof cat.name === 'string' ? cat.name : (cat.name?.en || cat.name?.ar || cat.name?.he || "");
                  return (
                    <option key={cat.id} value={catName}>{catName}</option>
                  );
                })}
              </select>
            </div>
          </div>

          {(() => {
            const productCategory = typeof product.category === 'string' ? product.category : (product.category?.en || product.category?.ar || product.category?.he || "");
            const selectedCategoryObj = categories.find(cat => {
              const catName = typeof cat.name === 'string' ? cat.name : (cat.name?.en || cat.name?.ar || cat.name?.he || "");
              return catName === productCategory;
            });
            const availableSubCategories = selectedCategoryObj?.subCategories || [];
            
            if (availableSubCategories.length > 0) {
              return (
                <div>
                  <div className="form-group">
                    <label className="form-label">Sub-Category</label>
                    <select
                      className="select"
                      value={typeof product.subCategory === 'string' ? product.subCategory : (product.subCategory?.en || product.subCategory?.ar || product.subCategory?.he || "")}
                      onChange={e => setProduct({ ...product, subCategory: e.target.value })}
                    >
                      <option value="">Select sub-category (optional)...</option>
                      {availableSubCategories.map((sub, idx) => {
                        const subName = typeof sub.name === 'string' ? sub.name : (sub.name?.en || sub.name?.ar || sub.name?.he || "");
                        return (
                          <option key={idx} value={subName}>{subName}</option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
            <MultiLanguageInput
              label="Description"
              value={product.description}
              onChange={(value) => setProduct({ ...product, description: value })}
              placeholder="Product description"
              type="textarea"
              rows={4}
            />
          </div>

          <div>
            <div className="form-group">
              <label className="form-label">SKU</label>
              <input
                className="input"
                placeholder="Product SKU (optional)"
                value={product.sku || ""}
                onChange={e => setProduct({ ...product, sku: e.target.value })}
              />
            </div>
          </div>

          <div>
            <div className="form-group">
              <label className="form-label">Brand</label>
              <input
                className="input"
                placeholder="Brand name (optional)"
                value={product.brand || ""}
                onChange={e => setProduct({ ...product, brand: e.target.value })}
              />
            </div>
          </div>

          <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
            <MultiLanguageInput
              label="Technical Details"
              value={product.technicalDetails}
              onChange={(value) => setProduct({ ...product, technicalDetails: value })}
              placeholder="Technical details"
              type="textarea"
              rows={4}
            />
          </div>

          <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
            <MultiLanguageInput
              label="Additional Details"
              value={product.additionalDetails}
              onChange={(value) => setProduct({ ...product, additionalDetails: value })}
              placeholder="Additional information"
              type="textarea"
              rows={4}
            />
          </div>

          <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
            <MultiLanguageInput
              label="Warranty"
              value={product.warranty}
              onChange={(value) => setProduct({ ...product, warranty: value })}
              placeholder="Warranty information"
            />
          </div>

          <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
            <MultiLanguageInput
              label="Shipping Info"
              value={product.shippingInfo}
              onChange={(value) => setProduct({ ...product, shippingInfo: value })}
              placeholder="Shipping information"
            />
          </div>

          <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
            <div className="form-group">
              <label className="form-label">Video URL</label>
              <input
                className="input"
                placeholder="Product video URL (optional)"
                value={product.videoUrl || ""}
                onChange={e => setProduct({ ...product, videoUrl: e.target.value })}
              />
            </div>
          </div>

          <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
            <div className="form-group">
              <label className="form-label">Image URL (optional - or use upload below)</label>
              <input
                className="input"
                placeholder="Image URL (optional)"
                value={product.image || ""}
                onChange={e => setProduct({ ...product, image: e.target.value })}
              />
            </div>
          </div>

          <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
            <div className="form-group">
              <label className="form-label">Upload Main Image</label>
              <label className="flex-row flex-gap-sm border rounded padding-x-md padding-y-sm cursor-pointer transition">
                <span>Choose file</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
              {uploadingImage && <span className="text-small text-muted margin-top-sm">Uploading...</span>}
            </div>
          </div>

          <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
            <div className="form-group">
              <label className="form-label">Upload Multiple Images</label>
              <label className="flex-row flex-gap-sm border rounded padding-x-md padding-y-sm cursor-pointer transition">
                <span>Choose files</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleMultipleImagesChange} />
              </label>
              {uploadingImages.length > 0 && (
                <span className="text-small text-muted margin-top-sm">
                  Uploading {uploadingImages.length} image(s)...
                </span>
              )}
            </div>
          </div>

          <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
            <div className="form-group">
              <label className="form-label">Product Images</label>
              {product.image && (
                <div className="mb-2">
                  <div className="text-sm font-medium mb-1">Main Image:</div>
                  <div className="relative inline-block">
                    <img src={product.image} alt="Main" className="w-24 h-24 object-cover rounded-lg border shadow-sm" />
                    <button
                      type="button"
                      onClick={() => removeImage(0, true)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
              {product.additionalImages && product.additionalImages.length > 0 && (
                <div className="mb-2">
                  <div className="text-sm font-medium mb-1">Additional Images:</div>
                  <div className="flex flex-wrap gap-2">
                    {product.additionalImages.map((url, index) => (
                      <div key={index} className="relative inline-block">
                        <img src={url} alt={`Additional ${index + 1}`} className="w-24 h-24 object-cover rounded-lg border shadow-sm" />
                        <button
                          type="button"
                          onClick={() => removeImage(index, false)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <small className="text-muted">
                First uploaded image becomes the main image. Additional images will be shown in the product gallery.
              </small>
            </div>
          </div>

          <div className="grid-col-span-full md:col-span-2 lg:col-span-3 flex-row flex-gap-xl">
            <label className="flex-row flex-gap-sm cursor-pointer">
              <input
                type="checkbox"
                checked={product.available}
                onChange={e => setProduct({ ...product, available: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-small">Available</span>
            </label>

            <label className="flex-row flex-gap-sm cursor-pointer">
              <input
                type="checkbox"
                checked={product.sale}
                onChange={e => setProduct({ ...product, sale: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-small">{t("products.onSale")}</span>
            </label>

            <label className="flex-row flex-gap-sm cursor-pointer">
              <input
                type="checkbox"
                checked={product.featured || false}
                onChange={e => setProduct({ ...product, featured: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-small">Featured (for Suggested tab)</span>
            </label>
          </div>

          {product.sale && (
            <div>
              <div className="form-group">
                <label className="form-label">Sale Price (₪ ILS)</label>
                <div className="input-group">
                  <span className="input-group-text">₪</span>
                  <input
                    className="input"
                    type="number"
                    placeholder="Sale price"
                    value={product.sale_proce || ""}
                    onChange={e => setProduct({ ...product, sale_proce: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="flex-row flex-gap-md margin-top-lg">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !(typeof product.name === 'string' ? product.name : (product.name?.en || "")) || !product.price}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            className="btn"
            onClick={() => navigate("/admin/products")}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}


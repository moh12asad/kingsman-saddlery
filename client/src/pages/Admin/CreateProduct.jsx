import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { auth, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { checkAdmin } from "../../utils/checkAdmin";
import MultiLanguageInput from "../../components/Admin/MultiLanguageInput";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function CreateProduct(){
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: { en: "", ar: "", he: "" },
    price: 0,
    categories: [],
    subCategories: [],
    image: "",
    description: { en: "", ar: "", he: "" },
    available: true,
    sale: false,
    sale_proce: 0,
    featured: false,
    sku: "",
    brand: "",
    technicalDetails: { en: "", ar: "", he: "" },
    additionalDetails: { en: "", ar: "", he: "" },
    warranty: { en: "", ar: "", he: "" },
    shippingInfo: { en: "", ar: "", he: "" },
    videoUrl: "",
    additionalImages: [],
    weight: 0,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingImages, setUploadingImages] = useState([]);
  const [error, setError] = useState("");

  async function loadCategories(){
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

  useEffect(()=>{ 
    loadCategories();
  },[]);

  const canSubmit = useMemo(() => {
    const name = typeof form.name === 'string' ? form.name : (form.name?.en || "");
    return name && form.price > 0 && form.categories.length > 0;
  }, [form]);

  // Get all sub-categories from selected categories
  const availableSubCategories = useMemo(() => {
    const allSubCategories = [];
    const seen = new Set();
    
    form.categories.forEach(catName => {
      const categoryObj = categories.find(cat => {
        const catNameFromObj = typeof cat.name === 'string' ? cat.name : (cat.name?.en || cat.name?.ar || cat.name?.he || "");
        return catNameFromObj === catName;
      });
      
      if (categoryObj?.subCategories) {
        categoryObj.subCategories.forEach(sub => {
          const subName = typeof sub.name === 'string' ? sub.name : (sub.name?.en || sub.name?.ar || sub.name?.he || "");
          if (subName && !seen.has(subName)) {
            seen.add(subName);
            allSubCategories.push(sub);
          }
        });
      }
    });
    
    return allSubCategories;
  }, [categories, form.categories]);

  async function uploadImage(file, key = "") {
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
    const path = `products/${key || Date.now()}-${safeName}`;
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
        throw new Error(t('admin.createProduct.errors.uploadPermissionDenied'));
      } else if (error.code === 'storage/canceled') {
        throw new Error(t('admin.createProduct.errors.uploadCanceled'));
      } else if (error.code) {
        throw new Error(t('admin.createProduct.errors.uploadFailed'));
      }
      throw error;
    }
  }

  async function create(){
    try {
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error(t('admin.createProduct.errors.mustSignIn'));

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
        price: Number(form.price) || 0,
        categories: Array.isArray(form.categories) ? form.categories : [],
        subCategories: Array.isArray(form.subCategories) ? form.subCategories : [],
        image: form.image,
        description: cleanTranslation(form.description),
        available: form.available,
        sale: form.sale,
        sale_proce: Number(form.sale_proce) || 0,
        featured: form.featured || false,
        sku: form.sku || "",
        brand: form.brand || "",
        technicalDetails: cleanTranslation(form.technicalDetails),
        additionalDetails: cleanTranslation(form.additionalDetails),
        warranty: cleanTranslation(form.warranty),
        shippingInfo: cleanTranslation(form.shippingInfo),
        videoUrl: form.videoUrl || "",
        additionalImages: form.additionalImages || [],
        weight: Number(form.weight) || 0,
      };

      const res = await fetch(`${API}/api/products`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json().catch(()=>({error:"Failed to create product"}));
        throw new Error(data.error || t('admin.createProduct.errors.failedToCreate'));
      }

      // Navigate back to products list
      navigate("/admin/products");
    } catch (err) {
      setError(err.message || t('admin.createProduct.errors.failedToCreate'));
    }
  }

  async function handleFormImageChange(event){
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check file size (e.g., max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError(t('admin.createProduct.errors.imageSizeLimit') || "Image size must be less than 5MB");
      return;
    }
    
    setUploadingImage(true);
    setError("");
    try {
      const publicUrl = await uploadImage(file, `new-${Date.now()}`);
      // If no main image exists, set it as main, otherwise add to additional images
      if (!form.image) {
        setForm(prev => ({ ...prev, image: publicUrl }));
      } else {
        setForm(prev => ({ 
          ...prev, 
          additionalImages: [...(prev.additionalImages || []), publicUrl] 
        }));
      }
    } catch (err) {
      setError(err.message || "Failed to upload image");
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
        const publicUrl = await uploadImage(file, `new-${Date.now()}-${i}`);
        uploadedUrls.push(publicUrl);
        setUploadingImages(prev => prev.filter(idx => idx !== i));
      }
      
      // First image becomes main if no main exists, rest go to additional
      if (!form.image && uploadedUrls.length > 0) {
        setForm(prev => ({ 
          ...prev, 
          image: uploadedUrls[0],
          additionalImages: [...(prev.additionalImages || []), ...uploadedUrls.slice(1)]
        }));
      } else {
        setForm(prev => ({ 
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
      const newMain = form.additionalImages?.[0] || "";
      const newAdditional = form.additionalImages?.slice(1) || [];
      setForm(prev => ({ 
        ...prev, 
        image: newMain,
        additionalImages: newAdditional
      }));
    } else {
      // Remove from additional images
      setForm(prev => ({
        ...prev,
        additionalImages: prev.additionalImages?.filter((_, i) => i !== index) || []
      }));
    }
  }

  return (
    <div className="space-y-6 create-product-page">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">{t('admin.createProduct.title')}</h2>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => navigate("/admin/products")}
        >
          {t('common.back')}
        </button>
      </div>
      
      <div className="card">
        <div className="space-y-4 mb-3">
          <div>
            <MultiLanguageInput
              label={t('admin.createProduct.namePlaceholder')}
              value={form.name}
              onChange={(value) => setForm({...form, name: value})}
              placeholder="Product name"
              required={true}
            />
          </div>
          <div>
            <input 
              className="input" 
              type="number" 
              placeholder={t('admin.createProduct.pricePlaceholder')} 
              value={form.price || ""} 
              onChange={e=>setForm({...form,price:Number(e.target.value)})}
            />
          </div>
          <div>
            <input 
              className="input" 
              type="number" 
              step="0.01"
              min="0"
              placeholder="Weight (kg)" 
              value={form.weight || ""} 
              onChange={e=>{
                const value = Number(e.target.value);
                setForm({...form, weight: value >= 0 ? value : 0});
              }}
            />
          </div>
          <div>
            <label className="form-label form-label-required">Categories</label>
            <select 
              className="select" 
              multiple
              size={Math.min(categories.length + 1, 8)}
              value={form.categories}
              onChange={e => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setForm({...form, categories: selected, subCategories: []});
              }}
              required
            >
              {categories.map(cat => {
                const catName = typeof cat.name === 'string' ? cat.name : (cat.name?.en || cat.name?.ar || cat.name?.he || "");
                return (
                  <option key={cat.id} value={catName}>{catName}</option>
                );
              })}
            </select>
            <small className="text-muted">Hold Ctrl (Windows) or Cmd (Mac) to select multiple categories</small>
            {form.categories.length > 0 && (
              <div className="mt-2">
                <span className="text-sm font-medium">Selected: </span>
                <span className="text-sm">{form.categories.join(", ")}</span>
              </div>
            )}
          </div>
          {availableSubCategories.length > 0 && (
            <div>
              <label className="form-label">Sub-Categories (optional)</label>
              <select 
                className="select" 
                multiple
                size={Math.min(availableSubCategories.length + 1, 8)}
                value={form.subCategories}
                onChange={e => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setForm({...form, subCategories: selected});
                }}
              >
                {availableSubCategories.map((sub, idx) => {
                  const subName = typeof sub.name === 'string' ? sub.name : (sub.name?.en || sub.name?.ar || sub.name?.he || "");
                  return (
                    <option key={idx} value={subName}>{subName}</option>
                  );
                })}
              </select>
              <small className="text-muted">Hold Ctrl (Windows) or Cmd (Mac) to select multiple sub-categories</small>
              {form.subCategories.length > 0 && (
                <div className="mt-2">
                  <span className="text-sm font-medium">Selected: </span>
                  <span className="text-sm">{form.subCategories.join(", ")}</span>
                </div>
              )}
            </div>
          )}
          <div>
            <input 
              className="input" 
              placeholder="Image URL (optional - or use upload below)" 
              value={form.image} 
              onChange={e=>setForm({...form,image:e.target.value})}
            />
          </div>
          <div>
            <label className="btn btn-cta btn-sm inline-flex items-center gap-2 cursor-pointer">
              <span>{t('admin.createProduct.uploadImage')}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFormImageChange} />
            </label>
          </div>
          <div>
            <label className="btn btn-cta btn-sm inline-flex items-center gap-2 cursor-pointer">
              <span>{t('admin.createProduct.uploadAdditionalImages')}</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleMultipleImagesChange} />
            </label>
          </div>
          {uploadingImage && <div className="text-sm text-gray-500">Uploading main image...</div>}
          {uploadingImages.length > 0 && (
            <div className="text-sm text-gray-500">
              Uploading {uploadingImages.length} image(s)...
            </div>
          )}
          <div>
            <MultiLanguageInput
              label={t('admin.createProduct.descriptionPlaceholder')}
              value={form.description}
              onChange={(value) => setForm({...form, description: value})}
              placeholder="Product description"
              type="textarea"
              rows={3}
            />
          </div>
          <div>
            <input 
              className="input" 
              placeholder={t('admin.createProduct.skuPlaceholder')} 
              value={form.sku} 
              onChange={e=>setForm({...form,sku:e.target.value})}
            />
          </div>
          <div>
            <input 
              className="input" 
              placeholder={t('admin.createProduct.brandPlaceholder')} 
              value={form.brand} 
              onChange={e=>setForm({...form,brand:e.target.value})}
            />
          </div>
          <div>
            <MultiLanguageInput
              label={t('admin.createProduct.technicalDetailsPlaceholder')}
              value={form.technicalDetails}
              onChange={(value) => setForm({...form, technicalDetails: value})}
              placeholder="Technical details"
              type="textarea"
              rows={3}
            />
          </div>
          <div>
            <MultiLanguageInput
              label={t('admin.createProduct.additionalDetailsPlaceholder')}
              value={form.additionalDetails}
              onChange={(value) => setForm({...form, additionalDetails: value})}
              placeholder="Additional details"
              type="textarea"
              rows={3}
            />
          </div>
          <div>
            <MultiLanguageInput
              label={t('admin.createProduct.warrantyPlaceholder')}
              value={form.warranty}
              onChange={(value) => setForm({...form, warranty: value})}
              placeholder="Warranty information"
            />
          </div>
          <div>
            <MultiLanguageInput
              label={t('admin.createProduct.shippingInfoPlaceholder')}
              value={form.shippingInfo}
              onChange={(value) => setForm({...form, shippingInfo: value})}
              placeholder="Shipping information"
            />
          </div>
          <div>
            <input 
              className="input" 
              placeholder={t('admin.createProduct.videoUrlPlaceholder')} 
              value={form.videoUrl} 
              onChange={e=>setForm({...form,videoUrl:e.target.value})}
            />
          </div>
          <div>
            <label className="form-label">Product Images</label>
            {form.image && (
              <div className="mb-2">
                <div className="text-sm font-medium mb-1">Main Image:</div>
                <div className="relative inline-block">
                  <img src={form.image} alt="Main" className="w-24 h-24 object-cover rounded-lg border shadow-sm" />
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
            {form.additionalImages && form.additionalImages.length > 0 && (
              <div className="mb-2">
                <div className="text-sm font-medium mb-1">Additional Images:</div>
                <div className="flex flex-wrap gap-2">
                  {form.additionalImages.map((url, index) => (
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
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={form.available} 
                onChange={e=>setForm({...form,available:e.target.checked})}
                className="w-4 h-4"
              />
              <span className="text-sm">{t('admin.createProduct.available')}</span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={form.sale} 
                onChange={e=>setForm({...form,sale:e.target.checked})}
                className="w-4 h-4"
              />
              <span className="text-sm">{t("products.onSale")}</span>
            </label>
          </div>
          <div>
            <input 
              className="input" 
              type="number" 
              placeholder={t('admin.createProduct.salePricePlaceholder')} 
              value={form.sale_proce || ""} 
              onChange={e=>setForm({...form,sale_proce:Number(e.target.value)})}
            />
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={form.featured} 
                onChange={e=>setForm({...form,featured:e.target.checked})}
                className="w-4 h-4"
              />
              <span className="text-sm">Featured (for Suggested tab)</span>
            </label>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            className="btn btn-cta btn-sm disabled:opacity-50 disabled:cursor-not-allowed" 
            disabled={!canSubmit} 
            onClick={create}
          >
            {t('admin.createProduct.create')}
          </button>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => navigate("/admin/products")}
          >
            {t('admin.products.cancel')}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
      </div>
    </div>
  );
}




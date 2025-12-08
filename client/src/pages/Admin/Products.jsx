import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useLanguage } from "../../context/LanguageContext";
import { useTranslatedContent } from "../../hooks/useTranslatedContent";
import MultilingualInput from "../../components/MultilingualInput";
import ProductTableCell from "../../components/ProductTableCell";
import { getTranslatedContent } from "../../utils/getTranslatedContent";

const API = import.meta.env.VITE_API_BASE_URL || "";

// Helper component for category option
function CategoryOption({ category, value }) {
  const { language } = useLanguage();
  const displayName = getTranslatedContent(category.name, language);
  return <option value={value}>{displayName}</option>;
}

// Helper component for subcategory option
function SubCategoryOption({ subCategory, value }) {
  const { language } = useLanguage();
  const displayName = getTranslatedContent(subCategory.name, language);
  return <option value={value}>{displayName}</option>;
}

export default function AdminProducts(){
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]); // Store all products
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all"); // Filter by category
  const [searchQuery, setSearchQuery] = useState(""); // Search query
  const [form, setForm] = useState({
    name: { en: "", ar: "", he: "" },
    price: 0,
    category: { en: "", ar: "", he: "" },
    subCategory: { en: "", ar: "", he: "" },
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
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingImages, setUploadingImages] = useState([]);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function load(){
    const r = await fetch(`${API}/api/products`);
    const b = await r.json();
    const products = b.products || [];
    setAllRows(products);
    setRows(products);
  }

  async function loadCategories(){
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const r = await fetch(`${API}/api/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const b = await r.json();
      setCategories(b.categories || []);
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  }

  useEffect(()=>{ 
    load(); 
    loadCategories();
  },[]);

  const canSubmit = useMemo(() => {
    const name = typeof form.name === 'object' ? form.name.en : form.name;
    const category = typeof form.category === 'object' ? form.category.en : form.category;
    return name && name.trim() && form.price > 0 && category && category.trim();
  }, [form]);

  // Get selected category object and its sub-categories
  const selectedCategoryObj = useMemo(() => {
    const categoryName = typeof form.category === 'object' ? form.category.en : form.category;
    if (!categoryName) return null;
    return categories.find(cat => {
      const catName = typeof cat.name === 'object' ? cat.name.en : cat.name;
      return catName === categoryName;
    });
  }, [categories, form.category]);

  const availableSubCategories = useMemo(() => {
    return selectedCategoryObj?.subCategories || [];
  }, [selectedCategoryObj]);

  // Filter products by category and search query
  const filteredRows = useMemo(() => {
    let filtered = allRows;

    // Helper to get text from multilingual or string
    const getText = (field) => {
      if (!field) return "";
      if (typeof field === 'string') return field.toLowerCase();
      if (typeof field === 'object') {
        return (field.en || field.ar || field.he || "").toLowerCase();
      }
      return "";
    };
    
    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(p => {
        const pCategory = getText(p.category);
        return pCategory === selectedCategory.toLowerCase() || 
               (typeof p.category === 'object' && p.category.en === selectedCategory);
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => {
        const nameText = getText(p.name);
        const categoryText = getText(p.category);
        const subCategoryText = getText(p.subCategory);
        const descriptionText = getText(p.description);
        
        return nameText.includes(query) ||
               categoryText.includes(query) ||
               subCategoryText.includes(query) ||
               descriptionText.includes(query);
      });
    }

    return filtered;
  }, [allRows, selectedCategory, searchQuery]);

  // Get unique categories from products for filter dropdown
  const productCategories = useMemo(() => {
    const cats = new Set();
    allRows.forEach(p => {
      if (p.category) {
        const catName = typeof p.category === 'object' ? p.category.en : p.category;
        if (catName) cats.add(catName);
      }
    });
    return Array.from(cats).sort();
  }, [allRows]);

  async function uploadImage(file, key = "") {
    // Ensure user is authenticated
    if (!auth.currentUser) {
      throw new Error("You must be signed in to upload images");
    }
    
    // Verify file type
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
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
        throw new Error("You don't have permission to upload images. Please check Firebase Storage rules.");
      } else if (error.code === 'storage/canceled') {
        throw new Error("Upload was canceled");
      } else if (error.code) {
        throw new Error(`Upload failed: ${error.message}`);
      }
      throw error;
    }
  }

  async function create(){
    try {
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      // Helper to clean multilingual object (remove empty strings, keep structure)
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
        price: Number(form.price) || 0,
        category: cleanMultilingual(form.category),
        subCategory: cleanMultilingual(form.subCategory),
        image: form.image,
        description: cleanMultilingual(form.description),
        available: form.available,
        sale: form.sale,
        sale_proce: Number(form.sale_proce) || 0,
        featured: form.featured || false,
        sku: form.sku || "",
        brand: form.brand || "",
        technicalDetails: cleanMultilingual(form.technicalDetails),
        additionalDetails: cleanMultilingual(form.additionalDetails),
        warranty: cleanMultilingual(form.warranty),
        shippingInfo: cleanMultilingual(form.shippingInfo),
        videoUrl: form.videoUrl || "",
        additionalImages: form.additionalImages || [],
      };

      const res = await fetch(`${API}/api/products`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json().catch(()=>({error:"Failed to create product"}));
        throw new Error(data.error || "Failed to create product");
      }

      setForm({ 
        name: { en: "", ar: "", he: "" },
        price: 0,
        category: { en: "", ar: "", he: "" },
        subCategory: { en: "", ar: "", he: "" },
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
        additionalImages: []
      });
      await load();
    } catch (err) {
      setError(err.message || "Unable to create product");
    }
  }


  async function deleteProduct(id){
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    setDeletingId(id);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API}/api/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete");
      setConfirmDelete(null);
      await load();
    } catch (err) {
      setError(err.message || "Failed to delete product");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleFormImageChange(event){
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check file size (e.g., max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError("Image size must be less than 5MB");
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
    <div className="space-y-6">
      {/* Create Product Form */}
      <div className="card">
        <h2 className="section-title">{t("admin.createProduct")}</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mb-3">
          <div className="md:col-span-2 lg:col-span-3">
            <MultilingualInput
              label={t("admin.name")}
              value={form.name}
              onChange={(value) => setForm({...form, name: value})}
              placeholder={t("admin.productDescription")}
              required
            />
          </div>
          <input 
            className="input" 
            type="number" 
            placeholder="Price (₪ ILS)" 
            value={form.price || ""} 
            onChange={e=>setForm({...form,price:Number(e.target.value)})}
          />
          <select 
            className="select" 
            value={typeof form.category === 'object' ? form.category.en : form.category} 
            onChange={e=>{
              const selectedCategory = categories.find(cat => {
                const catName = typeof cat.name === 'object' ? cat.name.en : cat.name;
                return catName === e.target.value;
              });
              // If category has multilingual name, use it; otherwise create from selected name
              const categoryValue = selectedCategory?.name && typeof selectedCategory.name === 'object'
                ? selectedCategory.name
                : { en: e.target.value, ar: "", he: "" };
              setForm({...form, category: categoryValue, subCategory: { en: "", ar: "", he: "" }});
            }}
            required
          >
            <option value="">Select category...</option>
            {categories.map(cat => {
              const catName = typeof cat.name === 'object' ? cat.name.en : cat.name;
              return (
                <CategoryOption key={cat.id} category={cat} value={catName} />
              );
            })}
          </select>
          {availableSubCategories.length > 0 && (
            <select 
              className="select" 
              value={typeof form.subCategory === 'object' ? form.subCategory.en : form.subCategory} 
              onChange={e=>{
                const subValue = { en: e.target.value, ar: "", he: "" };
                setForm({...form, subCategory: subValue});
              }}
            >
              <option value="">Select sub-category (optional)...</option>
              {availableSubCategories.map((sub, idx) => {
                const subName = typeof sub.name === 'object' ? sub.name.en : sub.name;
                return (
                  <SubCategoryOption key={idx} subCategory={sub} value={subName} />
                );
              })}
            </select>
          )}
          <input 
            className="input" 
            placeholder="Image URL (optional - or use upload below)" 
            value={form.image} 
            onChange={e=>setForm({...form,image:e.target.value})}
          />
          <label className="flex items-center gap-2 border rounded px-2 py-1.5 cursor-pointer hover:bg-gray-50 transition text-sm">
            <span>Upload Main Image</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFormImageChange} />
          </label>
          <label className="flex items-center gap-2 border rounded px-2 py-1.5 cursor-pointer hover:bg-gray-50 transition text-sm">
            <span>Upload Multiple Images</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleMultipleImagesChange} />
          </label>
          {uploadingImage && <span className="text-sm text-gray-500 flex items-center">Uploading main image...</span>}
          {uploadingImages.length > 0 && (
            <span className="text-sm text-gray-500 flex items-center">
              Uploading {uploadingImages.length} image(s)...
            </span>
          )}
          <div className="md:col-span-2 lg:col-span-3">
            <MultilingualInput
              label={t("admin.description")}
              value={form.description}
              onChange={(value) => setForm({...form, description: value})}
              placeholder={t("admin.productDescription")}
              rows={3}
            />
          </div>
          <input 
            className="input" 
            placeholder="SKU (optional)" 
            value={form.sku} 
            onChange={e=>setForm({...form,sku:e.target.value})}
          />
          <input 
            className="input" 
            placeholder="Brand (optional)" 
            value={form.brand} 
            onChange={e=>setForm({...form,brand:e.target.value})}
          />
          <div className="md:col-span-2 lg:col-span-3">
            <MultilingualInput
              label={t("admin.technicalDetails")}
              value={form.technicalDetails}
              onChange={(value) => setForm({...form, technicalDetails: value})}
              placeholder={t("admin.technicalDetailsPlaceholder")}
              rows={3}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <MultilingualInput
              label={t("admin.additionalDetails")}
              value={form.additionalDetails}
              onChange={(value) => setForm({...form, additionalDetails: value})}
              placeholder={t("admin.additionalDetailsPlaceholder")}
              rows={3}
            />
          </div>
          <div>
            <MultilingualInput
              label={t("admin.warranty")}
              value={form.warranty}
              onChange={(value) => setForm({...form, warranty: value})}
              placeholder={t("admin.warrantyPlaceholder")}
            />
          </div>
          <div>
            <MultilingualInput
              label={t("admin.shippingInfo")}
              value={form.shippingInfo}
              onChange={(value) => setForm({...form, shippingInfo: value})}
              placeholder={t("admin.shippingInfoPlaceholder")}
            />
          </div>
          <input 
            className="input md:col-span-2 lg:col-span-3" 
            placeholder="Video URL (optional)" 
            value={form.videoUrl} 
            onChange={e=>setForm({...form,videoUrl:e.target.value})}
          />
          <div className="md:col-span-2 lg:col-span-3">
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
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={form.available} 
              onChange={e=>setForm({...form,available:e.target.checked})}
              className="w-4 h-4"
            />
            <span className="text-sm">{t("admin.available")}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={form.sale} 
              onChange={e=>setForm({...form,sale:e.target.checked})}
              className="w-4 h-4"
            />
            <span className="text-sm">{t("admin.onSale")}</span>
          </label>
          <input 
            className="input" 
            type="number" 
            placeholder="Sale price (₪ ILS)" 
            value={form.sale_proce || ""} 
            onChange={e=>setForm({...form,sale_proce:Number(e.target.value)})}
          />
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
        <button 
          className="btn btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed" 
          disabled={!canSubmit} 
          onClick={create}
        >
          {t("admin.createProduct")}
        </button>
        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
      </div>

      {/* Products Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <h2 className="section-title">Products ({filteredRows.length})</h2>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <input
                type="text"
                placeholder={t("admin.searchProducts")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input w-full pl-10"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <label className="text-sm font-medium text-gray-700">Filter by Category:</label>
            <select 
              className="select select-min-width" 
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {productCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {(selectedCategory !== "all" || searchQuery) && (
              <button 
                className="btn btn-sm"
                onClick={() => {
                  setSelectedCategory("all");
                  setSearchQuery("");
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table admin-products-table">
            <thead>
              <tr>
                <th>{t("admin.image")}</th>
                <th>{t("admin.name")}</th>
                <th>{t("admin.price")}</th>
                <th>{t("admin.category")}</th>
                <th>{t("admin.subCategory")}</th>
                <th>{t("admin.description")}</th>
                <th>{t("admin.status")}</th>
                <th>{t("admin.sale")}</th>
                <th>{t("admin.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-gray-500">
                    {selectedCategory === "all" 
                      ? t("admin.noProducts")
                      : `${t("admin.noProductsInCategory")} "${selectedCategory}".`}
                  </td>
                </tr>
              ) : (
                filteredRows.map(p => (
                  <tr key={p.id}>
                    <td>
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-16 h-16 object-cover rounded-lg border shadow-sm" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400 text-xs">No image</div>
                      )}
                    </td>
                    <td className="font-medium">
                      <ProductTableCell content={p.name} />
                    </td>
                    <td>₪{(p.price || 0).toFixed(2)}</td>
                    <td>
                      <ProductTableCell content={p.category} />
                    </td>
                    <td>
                      <ProductTableCell content={p.subCategory} />
                    </td>
                    <td className="max-w-xs">
                      <p className="text-sm text-gray-600 truncate">
                        <ProductTableCell content={p.description} />
                      </p>
                    </td>
                    <td>
                      <span className={p.available ? "badge badge-success" : "badge badge-danger"}>
                        {p.available ? t("admin.available") : t("admin.unavailable")}
                      </span>
                    </td>
                    <td>
                      {p.sale ? (
                        <div className="flex items-center gap-2">
                          <span className="badge badge-danger">{t("admin.onSale")}</span>
                          {p.sale_proce > 0 && (
                            <span className="text-sm text-red-600 font-semibold">₪{p.sale_proce.toFixed(2)}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={() => navigate(`/admin/products/edit/${p.id}`)}
                        >
                          {t("common.edit")}
                        </button>
                        {confirmDelete === p.id ? (
                          <div className="flex gap-1">
                            <button 
                              className="btn btn-danger btn-sm" 
                              onClick={()=>deleteProduct(p.id)}
                              disabled={deletingId === p.id}
                            >
                              {deletingId === p.id ? "..." : t("common.confirm")}
                            </button>
                            <button 
                              className="btn btn-sm" 
                              onClick={()=>setConfirmDelete(null)}
                            >
                              {t("common.cancel")}
                            </button>
                          </div>
                        ) : (
                          <button 
                            className="btn btn-danger btn-sm" 
                            onClick={()=>setConfirmDelete(p.id)}
                            disabled={deletingId === p.id}
                          >
                            {t("common.delete")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

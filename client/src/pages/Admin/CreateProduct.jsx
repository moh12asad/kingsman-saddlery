import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { auth, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { checkAdmin } from "../../utils/checkAdmin";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function CreateProduct(){
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: "",
    price: 0,
    category: "",
    subCategory: "",
    image: "",
    description: "",
    available: true,
    sale: false,
    sale_proce: 0,
    featured: false,
    sku: "",
    brand: "",
    technicalDetails: "",
    additionalDetails: "",
    warranty: "",
    shippingInfo: "",
    videoUrl: "",
    additionalImages: [],
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingImages, setUploadingImages] = useState([]);
  const [error, setError] = useState("");

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
    loadCategories();
  },[]);

  const canSubmit = useMemo(() => form.name && form.price > 0 && form.category, [form]);

  // Get selected category object and its sub-categories
  const selectedCategoryObj = useMemo(() => {
    return categories.find(cat => cat.name === form.category);
  }, [categories, form.category]);

  const availableSubCategories = useMemo(() => {
    return selectedCategoryObj?.subCategories || [];
  }, [selectedCategoryObj]);

  async function uploadImage(file, key = "") {
    // Ensure user is authenticated
    if (!auth.currentUser) {
      throw new Error("You must be signed in to upload images");
    }

    // Check if user is admin
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
      throw new Error("Only administrators can upload product images");
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

      const payload = {
        name: form.name,
        price: Number(form.price) || 0,
        category: form.category,
        subCategory: form.subCategory || "",
        image: form.image,
        description: form.description ? form.description.trim() : "",
        available: form.available,
        sale: form.sale,
        sale_proce: Number(form.sale_proce) || 0,
        featured: form.featured || false,
        sku: form.sku || "",
        brand: form.brand || "",
        technicalDetails: form.technicalDetails || "",
        additionalDetails: form.additionalDetails || "",
        warranty: form.warranty || "",
        shippingInfo: form.shippingInfo || "",
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

      // Navigate back to products list
      navigate("/admin/products");
    } catch (err) {
      setError(err.message || "Unable to create product");
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Create Product</h2>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => navigate("/admin/products")}
        >
          Back to Products
        </button>
      </div>
      
      <div className="card">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mb-3">
          <input 
            className="input" 
            placeholder="Product name" 
            value={form.name} 
            onChange={e=>setForm({...form,name:e.target.value})}
          />
          <input 
            className="input" 
            type="number" 
            placeholder="Price (₪ ILS)" 
            value={form.price || ""} 
            onChange={e=>setForm({...form,price:Number(e.target.value)})}
          />
          <select 
            className="select" 
            value={form.category} 
            onChange={e=>setForm({...form, category: e.target.value, subCategory: ""})}
            required
          >
            <option value="">Select category...</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
          {availableSubCategories.length > 0 && (
            <select 
              className="select" 
              value={form.subCategory} 
              onChange={e=>setForm({...form, subCategory: e.target.value})}
            >
              <option value="">Select sub-category (optional)...</option>
              {availableSubCategories.map((sub, idx) => (
                <option key={idx} value={sub.name}>{sub.name}</option>
              ))}
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
          <textarea
            className="input md:col-span-2 lg:col-span-3"
            placeholder="Product description (optional)"
            rows="3"
            value={form.description}
            onChange={e=>setForm({...form,description:e.target.value})}
          />
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
          <textarea
            className="input md:col-span-2 lg:col-span-3"
            placeholder="Technical Details (optional, one per line)"
            rows="3"
            value={form.technicalDetails}
            onChange={e=>setForm({...form,technicalDetails:e.target.value})}
          />
          <textarea
            className="input md:col-span-2 lg:col-span-3"
            placeholder="Additional Details (optional, one per line)"
            rows="3"
            value={form.additionalDetails}
            onChange={e=>setForm({...form,additionalDetails:e.target.value})}
          />
          <input 
            className="input" 
            placeholder="Warranty (optional)" 
            value={form.warranty} 
            onChange={e=>setForm({...form,warranty:e.target.value})}
          />
          <input 
            className="input" 
            placeholder="Shipping Info (optional)" 
            value={form.shippingInfo} 
            onChange={e=>setForm({...form,shippingInfo:e.target.value})}
          />
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
            <span className="text-sm">Available</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={form.sale} 
              onChange={e=>setForm({...form,sale:e.target.checked})}
              className="w-4 h-4"
            />
            <span className="text-sm">{t("products.onSale")}</span>
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
        <div className="flex gap-3">
          <button 
            className="btn btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed" 
            disabled={!canSubmit} 
            onClick={create}
          >
            Create Product
          </button>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => navigate("/admin/products")}
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
      </div>
    </div>
  );
}




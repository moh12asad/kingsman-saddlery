import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
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
      const response = await fetch(`${API}/api/products`);
      const data = await response.json();
      const found = (data.products || []).find(p => p.id === id);
      if (!found) {
        setError("Product not found");
        return;
      }
      setProduct(found);
    } catch (err) {
      setError(err.message || "Failed to load product");
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
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

  async function uploadImage(file) {
    // Ensure user is authenticated
    if (!auth.currentUser) {
      throw new Error("You must be signed in to upload images");
    }
    
    // Verify file type
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }
    
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `products/${id}-${Date.now()}-${safeName}`;
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
      setError("Image size must be less than 5MB");
      return;
    }
    
    setUploadingImage(true);
    setError("");
    try {
      const publicUrl = await uploadImage(file);
      setProduct(prev => ({ ...prev, image: publicUrl }));
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
      if (!token) throw new Error("You must be signed in");

      const payload = {
        name: product.name,
        price: Number(product.price) || 0,
        category: product.category || "",
        subCategory: product.subCategory || "",
        image: product.image || "",
        description: product.description ? product.description.trim() : "",
        available: product.available,
        sale: product.sale,
        sale_proce: Number(product.sale_proce) || 0,
        featured: product.featured || false,
        sku: product.sku || "",
        brand: product.brand || "",
        technicalDetails: product.technicalDetails || "",
        additionalDetails: product.additionalDetails || "",
        warranty: product.warranty || "",
        shippingInfo: product.shippingInfo || "",
        videoUrl: product.videoUrl || "",
        additionalImages: product.additionalImages || [],
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
          <p className="text-error">{error || "Product not found"}</p>
          <button onClick={() => navigate("/admin/products")} className="btn btn-primary margin-top-md">
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="spacing-y-lg">
      <div className="flex-row-between">
        <h2 className="section-title">Edit Product</h2>
        <button onClick={() => navigate("/admin/products")} className="btn btn-sm">
          ← Back to Products
        </button>
      </div>

      <div className="card">
        <div className="grid-form grid-form-3">
          <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
            <div className="form-group">
              <label className="form-label form-label-required">Product Name</label>
              <input
                className="input"
                placeholder="Product name"
                value={product.name || ""}
                onChange={e => setProduct({ ...product, name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <div className="form-group">
              <label className="form-label form-label-required">Price</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
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
              <label className="form-label">Category</label>
              <select
                className="select"
                value={product.category || ""}
                onChange={e => setProduct({ ...product, category: e.target.value, subCategory: "" })}
              >
                <option value="">Select category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {(() => {
            const selectedCategoryObj = categories.find(cat => cat.name === product.category);
            const availableSubCategories = selectedCategoryObj?.subCategories || [];
            
            if (availableSubCategories.length > 0) {
              return (
                <div>
                  <div className="form-group">
                    <label className="form-label">Sub-Category</label>
                    <select
                      className="select"
                      value={product.subCategory || ""}
                      onChange={e => setProduct({ ...product, subCategory: e.target.value })}
                    >
                      <option value="">Select sub-category (optional)...</option>
                      {availableSubCategories.map((sub, idx) => (
                        <option key={idx} value={sub.name}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="input"
                placeholder="Product description (optional)"
                rows="4"
                value={product.description || ""}
                onChange={e => setProduct({ ...product, description: e.target.value })}
              />
            </div>
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
            <div className="form-group">
              <label className="form-label">Technical Details</label>
              <textarea
                className="input"
                placeholder="Technical details (optional, one per line)"
                rows="4"
                value={product.technicalDetails || ""}
                onChange={e => setProduct({ ...product, technicalDetails: e.target.value })}
              />
            </div>
          </div>

          <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
            <div className="form-group">
              <label className="form-label">Additional Details</label>
              <textarea
                className="input"
                placeholder="Additional information (optional, one per line)"
                rows="4"
                value={product.additionalDetails || ""}
                onChange={e => setProduct({ ...product, additionalDetails: e.target.value })}
              />
            </div>
          </div>

          <div>
            <div className="form-group">
              <label className="form-label">Warranty</label>
              <input
                className="input"
                placeholder="Warranty information (optional)"
                value={product.warranty || ""}
                onChange={e => setProduct({ ...product, warranty: e.target.value })}
              />
            </div>
          </div>

          <div>
            <div className="form-group">
              <label className="form-label">Shipping Info</label>
              <input
                className="input"
                placeholder="Shipping information (optional)"
                value={product.shippingInfo || ""}
                onChange={e => setProduct({ ...product, shippingInfo: e.target.value })}
              />
            </div>
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
              <span className="text-small">On Sale</span>
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
                <label className="form-label">Sale Price</label>
                <div className="input-group">
                  <span className="input-group-text">$</span>
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
            disabled={saving || !product.name || !product.price}
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


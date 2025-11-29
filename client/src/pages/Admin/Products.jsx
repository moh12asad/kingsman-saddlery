import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function AdminProducts(){
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]); // Store all products
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all"); // Filter by category
  const [searchQuery, setSearchQuery] = useState(""); // Search query
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
  });
  const [uploadingImage, setUploadingImage] = useState(false);
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

  const canSubmit = useMemo(() => form.name && form.price > 0 && form.category, [form]);

  // Get selected category object and its sub-categories
  const selectedCategoryObj = useMemo(() => {
    return categories.find(cat => cat.name === form.category);
  }, [categories, form.category]);

  const availableSubCategories = useMemo(() => {
    return selectedCategoryObj?.subCategories || [];
  }, [selectedCategoryObj]);

  // Filter products by category and search query
  const filteredRows = useMemo(() => {
    let filtered = allRows;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => 
        (p.name && p.name.toLowerCase().includes(query)) ||
        (p.category && p.category.toLowerCase().includes(query)) ||
        (p.subCategory && p.subCategory.toLowerCase().includes(query)) ||
        (p.description && p.description.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [allRows, selectedCategory, searchQuery]);

  // Get unique categories from products for filter dropdown
  const productCategories = useMemo(() => {
    const cats = new Set(allRows.map(p => p.category).filter(Boolean));
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

      setForm({ name:"", price:0, category:"", subCategory:"", image:"", description:"", available:true, sale:false, sale_proce:0, featured:false });
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
      setForm(prev => ({ ...prev, image: publicUrl }));
    } catch (err) {
      setError(err.message || "Failed to upload image");
      console.error("Image upload error:", err);
    } finally {
      setUploadingImage(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Create Product Form */}
      <div className="card">
        <h2 className="section-title">Create Product</h2>
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
            placeholder="Price" 
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
            placeholder="Image URL (optional)" 
            value={form.image} 
            onChange={e=>setForm({...form,image:e.target.value})}
          />
          <label className="flex items-center gap-2 border rounded px-2 py-1.5 cursor-pointer hover:bg-gray-50 transition text-sm">
            <span>Upload image</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFormImageChange} />
          </label>
          {uploadingImage && <span className="text-sm text-gray-500 flex items-center">Uploading...</span>}
          <textarea
            className="input md:col-span-2 lg:col-span-3"
            placeholder="Product description (optional)"
            rows="3"
            value={form.description}
            onChange={e=>setForm({...form,description:e.target.value})}
          />
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
            <span className="text-sm">On Sale</span>
          </label>
          <input 
            className="input" 
            type="number" 
            placeholder="Sale price" 
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
          Create Product
        </button>
        {form.image && (
          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-2">Preview:</div>
            <img src={form.image} alt="preview" className="w-40 h-40 object-cover rounded-lg border shadow-sm" />
          </div>
        )}
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
                placeholder="Search products..."
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
                <th>Image</th>
                <th>Name</th>
                <th>Price</th>
                <th>Category</th>
                <th>Sub-Category</th>
                <th>Description</th>
                <th>Status</th>
                <th>Sale</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-gray-500">
                    {selectedCategory === "all" 
                      ? "No products yet. Create your first product above!"
                      : `No products found in category "${selectedCategory}".`}
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
                    <td className="font-medium">{p.name || "-"}</td>
                    <td>${(p.price || 0).toFixed(2)}</td>
                    <td>{p.category || "-"}</td>
                    <td>{p.subCategory || "-"}</td>
                    <td className="max-w-xs">
                      <p className="text-sm text-gray-600 truncate" title={p.description || ""}>
                        {p.description || "-"}
                      </p>
                    </td>
                    <td>
                      <span className={p.available ? "badge badge-success" : "badge badge-danger"}>
                        {p.available ? "Available" : "Unavailable"}
                      </span>
                    </td>
                    <td>
                      {p.sale ? (
                        <div className="flex items-center gap-2">
                          <span className="badge badge-danger">On Sale</span>
                          {p.sale_proce > 0 && (
                            <span className="text-sm text-red-600 font-semibold">${p.sale_proce.toFixed(2)}</span>
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
                          Edit
                        </button>
                        {confirmDelete === p.id ? (
                          <div className="flex gap-1">
                            <button 
                              className="btn btn-danger btn-sm" 
                              onClick={()=>deleteProduct(p.id)}
                              disabled={deletingId === p.id}
                            >
                              {deletingId === p.id ? "..." : "Confirm"}
                            </button>
                            <button 
                              className="btn btn-sm" 
                              onClick={()=>setConfirmDelete(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button 
                            className="btn btn-danger btn-sm" 
                            onClick={()=>setConfirmDelete(p.id)}
                            disabled={deletingId === p.id}
                          >
                            Delete
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

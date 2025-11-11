import { useEffect, useMemo, useState } from "react";
import { auth, storage } from "../../lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function AdminProducts(){
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: "",
    price: 0,
    category: "",
    image: "",
    available: true,
    sale: false,
    sale_proce: 0,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [rowUploading, setRowUploading] = useState({});
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function load(){
    const r = await fetch(`${API}/api/products`);
    const b = await r.json();
    setRows(b.products||[]);
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

  async function uploadImage(file, key = "") {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `products/${key || Date.now()}-${safeName}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
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
        image: form.image,
        available: form.available,
        sale: form.sale,
        sale_proce: Number(form.sale_proce) || 0,
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

      setForm({ name:"", price:0, category:"", image:"", available:true, sale:false, sale_proce:0 });
      await load();
    } catch (err) {
      setError(err.message || "Unable to create product");
    }
  }

  async function save(p){
    const token = await auth.currentUser?.getIdToken();
    await fetch(`${API}/api/products/${p.id}`, { method:"PATCH", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}`}, body: JSON.stringify(p) });
    load();
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
    setUploadingImage(true);
    try {
      const publicUrl = await uploadImage(file, `new-${Date.now()}`);
      setForm(prev => ({ ...prev, image: publicUrl }));
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleRowImageUpload(productId, file){
    if (!file) return;
    setRowUploading(prev => ({ ...prev, [productId]: true }));
    try {
      const url = await uploadImage(file, productId);
      let updatedProduct;
      setRows(prev => prev.map(p => {
        if (p.id === productId) {
          updatedProduct = { ...p, image: url };
          return updatedProduct;
        }
        return p;
      }));

      if (updatedProduct) {
        const token = await auth.currentUser?.getIdToken();
        await fetch(`${API}/api/products/${productId}`, {
          method:"PATCH",
          headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}`},
          body: JSON.stringify(updatedProduct)
        });
      }
    } finally {
      setRowUploading(prev => ({ ...prev, [productId]: false }));
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
            onChange={e=>setForm({...form,category:e.target.value})}
            required
          >
            <option value="">Select category...</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
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
        <h2 className="section-title">Products ({rows.length})</h2>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Price</th>
                <th>Category</th>
                <th>Status</th>
                <th>Sale</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    No products yet. Create your first product above!
                  </td>
                </tr>
              ) : (
                rows.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex flex-col gap-2">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-16 h-16 object-cover rounded-lg border shadow-sm" />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400 text-xs">No image</div>
                        )}
                        <label className="text-xs text-blue-600 cursor-pointer hover:underline">
                          Replace
                          <input type="file" accept="image/*" className="hidden" onChange={e=>handleRowImageUpload(p.id, e.target.files?.[0])} />
                        </label>
                        {rowUploading[p.id] && <div className="text-xs text-gray-500">Uploading...</div>}
                      </div>
                    </td>
                    <td>
                      <input 
                        className="table-input" 
                        value={p.name||""} 
                        onChange={e=>setRows(prev=>prev.map(r=>r.id===p.id?{...r,name:e.target.value}:r))}
                        placeholder="Product name"
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">$</span>
                        <input 
                          className="table-input" 
                          type="number" 
                          value={p.price||0} 
                          onChange={e=>setRows(prev=>prev.map(r=>r.id===p.id?{...r,price:Number(e.target.value)}:r))}
                        />
                      </div>
                    </td>
                    <td>
                      <select 
                        className="table-select" 
                        value={p.category||""} 
                        onChange={e=>setRows(prev=>prev.map(r=>r.id===p.id?{...r,category:e.target.value}:r))}
                      >
                        <option value="">(none)</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={!!p.available} 
                          onChange={e=>setRows(prev=>prev.map(r=>r.id===p.id?{...r,available:e.target.checked}:r))}
                          className="w-4 h-4"
                        />
                        <span className={p.available ? "badge badge-success" : "badge badge-danger"}>
                          {p.available ? "Available" : "Unavailable"}
                        </span>
                      </label>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                          <input 
                            type="checkbox" 
                            checked={!!p.sale} 
                            onChange={e=>setRows(prev=>prev.map(r=>r.id===p.id?{...r,sale:e.target.checked}:r))}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">On Sale</span>
                        </label>
                        {p.sale && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500 text-sm">$</span>
                            <input 
                              className="table-input text-xs w-20" 
                              type="number" 
                              placeholder="Sale price" 
                              value={p.sale_proce||0} 
                              onChange={e=>setRows(prev=>prev.map(r=>r.id===p.id?{...r,sale_proce:Number(e.target.value)}:r))}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button 
                          className="btn btn-success btn-sm" 
                          onClick={()=>save(p)}
                        >
                          Save
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

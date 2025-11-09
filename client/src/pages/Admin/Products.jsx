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
    <div>
      <h2 className="text-xl font-semibold mb-3">Create product</h2>
      <div className="flex gap-2 mb-4 flex-wrap">
        <input className="border p-2" placeholder="name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <input className="border p-2" type="number" placeholder="price" value={form.price} onChange={e=>setForm({...form,price:Number(e.target.value)})}/>
        <select 
          className="border p-2" 
          value={form.category} 
          onChange={e=>setForm({...form,category:e.target.value})}
          required
        >
          <option value="">Select category...</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.name}>{cat.name}</option>
          ))}
        </select>
        <input className="border p-2" placeholder="Image URL (optional)" value={form.image} onChange={e=>setForm({...form,image:e.target.value})}/>
        <label className="flex items-center gap-2 border rounded px-3">
          <span className="text-sm">Upload image</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFormImageChange} />
        </label>
        {uploadingImage && <span className="text-sm text-gray-500">Uploading...</span>}
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.available} onChange={e=>setForm({...form,available:e.target.checked})}/>available</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.sale} onChange={e=>setForm({...form,sale:e.target.checked})}/>sale</label>
        <input className="border p-2" type="number" placeholder="sale_proce" value={form.sale_proce} onChange={e=>setForm({...form,sale_proce:Number(e.target.value)})}/>
        <button className="px-3 py-2 border rounded disabled:opacity-50" disabled={!canSubmit} onClick={create}>Create</button>
      </div>
      {form.image && (
        <div className="mb-6">
          <div className="text-sm text-gray-600">Preview</div>
          <img src={form.image} alt="preview" className="w-40 h-40 object-cover rounded border" />
        </div>
      )}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <h2 className="text-xl font-semibold mb-2">Products</h2>
      <table className="min-w-full text-sm">
        <thead><tr><th>Name</th><th>Price</th><th>Category</th><th>Image</th><th>Available</th><th>Sale</th><th>Sale price</th><th/></tr></thead>
        <tbody>
          {rows.map(p => (
            <tr key={p.id}>
              <td><input className="border p-1" value={p.name||""} onChange={e=>setRows(prev=>prev.map(r=>r.id===p.id?{...r,name:e.target.value}:r))}/></td>
              <td><input className="border p-1" type="number" value={p.price||0} onChange={e=>setRows(prev=>prev.map(r=>r.id===p.id?{...r,price:Number(e.target.value)}:r))}/></td>
              <td>
                <select 
                  className="border p-1" 
                  value={p.category||""} 
                  onChange={e=>setRows(prev=>prev.map(r=>r.id===p.id?{...r,category:e.target.value}:r))}
                >
                  <option value="">(none)</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </td>
              <td className="space-y-2">
                {p.image && <img src={p.image} alt={p.name} className="w-16 h-16 object-cover rounded border" />}
                <label className="flex flex-col text-xs">
                  <span className="mb-1">Replace image</span>
                  <input type="file" accept="image/*" onChange={e=>handleRowImageUpload(p.id, e.target.files?.[0])}/>
                </label>
                {rowUploading[p.id] && <div className="text-xs text-gray-500">Uploading...</div>}
              </td>
              <td><input type="checkbox" checked={!!p.available} onChange={e=>setRows(prev=>prev.map(r=>r.id===p.id?{...r,available:e.target.checked}:r))}/></td>
              <td><input type="checkbox" checked={!!p.sale} onChange={e=>setRows(prev=>prev.map(r=>r.id===p.id?{...r,sale:e.target.checked}:r))}/></td>
              <td><input className="border p-1" type="number" value={p.sale_proce||0} onChange={e=>setRows(prev=>prev.map(r=>r.id===p.id?{...r,sale_proce:Number(e.target.value)}:r))}/></td>
              <td><button className="px-2 py-1 border rounded" onClick={()=>save(p)}>Save</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

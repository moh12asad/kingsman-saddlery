import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";
const API = import.meta.env.VITE_API_BASE_URL || "";

export default function AdminProducts(){
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name:"", price:0, category:"", image:"", available:true, sale:false, sale_proce:0 });
  async function load(){
    const r = await fetch(`${API}/api/products`);
    const b = await r.json();
    setRows(b.products||[]);
  }
  useEffect(()=>{ load(); },[]);

  async function create(){
    const token = await auth.currentUser?.getIdToken();
    await fetch(`${API}/api/products`, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}`}, body: JSON.stringify(form) });
    setForm({ name:"", price:0, category:"", image:"", available:true, sale:false, sale_proce:0 });
    load();
  }
  async function save(p){
    const token = await auth.currentUser?.getIdToken();
    await fetch(`${API}/api/products/${p.id}`, { method:"PATCH", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}`}, body: JSON.stringify(p) });
    load();
  }
  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Create product</h2>
      <div className="flex gap-2 mb-4 flex-wrap">
        <input className="border p-2" placeholder="name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <input className="border p-2" type="number" placeholder="price" value={form.price} onChange={e=>setForm({...form,price:Number(e.target.value)})}/>
        <input className="border p-2" placeholder="category" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/>
        <input className="border p-2" placeholder="image URL" value={form.image} onChange={e=>setForm({...form,image:e.target.value})}/>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.available} onChange={e=>setForm({...form,available:e.target.checked})}/>available</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.sale} onChange={e=>setForm({...form,sale:e.target.checked})}/>sale</label>
        <input className="border p-2" type="number" placeholder="sale_proce" value={form.sale_proce} onChange={e=>setForm({...form,sale_proce:Number(e.target.value)})}/>
        <button className="px-3 py-2 border rounded" onClick={create}>Create</button>
      </div>

      <h2 className="text-xl font-semibold mb-2">Products</h2>
      <table className="min-w-full text-sm">
        <thead><tr><th>Name</th><th>Price</th><th>Category</th><th>Available</th><th>Sale</th><th>Sale price</th><th/></tr></thead>
        <tbody>
          {rows.map(p => (
            <tr key={p.id}>
              <td><input className="border p-1" value={p.name||""} onChange={e=>setRows(rows.map(r=>r.id===p.id?{...r,name:e.target.value}:r))}/></td>
              <td><input className="border p-1" type="number" value={p.price||0} onChange={e=>setRows(rows.map(r=>r.id===p.id?{...r,price:Number(e.target.value)}:r))}/></td>
              <td><input className="border p-1" value={p.category||""} onChange={e=>setRows(rows.map(r=>r.id===p.id?{...r,category:e.target.value}:r))}/></td>
              <td><input type="checkbox" checked={!!p.available} onChange={e=>setRows(rows.map(r=>r.id===p.id?{...r,available:e.target.checked}:r))}/></td>
              <td><input type="checkbox" checked={!!p.sale} onChange={e=>setRows(rows.map(r=>r.id===p.id?{...r,sale:e.target.checked}:r))}/></td>
              <td><input className="border p-1" type="number" value={p.sale_proce||0} onChange={e=>setRows(rows.map(r=>r.id===p.id?{...r,sale_proce:Number(e.target.value)}:r))}/></td>
              <td><button className="px-2 py-1 border rounded" onClick={()=>save(p)}>Save</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

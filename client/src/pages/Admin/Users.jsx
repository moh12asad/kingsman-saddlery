import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase"; // your existing firebase init
const API = import.meta.env.VITE_API_BASE_URL || "";

export default function AdminUsers(){
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  async function load(){
    setLoading(true);
    const token = await auth.currentUser?.getIdToken();
    const r = await fetch(`${API}/api/users`, { headers:{ Authorization:`Bearer ${token}` }});
    const b = await r.json();
    setRows(b.users||[]);
    setLoading(false);
  }
  useEffect(()=>{ load(); },[]);

  async function save(u){
    const token = await auth.currentUser?.getIdToken();
    const userId = u.uid || u.id;
    if (!userId) {
      console.error("User missing uid/id:", u);
      return;
    }
    await fetch(`${API}/api/users/${userId}`, {
      method:"PATCH",
      headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}`},
      body: JSON.stringify({ active:u.active, role:u.role, phone:u.phone, name:u.name })
    });
    load();
  }

  return (
    <div className="space-y-6">
      {loading && (
        <div className="card text-center py-8">
          <div className="text-gray-500">Loading users...</div>
        </div>
      )}
      
      {!loading && (
        <div className="card">
          <h2 className="section-title">Users ({rows.length})</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  rows.map((u, index) => {
                    const userId = u.uid || u.id || `user-${index}`;
                    return (
                      <tr key={userId}>
                        <td>
                          <input 
                            className="table-input" 
                            value={u.name||""} 
                            placeholder="User name"
                            onChange={e=>setRows(rows.map(r=>(r.uid || r.id)===userId?{...r,name:e.target.value}:r))}
                          />
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span>{u.email}</span>
                            {u.emailVerified && (
                              <span className="badge badge-success text-xs">Verified</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <input 
                            className="table-input" 
                            value={u.phone||u.phoneNumber||""} 
                            placeholder="Phone number"
                            onChange={e=>setRows(rows.map(r=>(r.uid || r.id)===userId?{...r,phone:e.target.value}:r))}
                          />
                        </td>
                        <td>
                          <select 
                            className="table-select" 
                            value={u.role||""} 
                            onChange={e=>setRows(rows.map(r=>(r.uid || r.id)===userId?{...r,role:e.target.value}:r))}
                          >
                            <option value="">(none)</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="STAFF">STAFF</option>
                            <option value="CUSTOMER">CUSTOMER</option>
                          </select>
                          {u.role && (
                            <div className="mt-1">
                              <span className={`badge ${
                                u.role === "ADMIN" ? "badge-danger" :
                                u.role === "STAFF" ? "badge-warning" :
                                "badge-info"
                              }`}>
                                {u.role}
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={!!u.active && !u.disabled} 
                              onChange={e=>setRows(rows.map(r=>(r.uid || r.id)===userId?{...r,active:e.target.checked}:r))}
                              className="w-4 h-4"
                            />
                            <span className={u.active && !u.disabled ? "badge badge-success" : "badge badge-danger"}>
                              {u.active && !u.disabled ? "Active" : "Inactive"}
                            </span>
                          </label>
                        </td>
                        <td>
                          <button 
                            className="btn btn-success btn-sm" 
                            onClick={()=>save(u)}
                          >
                            Save
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

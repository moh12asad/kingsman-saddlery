import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../lib/firebase"; // your existing firebase init
const API = import.meta.env.VITE_API_BASE_URL || "";

export default function AdminUsers(){
  const navigate = useNavigate();
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
                        <td className="font-medium">{u.name || "-"}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span>{u.email}</span>
                            {u.emailVerified && (
                              <span className="badge badge-success text-xs">Verified</span>
                            )}
                          </div>
                        </td>
                        <td>{u.phone || u.phoneNumber || "-"}</td>
                        <td>
                          {u.role ? (
                            <span className={`badge ${
                              u.role === "ADMIN" ? "badge-danger" :
                              u.role === "STAFF" ? "badge-warning" :
                              "badge-info"
                            }`}>
                              {u.role}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td>
                          <span className={u.active && !u.disabled ? "badge badge-success" : "badge badge-danger"}>
                            {u.active && !u.disabled ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="btn btn-primary btn-sm" 
                            onClick={() => navigate(`/admin/users/edit/${userId}`)}
                          >
                            Edit
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

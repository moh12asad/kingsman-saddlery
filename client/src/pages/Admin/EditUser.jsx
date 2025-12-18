import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth } from "../../lib/firebase";
import { FaCalendarAlt } from "react-icons/fa";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function EditUser() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadUser();
  }, [id]);

  async function loadUser() {
    try {
      setLoading(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      const response = await fetch(`${API}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      const found = (data.users || []).find(u => (u.uid || u.id) === id);
      if (!found) {
        setError("User not found");
        return;
      }
      setUser(found);
    } catch (err) {
      setError(err.message || "Failed to load user");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      const userId = user.uid || user.id;
      if (!userId) {
        throw new Error("User ID is missing");
      }

      const payload = {
        active: user.active,
        role: user.role || "",
        phone: user.phone || "",
        name: user.name || "",
      };

      const res = await fetch(`${API}/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to update user" }));
        throw new Error(data.error || "Failed to update user");
      }

      navigate("/admin/users");
    } catch (err) {
      setError(err.message || "Unable to update user");
    } finally {
      setSaving(false);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    try {
      // Handle different date formats
      let date;
      if (typeof dateString === 'string') {
        date = new Date(dateString);
      } else if (dateString._seconds) {
        // Firestore timestamp format with _seconds (serialized JSON)
        date = new Date(dateString._seconds * 1000);
      } else if (dateString.seconds) {
        // Firestore timestamp format with seconds
        date = new Date(dateString.seconds * 1000);
      } else if (dateString.toDate) {
        // Firestore Timestamp object
        date = dateString.toDate();
      } else {
        date = new Date(dateString);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date:", dateString);
        return "N/A";
      }
      
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (err) {
      console.error("Error formatting date:", err, dateString);
      return "N/A";
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="text-center padding-y-lg">
          <div className="text-muted">Loading user...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="card">
        <div className="text-center padding-y-lg">
          <p className="text-error">{error || "User not found"}</p>
          <button onClick={() => navigate("/admin/users")} className="btn btn-primary margin-top-md">
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="spacing-y-lg">
      <div className="flex-row-between">
        <h2 className="section-title">Edit User</h2>
        <button onClick={() => navigate("/admin/users")} className="btn btn-sm">
          ← Back to Users
        </button>
      </div>

      <div className="card">
        <div className="grid-form">
          <div>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                className="input"
                placeholder="User name"
                value={user.name || ""}
                onChange={e => setUser({ ...user, name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="input"
                style={{ background: '#f9fafb' }}
                value={user.email || ""}
                disabled
                readOnly
              />
              <p className="form-help">Email cannot be changed</p>
            </div>
          </div>

          <div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                className="input"
                placeholder="Phone number"
                value={user.phone || user.phoneNumber || ""}
                onChange={e => setUser({ ...user, phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="select"
                value={user.role || ""}
                onChange={e => setUser({ ...user, role: e.target.value })}
              >
                <option value="">(none)</option>
                <option value="ADMIN">ADMIN</option>
                <option value="STAFF">STAFF</option>
                <option value="CUSTOMER">CUSTOMER</option>
              </select>
            </div>
          </div>

          <div className="grid-col-span-full md:col-span-2">
            <div className="form-group">
              <label className="flex-row flex-gap-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!user.active && !user.disabled}
                  onChange={e => setUser({ ...user, active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-small">Active</span>
              </label>
              <p className="form-help">
                {user.active && !user.disabled ? "User account is active" : "User account is inactive"}
              </p>
            </div>
          </div>

          {user.emailVerified && (
            <div className="grid-col-span-full md:col-span-2">
              <span className="badge badge-success">Email Verified</span>
            </div>
          )}

          {(user.createdAt || user.metadata?.creationTime) && (
            <div>
              <div className="form-group">
                <label className="form-label flex-row flex-gap-sm">
                  <FaCalendarAlt />
                  Account Created
                </label>
                <input
                  className="input"
                  style={{ background: '#f9fafb' }}
                  value={formatDate(user.createdAt || user.metadata?.creationTime)}
                  disabled
                  readOnly
                />
                <p className="form-help">User account creation date (read-only)</p>
              </div>
            </div>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="flex-row flex-gap-md margin-top-lg">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            className="btn"
            onClick={() => navigate("/admin/users")}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}


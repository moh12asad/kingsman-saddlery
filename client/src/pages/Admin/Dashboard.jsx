import { useState } from "react";
import { auth } from "../../lib/firebase";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function AdminDashboard(){
  const [settingRole, setSettingRole] = useState(false);
  const [roleMessage, setRoleMessage] = useState("");

  async function setMyRole() {
    try {
      setSettingRole(true);
      setRoleMessage("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setRoleMessage("Error: Not signed in");
        return;
      }

      const response = await fetch(`${API}/api/set-user-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: 'ADMIN' })
      });

      const result = await response.json();
      if (result.ok) {
        setRoleMessage("✓ Admin role set! You can now create products.");
        setTimeout(() => setRoleMessage(""), 5000);
      } else {
        setRoleMessage(`Error: ${result.error || "Failed to set role"}`);
      }
    } catch (error) {
      setRoleMessage(`Error: ${error.message}`);
    } finally {
      setSettingRole(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="section-title">Quick Setup</div>
        <p className="text-gray-600 text-sm mb-4">
          If you're getting "Insufficient permissions" errors, click below to set your admin role:
        </p>
        <button
          onClick={setMyRole}
          disabled={settingRole}
          className="btn btn-primary"
        >
          {settingRole ? "Setting role..." : "Set My Role to ADMIN"}
        </button>
        {roleMessage && (
          <p className={`mt-3 text-sm ${roleMessage.startsWith("✓") ? "text-green-600" : "text-red-600"}`}>
            {roleMessage}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <div className="section-title">Overview</div>
          <p className="text-gray-600 text-sm">Key stats and quick links will go here.</p>
        </div>
        <div className="card">
          <div className="section-title">Orders</div>
          <p className="text-gray-600 text-sm">Recent orders summary.</p>
        </div>
        <div className="card">
          <div className="section-title">Inventory</div>
          <p className="text-gray-600 text-sm">Low-stock alerts and products on sale.</p>
        </div>
      </div>
    </div>
  );
}



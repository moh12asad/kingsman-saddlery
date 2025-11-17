import { useState } from "react";
import { auth } from "../../lib/firebase";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function AdminDashboard(){
  const [settingRole, setSettingRole] = useState(false);
  const [roleMessage, setRoleMessage] = useState("");
  const [token, setToken] = useState("");
  const [loadingToken, setLoadingToken] = useState(false);
  const [tokenError, setTokenError] = useState("");

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

  async function showToken() {
    try {
      setLoadingToken(true);
      setTokenError("");
      setToken("");
      
      const idToken = await auth.currentUser?.getIdToken(true);
      if (!idToken) {
        setTokenError("Error: Not signed in. Please sign in first.");
        return;
      }
      
      setToken(idToken);
    } catch (error) {
      setTokenError(`Error: ${error.message}`);
    } finally {
      setLoadingToken(false);
    }
  }

  function copyToken() {
    if (token) {
      navigator.clipboard.writeText(token).then(() => {
        alert("Token copied to clipboard!");
      }).catch(() => {
        alert("Failed to copy. Please select and copy manually.");
      });
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

      <div className="card">
        <div className="section-title">Firebase ID Token (for Postman)</div>
        <p className="text-gray-600 text-sm mb-4">
          Get your Firebase ID token to use in Postman for API requests. Tokens expire after 1 hour.
        </p>
        <button
          onClick={showToken}
          disabled={loadingToken}
          className="btn btn-primary"
        >
          {loadingToken ? "Loading..." : "Show Token"}
        </button>
        {tokenError && (
          <p className="mt-3 text-sm text-red-600">{tokenError}</p>
        )}
        {token && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={copyToken}
                className="btn btn-sm btn-secondary"
              >
                Copy Token
              </button>
              <span className="text-xs text-gray-500">Click to copy to clipboard</span>
            </div>
            <div className="p-3 bg-gray-100 rounded border border-gray-300">
              <pre className="text-xs break-all whitespace-pre-wrap font-mono text-gray-800">
                {token}
              </pre>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              ⚠️ Keep this token secure. It expires in ~1 hour. Use it in Postman Authorization → Bearer Token.
            </p>
          </div>
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



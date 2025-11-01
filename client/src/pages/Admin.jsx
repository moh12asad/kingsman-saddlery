import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getIdToken } from "../lib/firebase";
import AdminOption from "../components/AdminOptions.jsx"
// (Optional) You can import Firestore helpers later when you add collections:
// import { collection, addDoc, getDocs } from "firebase/firestore";
// import { db } from "../lib/firebase";

export default function Admin() {
  const { user } = useAuth();
  const [apiMsg, setApiMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  async function callSecureApi() {
    setLoading(true);
    setApiMsg(null);
    try {
      const token = await getIdToken();
      const res = await fetch("http://localhost:5000/api/admin/hello", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setApiMsg(JSON.stringify(data, null, 2));
    } catch (e) {
      setApiMsg(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-gray-600 mt-2">
          Signed in as <span className="font-medium">{user?.email}</span>
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="glass p-6">
          <h2 className="font-semibold">Secure API Test</h2>
          <p className="text-sm text-gray-600 mt-1">Calls your Node backend with a verified Firebase ID token</p>
          <button onClick={callSecureApi} disabled={loading}
            className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:opacity-90 disabled:opacity-60">
            {loading ? "Calling…" : "Call /api/admin/hello"}
          </button>
          {apiMsg && (
            <pre className="mt-4 p-3 text-xs bg-gray-900 text-gray-100 rounded-lg overflow-auto">{apiMsg}</pre>
          )}
        </div>

      </div>
        <div>
          <AdminOption />
        </div>
    </div>
  );
}

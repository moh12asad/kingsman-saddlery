import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    whatsappNumber: "",
    storeName: "",
    storeEmail: "",
    storePhone: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const response = await fetch(`${API}/api/settings`);
      const data = await response.json();
      
      if (response.ok && data.settings) {
        setSettings({
          whatsappNumber: data.settings.whatsappNumber || "",
          storeName: data.settings.storeName || "",
          storeEmail: data.settings.storeEmail || "",
          storePhone: data.settings.storePhone || "",
        });
      }
    } catch (err) {
      console.error("Error loading settings:", err);
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("You must be signed in");

      // Format WhatsApp number (remove any non-digit characters except +)
      const formattedWhatsApp = settings.whatsappNumber
        .replace(/[^\d+]/g, "")
        .replace(/^\+?/, "+");

      const payload = {
        whatsappNumber: formattedWhatsApp,
        storeName: settings.storeName.trim(),
        storeEmail: settings.storeEmail.trim(),
        storePhone: settings.storePhone.trim(),
      };

      const res = await fetch(`${API}/api/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to update settings" }));
        throw new Error(data.error || "Failed to update settings");
      }

      setSuccess("Settings saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Unable to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="text-center padding-y-lg">
          <div className="text-muted">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="spacing-y-lg">
      <h2 className="section-title">Settings</h2>

      <div className="card">
        <div className="grid-form grid-form-3">
          <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
            <div className="form-group">
              <label className="form-label">Store Name</label>
              <input
                className="input"
                placeholder="Store name"
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
              />
            </div>
          </div>

          <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
            <div className="form-group">
              <label className="form-label">Store Email</label>
              <input
                className="input"
                type="email"
                placeholder="store@example.com"
                value={settings.storeEmail}
                onChange={(e) => setSettings({ ...settings, storeEmail: e.target.value })}
              />
            </div>
          </div>

          <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
            <div className="form-group">
              <label className="form-label">Store Phone</label>
              <input
                className="input"
                type="tel"
                placeholder="+1234567890"
                value={settings.storePhone}
                onChange={(e) => setSettings({ ...settings, storePhone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
            <div className="form-group">
              <label className="form-label form-label-required">WhatsApp Number</label>
              <input
                className="input"
                type="tel"
                placeholder="+1234567890 (include country code)"
                value={settings.whatsappNumber}
                onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
              />
              <small className="text-muted margin-top-sm">
                Enter WhatsApp number with country code (e.g., +1234567890). This number will be used for the "Ask us on WhatsApp" button on product pages.
              </small>
            </div>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}
        {success && <p className="text-success margin-top-md">{success}</p>}

        <div className="flex-row flex-gap-md margin-top-lg">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !settings.whatsappNumber}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

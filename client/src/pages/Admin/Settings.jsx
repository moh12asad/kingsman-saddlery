import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";

const API = import.meta.env.VITE_API_BASE_URL || "";

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    whatsappNumber: "",
    storeName: "",
    storeEmail: "",
    storePhone: "",
    location: {
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
    workingHours: {
      monday: { open: "", close: "", closed: false },
      tuesday: { open: "", close: "", closed: false },
      wednesday: { open: "", close: "", closed: false },
      thursday: { open: "", close: "", closed: false },
      friday: { open: "", close: "", closed: false },
      saturday: { open: "", close: "", closed: false },
      sunday: { open: "", close: "", closed: false },
    },
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
          location: {
            address: data.settings.location?.address || "",
            city: data.settings.location?.city || "",
            state: data.settings.location?.state || "",
            zipCode: data.settings.location?.zipCode || "",
            country: data.settings.location?.country || "",
          },
          workingHours: {
            monday: data.settings.workingHours?.monday || { open: "", close: "", closed: false },
            tuesday: data.settings.workingHours?.tuesday || { open: "", close: "", closed: false },
            wednesday: data.settings.workingHours?.wednesday || { open: "", close: "", closed: false },
            thursday: data.settings.workingHours?.thursday || { open: "", close: "", closed: false },
            friday: data.settings.workingHours?.friday || { open: "", close: "", closed: false },
            saturday: data.settings.workingHours?.saturday || { open: "", close: "", closed: false },
            sunday: data.settings.workingHours?.sunday || { open: "", close: "", closed: false },
          },
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
        location: {
          address: settings.location.address.trim(),
          city: settings.location.city.trim(),
          state: settings.location.state.trim(),
          zipCode: settings.location.zipCode.trim(),
          country: settings.location.country.trim(),
        },
        workingHours: settings.workingHours,
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

        <div className="margin-top-xl">
          <h3 className="section-subtitle margin-bottom-md">Location</h3>
          <div className="grid-form grid-form-3">
            <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
              <div className="form-group">
                <label className="form-label">Address</label>
                <input
                  className="input"
                  placeholder="Street address"
                  value={settings.location.address}
                  onChange={(e) => setSettings({
                    ...settings,
                    location: { ...settings.location, address: e.target.value }
                  })}
                />
              </div>
            </div>

            <div className="grid-col-span-full md:col-span-1 lg:col-span-1">
              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  className="input"
                  placeholder="City"
                  value={settings.location.city}
                  onChange={(e) => setSettings({
                    ...settings,
                    location: { ...settings.location, city: e.target.value }
                  })}
                />
              </div>
            </div>

            <div className="grid-col-span-full md:col-span-1 lg:col-span-1">
              <div className="form-group">
                <label className="form-label">State/Province</label>
                <input
                  className="input"
                  placeholder="State or Province"
                  value={settings.location.state}
                  onChange={(e) => setSettings({
                    ...settings,
                    location: { ...settings.location, state: e.target.value }
                  })}
                />
              </div>
            </div>

            <div className="grid-col-span-full md:col-span-1 lg:col-span-1">
              <div className="form-group">
                <label className="form-label">ZIP/Postal Code</label>
                <input
                  className="input"
                  placeholder="ZIP or Postal Code"
                  value={settings.location.zipCode}
                  onChange={(e) => setSettings({
                    ...settings,
                    location: { ...settings.location, zipCode: e.target.value }
                  })}
                />
              </div>
            </div>

            <div className="grid-col-span-full md:col-span-2 lg:col-span-3">
              <div className="form-group">
                <label className="form-label">Country</label>
                <input
                  className="input"
                  placeholder="Country"
                  value={settings.location.country}
                  onChange={(e) => setSettings({
                    ...settings,
                    location: { ...settings.location, country: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="margin-top-xl">
          <h3 className="section-subtitle margin-bottom-md">Working Hours</h3>
          <div className="spacing-y-md">
            {DAYS.map(({ key, label }) => {
              const dayHours = settings.workingHours[key];
              return (
                <div key={key} className="card padding-md">
                  <div className="flex-row flex-align-center flex-gap-md">
                    <div className="flex-row flex-align-center flex-gap-sm" style={{ minWidth: "120px" }}>
                      <input
                        type="checkbox"
                        id={`closed-${key}`}
                        checked={dayHours.closed}
                        onChange={(e) => setSettings({
                          ...settings,
                          workingHours: {
                            ...settings.workingHours,
                            [key]: { ...dayHours, closed: e.target.checked }
                          }
                        })}
                      />
                      <label htmlFor={`closed-${key}`} className="form-label" style={{ margin: 0 }}>
                        {label}
                      </label>
                    </div>
                    {!dayHours.closed && (
                      <div className="flex-row flex-gap-md flex-grow">
                        <div className="form-group flex-grow">
                          <label className="form-label" style={{ fontSize: "0.875rem" }}>Open</label>
                          <input
                            className="input"
                            type="time"
                            value={dayHours.open}
                            onChange={(e) => setSettings({
                              ...settings,
                              workingHours: {
                                ...settings.workingHours,
                                [key]: { ...dayHours, open: e.target.value }
                              }
                            })}
                          />
                        </div>
                        <div className="form-group flex-grow">
                          <label className="form-label" style={{ fontSize: "0.875rem" }}>Close</label>
                          <input
                            className="input"
                            type="time"
                            value={dayHours.close}
                            onChange={(e) => setSettings({
                              ...settings,
                              workingHours: {
                                ...settings.workingHours,
                                [key]: { ...dayHours, close: e.target.value }
                              }
                            })}
                          />
                        </div>
                      </div>
                    )}
                    {dayHours.closed && (
                      <div className="text-muted">Closed</div>
                    )}
                  </div>
                </div>
              );
            })}
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

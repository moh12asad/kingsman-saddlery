import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "../../lib/firebase";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function BulkEmail() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [subscriberCount, setSubscriberCount] = useState(null);
  const [subscriberInfo, setSubscriberInfo] = useState(null);
  const [loadingCount, setLoadingCount] = useState(false);

  // Load subscriber count
  async function loadSubscriberCount() {
    try {
      setLoadingCount(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setError(t("admin.bulkEmail.errorNotSignedIn"));
        return;
      }

      const res = await fetch(`${API}/api/admin/bulk-email/subscribers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to load subscriber count");
      }

      const data = await res.json();
      setSubscriberCount(data.count || 0);
      
      // Store additional info for display
      if (data.totalUsers !== undefined) {
        setSubscriberInfo(data);
      }
    } catch (err) {
      console.error("Error loading subscriber count:", err);
    } finally {
      setLoadingCount(false);
    }
  }

  // Load count on mount
  useEffect(() => {
    loadSubscriberCount();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.subject.trim()) {
      setError(t("admin.bulkEmail.errorSubjectRequired"));
      return;
    }

    if (!formData.message.trim()) {
      setError(t("admin.bulkEmail.errorMessageRequired"));
      return;
    }

    try {
      setLoading(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setError(t("admin.bulkEmail.errorNotSignedIn"));
        return;
      }

      const res = await fetch(`${API}/api/admin/bulk-email/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: formData.subject.trim(),
          message: formData.message.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("admin.bulkEmail.errorSendFailed"));
      }

      const successMsg = data.failedCount > 0
        ? `Successfully sent to ${data.sentCount || 0} subscribers. ${data.failedCount} failed.`
        : t("admin.bulkEmail.success", { count: data.sentCount || 0 });
      
      setSuccess(successMsg);
      
      // Show errors if any
      if (data.errors && data.errors.length > 0) {
        console.warn("Failed emails:", data.errors);
        setError(
          `Some emails failed: ${data.errors.slice(0, 3).map(e => e.email).join(", ")}${data.errors.length > 3 ? "..." : ""}`
        );
      }
      
      setFormData({ subject: "", message: "" });
      // Reload subscriber count
      loadSubscriberCount();
    } catch (err) {
      console.error("Error sending bulk email:", err);
      setError(err.message || t("admin.bulkEmail.errorSendFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="section-title">{t("admin.bulkEmail.title")}</h2>
        <p className="text-gray-600 text-sm mb-4">
          {t("admin.bulkEmail.description")}
        </p>

        {loadingCount ? (
          <div className="text-gray-500 text-sm mb-4">
            {t("admin.bulkEmail.loadingCount")}
          </div>
        ) : subscriberCount !== null ? (
          <div className="mb-4 space-y-2">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                {t("admin.bulkEmail.subscriberCount", { count: subscriberCount })}
              </p>
            </div>
            {subscriberInfo && subscriberInfo.totalUsers && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>Note:</strong> {subscriberInfo.message || 
                    `${subscriberInfo.usersWithoutConsent || 0} users won't receive emails because they don't have emailConsent=true. ` +
                    `${subscriberInfo.usersWithoutEmail || 0} users have no email address.`
                  }
                </p>
              </div>
            )}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium mb-2">
              {t("admin.bulkEmail.subjectLabel")}
            </label>
            <input
              type="text"
              id="subject"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={t("admin.bulkEmail.subjectPlaceholder")}
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-2">
              {t("admin.bulkEmail.messageLabel")}
            </label>
            <textarea
              id="message"
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              rows={10}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={t("admin.bulkEmail.messagePlaceholder")}
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              {t("admin.bulkEmail.messageHint")}
            </p>
            <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-xs font-medium text-gray-700 mb-1">
                💡 Image Tips:
              </p>
              <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                <li>Use external image URLs (e.g., from your website, CDN, or image hosting service)</li>
                <li>Recommended: Upload images to Firebase Storage or your hosting service first</li>
                <li>Use the format: <code className="bg-gray-200 px-1 rounded">&lt;img src="URL" alt="Description" style="max-width: 100%;"&gt;</code></li>
                <li>Make sure images are publicly accessible (not behind authentication)</li>
              </ul>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading
                ? t("admin.bulkEmail.sending")
                : t("admin.bulkEmail.sendButton")}
            </button>
            <button
              type="button"
              onClick={loadSubscriberCount}
              disabled={loadingCount}
              className="btn btn-secondary"
            >
              {loadingCount
                ? t("admin.bulkEmail.loadingCount")
                : t("admin.bulkEmail.refreshCount")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


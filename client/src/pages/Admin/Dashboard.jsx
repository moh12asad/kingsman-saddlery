import { useState } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "../../lib/firebase";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function AdminDashboard(){
  const { t } = useTranslation();
  const [token, setToken] = useState("");
  const [loadingToken, setLoadingToken] = useState(false);
  const [tokenError, setTokenError] = useState("");

  async function showToken() {
    try {
      setLoadingToken(true);
      setTokenError("");
      setToken("");
      
      const idToken = await auth.currentUser?.getIdToken(true);
      if (!idToken) {
        setTokenError(t('admin.dashboard.errorNotSignedInToken'));
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
        alert(t('admin.dashboard.copyToken'));
      }).catch(() => {
        alert(t('admin.dashboard.copyToken'));
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="section-title">{t('admin.dashboard.firebaseIdToken')}</div>
        <p className="text-gray-600 text-sm mb-4">
          {t('admin.dashboard.firebaseIdTokenMessage')}
        </p>
        <button
          onClick={showToken}
          disabled={loadingToken}
          className="btn btn-primary"
        >
          {loadingToken ? t('admin.dashboard.loading') : t('admin.dashboard.showToken')}
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
                {t('admin.dashboard.copyToken')}
              </button>
              <span className="text-xs text-gray-500">{t('admin.dashboard.clickToCopy')}</span>
            </div>
            <div className="p-3 bg-gray-100 rounded border border-gray-300">
              <pre className="text-xs break-all whitespace-pre-wrap font-mono text-gray-800">
                {token}
              </pre>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {t('admin.dashboard.keepTokenSecure')}
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <div className="section-title">{t('admin.dashboard.overview')}</div>
          <p className="text-gray-600 text-sm">{t('admin.dashboard.overviewMessage')}</p>
        </div>
        <div className="card">
          <div className="section-title">{t('admin.dashboard.orders')}</div>
          <p className="text-gray-600 text-sm">{t('admin.dashboard.ordersMessage')}</p>
        </div>
        <div className="card">
          <div className="section-title">{t('admin.dashboard.inventory')}</div>
          <p className="text-gray-600 text-sm">{t('admin.dashboard.inventoryMessage')}</p>
        </div>
      </div>
    </div>
  );
}



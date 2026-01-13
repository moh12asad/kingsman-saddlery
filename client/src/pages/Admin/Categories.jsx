import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { auth } from "../../lib/firebase";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function AdminCategories() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error(t('admin.categories.errors.mustSignIn'));

      // Fetch with all=true to get full translation objects for admin display
      const res = await fetch(`${API}/api/categories?all=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load categories");
      }

      const body = await res.json();
      setCategories(body.categories || []);
    } catch (err) {
      setError(err.message || "Unable to load categories");
    } finally {
      setLoading(false);
    }
  }

  async function deleteCategory(id) {
    if (!confirm(t('admin.categories.confirmDelete'))) return;

    try {
      setSubmitting(true);
      setError("");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error(t('admin.categories.errors.mustSignIn'));

      const res = await fetch(`${API}/api/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete category");
      }

      await loadCategories();
    } catch (err) {
      setError(err.message || "Unable to delete category");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('admin.categories.title')}</h1>
        <button
          className="btn btn-cta"
          onClick={() => navigate("/admin/categories/create")}
        >
          + {t('admin.categories.addCategory')}
        </button>
      </div>

      {error && <div className="card bg-red-50 border-2 border-red-200 p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>}

      <div className="card">
        {loading ? (
          <div className="text-gray-500 text-sm">{t('admin.categories.loading')}</div>
        ) : categories.length === 0 ? (
          <div className="text-gray-500 text-sm">{t('admin.categories.noCategories')}</div>
        ) : (
          <table className="table text-sm">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>{t('admin.categories.image')}</th>
                <th style={{ textAlign: 'left' }}>{t('admin.categories.name')}</th>
                <th style={{ textAlign: 'left' }}>{t('admin.categories.description')}</th>
                <th style={{ textAlign: 'left' }}>{t('admin.categories.subCategories')}</th>
                <th style={{ textAlign: 'right' }}>{t('admin.categories.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td style={{ textAlign: 'left' }}>
                    {category.image ? (
                      <img src={category.image} alt={typeof category.name === 'string' ? category.name : (category.name?.en || category.name?.ar || category.name?.he || '')} className="w-16 h-16 object-cover rounded-lg border-2 border-gray-300 shadow-sm" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg border-2 border-gray-300 flex items-center justify-center text-gray-400 text-xs">No image</div>
                    )}
                  </td>
                  <td className="font-semibold" style={{ textAlign: 'left' }}>{typeof category.name === 'string' ? category.name : (category.name?.en || category.name?.ar || category.name?.he || "-")}</td>
                  <td className="text-gray-600" style={{ textAlign: 'left' }}>{typeof category.description === 'string' ? category.description : (category.description?.en || category.description?.ar || category.description?.he || "-")}</td>
                  <td style={{ textAlign: 'left' }}>
                    {category.subCategories && category.subCategories.length > 0 ? (
                      <div className="text-sm space-y-1">
                        <div className="font-medium text-gray-700 mb-2">
                          {category.subCategories.length} sub-categor{category.subCategories.length === 1 ? 'y' : 'ies'}
                        </div>
                        {category.subCategories.map((sub, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-1.5 bg-gray-50 rounded border-2 border-gray-300">
                            {sub.image ? (
                              <img src={sub.image} alt={typeof sub.name === 'string' ? sub.name : (sub.name?.en || sub.name?.ar || sub.name?.he || '')} className="w-8 h-8 object-cover rounded border-2 border-gray-300" />
                            ) : (
                              <div className="w-8 h-8 bg-gray-200 rounded border-2 border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                                No img
                              </div>
                            )}
                            <span className="font-medium">{typeof sub.name === 'string' ? sub.name : (sub.name?.en || sub.name?.ar || sub.name?.he || "-")}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">No sub-categories</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-cta btn-sm"
                        onClick={() => navigate(`/admin/categories/${category.id}/subcategory/create`)}
                        disabled={submitting}
                      >
                        + {t('admin.categories.addSubCategory') || 'Add Subcategory'}
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/admin/categories/edit/${category.id}`)}
                        disabled={submitting}
                      >
                        {t('admin.categories.edit')}
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteCategory(category.id)}
                        disabled={submitting}
                      >
                        {t('admin.categories.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { auth } from "../../lib/firebase";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function AdminProducts(){
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]); // Store all products
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all"); // Filter by category
  const [searchQuery, setSearchQuery] = useState(""); // Search query
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function load(){
    const r = await fetch(`${API}/api/products`);
    const b = await r.json();
    const products = b.products || [];
    setAllRows(products);
    setRows(products);
  }

  useEffect(()=>{ 
    load(); 
  },[]);

  // Filter products by category and search query
  const filteredRows = useMemo(() => {
    let filtered = allRows;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => 
        (p.name && p.name.toLowerCase().includes(query)) ||
        (p.category && p.category.toLowerCase().includes(query)) ||
        (p.subCategory && p.subCategory.toLowerCase().includes(query)) ||
        (p.description && p.description.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [allRows, selectedCategory, searchQuery]);

  // Get unique categories from products for filter dropdown
  const productCategories = useMemo(() => {
    const cats = new Set(allRows.map(p => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [allRows]);



  async function deleteProduct(id){
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    setDeletingId(id);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API}/api/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete");
      setConfirmDelete(null);
      await load();
    } catch (err) {
      setError(err.message || t('admin.products.failedToDelete'));
    } finally {
      setDeletingId(null);
    }
  }


  return (
    <div className="space-y-6">
      {/* Products Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
          <h2 className="section-title">{t('admin.products.title')} ({filteredRows.length})</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => navigate("/admin/products/create")}
            >
              {t('admin.products.createProduct')}
            </button>
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <input
                type="text"
                placeholder={t('admin.products.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input w-full pl-10"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <label className="text-sm font-medium text-gray-700">{t('admin.products.filterByCategory')}</label>
            <select 
              className="select select-min-width" 
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="all">{t('admin.products.allCategories')}</option>
              {productCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {(selectedCategory !== "all" || searchQuery) && (
              <button 
                className="btn btn-sm"
                onClick={() => {
                  setSelectedCategory("all");
                  setSearchQuery("");
                }}
              >
                {t('admin.products.clearFilters')}
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="table admin-products-table w-full">
            <thead>
              <tr>
                <th className="min-w-[80px]">{t('admin.products.image')}</th>
                <th className="min-w-[150px]">{t('admin.products.name')}</th>
                <th className="min-w-[100px]">{t('admin.products.price')}</th>
                <th className="min-w-[120px]">{t('admin.products.category')}</th>
                <th className="min-w-[120px]">{t('admin.products.subCategory')}</th>
                <th className="min-w-[200px]">{t('admin.products.description')}</th>
                <th className="min-w-[100px]">{t('admin.products.brand')}</th>
                <th className="min-w-[100px]">{t('admin.products.sku')}</th>
                <th className="min-w-[100px]">{t('admin.products.status')}</th>
                <th className="min-w-[120px]">{t('admin.products.sale')}</th>
                <th className="min-w-[100px]">{t('admin.products.featured')}</th>
                <th className="min-w-[150px]">{t('admin.products.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan="12" className="text-center py-8 text-gray-500">
                    {selectedCategory === "all" 
                      ? t('admin.products.noProducts')
                      : `${t('admin.products.noProductsInCategory')} "${selectedCategory}".`}
                  </td>
                </tr>
              ) : (
                filteredRows.map(p => (
                  <tr key={p.id}>
                    <td>
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-16 h-16 object-cover rounded-lg border shadow-sm" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400 text-xs">{t('admin.products.noImage')}</div>
                      )}
                    </td>
                    <td className="font-medium">{p.name || "-"}</td>
                    <td>₪{(p.price || 0).toFixed(2)}</td>
                    <td>{p.category || "-"}</td>
                    <td>{p.subCategory || "-"}</td>
                    <td className="max-w-xs">
                      <p className="text-sm text-gray-600 truncate" title={p.description || ""}>
                        {p.description || "-"}
                      </p>
                    </td>
                    <td>{p.brand || "-"}</td>
                    <td className="text-sm text-gray-600">{p.sku || "-"}</td>
                    <td>
                      <span className={p.available ? "badge badge-success" : "badge badge-danger"}>
                        {p.available ? t('admin.products.available') : t('admin.products.unavailable')}
                      </span>
                    </td>
                    <td>
                      {p.sale ? (
                        <div className="flex flex-col gap-1">
                          <span className="badge badge-danger">{t("products.onSale")}</span>
                          {p.sale_proce > 0 && (
                            <span className="text-sm text-red-600 font-semibold">₪{p.sale_proce.toFixed(2)}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td>
                      {p.featured ? (
                        <span className="badge badge-success">{t('admin.products.yes')}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={() => navigate(`/admin/products/edit/${p.id}`)}
                        >
                          {t('admin.products.edit')}
                        </button>
                        {confirmDelete === p.id ? (
                          <div className="flex gap-1">
                            <button 
                              className="btn btn-danger btn-sm" 
                              onClick={()=>deleteProduct(p.id)}
                              disabled={deletingId === p.id}
                            >
                              {deletingId === p.id ? "..." : t('admin.products.confirm')}
                            </button>
                            <button 
                              className="btn btn-sm" 
                              onClick={()=>setConfirmDelete(null)}
                            >
                              {t('admin.products.cancel')}
                            </button>
                          </div>
                        ) : (
                          <button 
                            className="btn btn-danger btn-sm" 
                            onClick={()=>setConfirmDelete(p.id)}
                            disabled={deletingId === p.id}
                          >
                            {t('admin.products.delete')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

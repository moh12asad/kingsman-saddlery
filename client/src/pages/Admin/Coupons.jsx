import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "../../lib/firebase";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function AdminCoupons() {
  const { t } = useTranslation();
  const [coupons, setCoupons] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    percentage: "",
    userId: "",
    expiresAt: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    }

    if (showUserDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showUserDropdown]);

  // Load coupons
  async function loadCoupons() {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API}/api/coupons`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch (err) {
      console.error("Error loading coupons:", err);
      setError(t("admin.coupons.errors.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }

  // Load users for selection
  async function loadUsers() {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(data.users || []);
      setFilteredUsers(data.users || []);
    } catch (err) {
      console.error("Error loading users:", err);
    }
  }

  useEffect(() => {
    loadCoupons();
    loadUsers();
  }, []);

  // Filter users based on search
  useEffect(() => {
    if (!userSearch.trim()) {
      setFilteredUsers(users);
    } else {
      const searchLower = userSearch.toLowerCase();
      setFilteredUsers(
        users.filter(
          (u) =>
            (u.email && u.email.toLowerCase().includes(searchLower)) ||
            (u.displayName && u.displayName.toLowerCase().includes(searchLower)) ||
            (u.name && u.name.toLowerCase().includes(searchLower))
        )
      );
    }
  }, [userSearch, users]);

  const handleCreate = () => {
    setFormData({
      code: "",
      percentage: "",
      userId: "",
      expiresAt: "",
    });
    setError("");
    setSuccess("");
    setUserSearch("");
    setShowCreateModal(true);
  };

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    const user = users.find((u) => u.uid === coupon.userId);
    setFormData({
      code: coupon.code || "",
      percentage: coupon.percentage || "",
      userId: coupon.userId || "",
      expiresAt: coupon.expiresAt
        ? new Date(coupon.expiresAt).toISOString().slice(0, 16)
        : "",
    });
    setUserSearch(user ? user.email || user.displayName || user.name : "");
    setError("");
    setSuccess("");
    setShowEditModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.percentage || formData.percentage <= 0 || formData.percentage > 100) {
      setError(t("admin.coupons.errors.invalidPercentage"));
      return;
    }

    if (!formData.expiresAt) {
      setError(t("admin.coupons.errors.expirationRequired"));
      return;
    }

    try {
      const token = await auth.currentUser?.getIdToken();
      const url = editingCoupon
        ? `${API}/api/coupons/${editingCoupon.id}`
        : `${API}/api/coupons`;
      const method = editingCoupon ? "PATCH" : "POST";

      const payload = {
        percentage: Number(formData.percentage),
        expiresAt: new Date(formData.expiresAt).toISOString(),
      };

      if (formData.code.trim()) {
        payload.code = formData.code.toUpperCase().trim();
      }

      if (formData.userId) {
        payload.userId = formData.userId;
      }

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("admin.coupons.errors.failedToSave"));
      }

      setSuccess(
        editingCoupon
          ? t("admin.coupons.success.updated")
          : t("admin.coupons.success.created")
      );
      await loadCoupons();
      setTimeout(() => {
        setShowCreateModal(false);
        setShowEditModal(false);
        setEditingCoupon(null);
        setSuccess("");
      }, 1500);
    } catch (err) {
      console.error("Error saving coupon:", err);
      setError(err.message || t("admin.coupons.errors.failedToSave"));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t("admin.coupons.confirmDelete"))) {
      return;
    }

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API}/api/coupons/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(t("admin.coupons.errors.failedToDelete"));
      }

      setSuccess(t("admin.coupons.success.deleted"));
      await loadCoupons();
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      console.error("Error deleting coupon:", err);
      setError(err.message || t("admin.coupons.errors.failedToDelete"));
    }
  };

  const getStatusBadge = (coupon) => {
    const now = new Date();
    const expiresAt = coupon.expiresAt ? new Date(coupon.expiresAt) : null;
    const used = coupon.used || coupon.usedAt;

    if (used) {
      return (
        <span className="badge badge-danger">
          {t("admin.coupons.status.used")}
        </span>
      );
    }

    if (expiresAt && now > expiresAt) {
      return (
        <span className="badge badge-warning">
          {t("admin.coupons.status.expired")}
        </span>
      );
    }

    return (
      <span className="badge badge-success">
        {t("admin.coupons.status.active")}
      </span>
    );
  };

  const getUserName = (userId) => {
    if (!userId) return t("admin.coupons.allUsers");
    const user = users.find((u) => u.uid === userId);
    return user
      ? user.displayName || user.name || user.email || userId
      : userId;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="section-title">{t("admin.coupons.title")}</h2>
        <button
          onClick={handleCreate}
          className="btn btn-primary"
        >
          {t("admin.coupons.createCoupon")}
        </button>
      </div>

      {success && (
        <div className="card bg-green-50 border-green-200 text-green-800 p-4">
          {success}
        </div>
      )}

      {error && (
        <div className="card bg-red-50 border-red-200 text-red-800 p-4">
          {error}
        </div>
      )}

      {loading && (
        <div className="card text-center py-8">
          <div className="text-gray-500">{t("admin.coupons.loading")}</div>
        </div>
      )}

      {!loading && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("admin.coupons.code")}</th>
                  <th>{t("admin.coupons.percentage")}</th>
                  <th>{t("admin.coupons.user")}</th>
                  <th>{t("admin.coupons.expiresAt")}</th>
                  <th>{t("admin.coupons.statusLabel")}</th>
                  <th>{t("admin.coupons.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500">
                      {t("admin.coupons.noCoupons")}
                    </td>
                  </tr>
                ) : (
                  coupons.map((coupon) => (
                    <tr key={coupon.id}>
                      <td className="font-mono font-bold text-lg">
                        {coupon.code}
                      </td>
                      <td>
                        <span className="badge badge-info">
                          {coupon.percentage}%
                        </span>
                      </td>
                      <td>{getUserName(coupon.userId)}</td>
                      <td>
                        {coupon.expiresAt
                          ? new Date(coupon.expiresAt).toLocaleDateString()
                          : "-"}
                      </td>
                      <td>{getStatusBadge(coupon)}</td>
                      <td>
                        <div className="flex gap-2">
                          {!coupon.used && !coupon.usedAt && (
                            <button
                              onClick={() => handleEdit(coupon)}
                              className="btn btn-primary btn-sm"
                            >
                              {t("admin.coupons.edit")}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(coupon.id)}
                            className="btn btn-danger btn-sm"
                          >
                            {t("admin.coupons.delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="card coupon-modal">
            <h3 className="text-lg font-bold mb-4">
              {editingCoupon
                ? t("admin.coupons.editCoupon")
                : t("admin.coupons.createCoupon")}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  {t("admin.coupons.code")}
                  <span className="text-gray-500 text-xs ml-2">
                    ({t("admin.coupons.optional")})
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder={t("admin.coupons.codePlaceholder")}
                  className="input w-full border-2 border-gray-300 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-20"
                  maxLength={20}
                  disabled={!!editingCoupon}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t("admin.coupons.codeHint")}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  {t("admin.coupons.percentage")} *
                </label>
                <input
                  type="number"
                  value={formData.percentage}
                  onChange={(e) =>
                    setFormData({ ...formData, percentage: e.target.value })
                  }
                  placeholder="10"
                  className="input w-full border-2 border-gray-300 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-20"
                  min="1"
                  max="100"
                  step="0.1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t("admin.coupons.percentageHint")}
                </p>
              </div>

              <div className="relative" ref={userDropdownRef}>
                <label className="block text-xs font-medium mb-1">
                  {t("admin.coupons.user")}
                  <span className="text-gray-500 text-xs ml-2">
                    ({t("admin.coupons.optional")})
                  </span>
                </label>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setShowUserDropdown(true);
                    if (!e.target.value) {
                      setFormData({ ...formData, userId: "" });
                    }
                  }}
                  onFocus={() => setShowUserDropdown(true)}
                  placeholder={t("admin.coupons.userPlaceholder")}
                  className="input w-full border-2 border-gray-300 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-20"
                />
                {showUserDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-gray-500">
                        {t("admin.coupons.noUsersFound")}
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, userId: "" });
                            setUserSearch("");
                            setShowUserDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b"
                        >
                          {t("admin.coupons.allUsers")}
                        </button>
                        {filteredUsers.map((user) => (
                          <button
                            key={user.uid}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, userId: user.uid });
                              setUserSearch(
                                user.displayName || user.name || user.email
                              );
                              setShowUserDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0"
                          >
                            <div className="font-medium">
                              {user.displayName || user.name || "-"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  {t("admin.coupons.expiresAt")} *
                </label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) =>
                    setFormData({ ...formData, expiresAt: e.target.value })
                  }
                  className="input w-full border-2 border-gray-300 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-20"
                  required
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setEditingCoupon(null);
                    setError("");
                    setSuccess("");
                  }}
                  className="btn btn-secondary"
                >
                  {t("admin.coupons.cancel")}
                </button>
                <button type="submit" className="btn btn-cta">
                  {editingCoupon
                    ? t("admin.coupons.update")
                    : t("admin.coupons.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


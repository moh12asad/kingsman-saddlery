import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { auth } from "../lib/firebase";
import { 
  updatePassword, 
  updateEmail, 
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  linkWithCredential
} from "firebase/auth";
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaLock, FaShoppingBag } from "react-icons/fa";
import AuthRoute from "../components/AuthRoute";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  
  // Form states
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  const [profileData, setProfileData] = useState({
    displayName: "",
    email: "",
    phone: "",
    address: {
      street: "",
      city: "",
      zipCode: "",
      country: ""
    }
  });

  // Check if user signed in with Google (no password provider)
  const isGoogleUser = useMemo(() => {
    if (!user) return false;
    return user.providerData?.some(provider => provider.providerId === "google.com") && 
           !user.providerData?.some(provider => provider.providerId === "password");
  }, [user]);

  useEffect(() => {
    if (user) {
      // Load user profile data
      loadUserProfile();
      loadOrders();
    }
  }, [user]);

  async function loadUserProfile() {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      
      // Try to load user data from backend
      const res = await fetch(`${API}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setProfileData({
          displayName: data.displayName || user.displayName || "",
          email: data.email || user.email || "",
          phone: data.phone || "",
          address: data.address || {
            street: "",
            city: "",
            zipCode: "",
            country: ""
          }
        });
      } else {
        // Fallback to Firebase user data
        setProfileData({
          displayName: user.displayName || "",
          email: user.email || "",
          phone: "",
          address: {
            street: "",
            city: "",
            zipCode: "",
            country: ""
          }
        });
      }
    } catch (err) {
      console.error("Error loading profile:", err);
      // Fallback to Firebase user data
      setProfileData({
        displayName: user.displayName || "",
        email: user.email || "",
        phone: "",
        address: {
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: ""
        }
      });
    }
  }

  async function loadOrders() {
    try {
      setLoadingOrders(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      
      const res = await fetch(`${API}/api/orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Error loading orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  }

  async function handleCreatePassword() {
    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      if (isGoogleUser) {
        // For Google users, link email/password provider
        // Note: This requires the user to have signed in recently
        try {
          const credential = EmailAuthProvider.credential(
            user.email,
            passwordData.newPassword
          );
          await linkWithCredential(user, credential);
          setSuccess("Password created successfully! You can now sign in with email and password.");
        } catch (linkErr) {
          if (linkErr.code === "auth/credential-already-in-use") {
            // Password provider already exists, just update password
            const credential = EmailAuthProvider.credential(
              user.email,
              passwordData.newPassword
            );
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, passwordData.newPassword);
            setSuccess("Password updated successfully!");
          } else if (linkErr.code === "auth/requires-recent-login") {
            setError("For security, please sign out and sign in again, then try creating your password.");
          } else {
            throw linkErr;
          }
        }
      } else {
        // For existing password users, need to reauthenticate first
        if (!passwordData.currentPassword) {
          setError("Please enter your current password");
          return;
        }
        const credential = EmailAuthProvider.credential(
          user.email,
          passwordData.currentPassword
        );
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, passwordData.newPassword);
        setSuccess("Password updated successfully!");
      }

      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordForm(false);
    } catch (err) {
      console.error("Password creation error:", err);
      if (err.code === "auth/weak-password") {
        setError("Password is too weak. Please use a stronger password.");
      } else if (err.code === "auth/wrong-password") {
        setError("Current password is incorrect");
      } else if (err.code === "auth/requires-recent-login") {
        setError("Please sign out and sign in again before changing your password.");
      } else {
        setError(err.message || "Failed to create password");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateProfile() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      // Update Firebase profile
      await updateProfile(user, {
        displayName: profileData.displayName
      });

      // Update email if changed
      if (profileData.email !== user.email) {
        await updateEmail(user, profileData.email);
      }

      // Save additional data to backend
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        await fetch(`${API}/api/users/me`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            displayName: profileData.displayName,
            email: profileData.email,
            phone: profileData.phone,
            address: profileData.address
          })
        });
      }

      setSuccess("Profile updated successfully!");
    } catch (err) {
      console.error("Profile update error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("Email is already in use by another account");
      } else if (err.code === "auth/requires-recent-login") {
        setError("Please sign out and sign in again before updating your email.");
      } else {
        setError(err.message || "Failed to update profile");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthRoute>
      <main className="page-with-navbar">
        <div className="container-main padding-y-xl">
          <h1 className="heading-1 margin-bottom-lg">My Profile</h1>

          {error && (
            <div className="card padding-md margin-bottom-md" style={{ background: "#fee2e2", borderColor: "#ef4444" }}>
              <p className="text-error">{error}</p>
            </div>
          )}

          {success && (
            <div className="card padding-md margin-bottom-md" style={{ background: "#dcfce7", borderColor: "#22c55e" }}>
              <p style={{ color: "#16a34a" }}>{success}</p>
            </div>
          )}

          {/* Profile Information Section */}
          <div className="card padding-lg margin-bottom-lg">
            <h2 className="section-title flex-row flex-gap-sm">
              <FaUser />
              Profile Information
            </h2>
            
            <div className="grid-form margin-top-md">
              <div>
                <label className="text-sm font-medium margin-bottom-sm">Display Name</label>
                <input
                  type="text"
                  className="input"
                  value={profileData.displayName}
                  onChange={e => setProfileData({ ...profileData, displayName: e.target.value })}
                  placeholder="Your name"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium margin-bottom-sm flex-row flex-gap-sm">
                  <FaEnvelope />
                  Email
                </label>
                <input
                  type="email"
                  className="input"
                  value={profileData.email}
                  onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="text-sm font-medium margin-bottom-sm flex-row flex-gap-sm">
                  <FaPhone />
                  Phone Number
                </label>
                <input
                  type="tel"
                  className="input"
                  value={profileData.phone}
                  onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="05XXXXXXXX"
                />
              </div>
            </div>

            <div className="margin-top-md">
              <label className="text-sm font-medium margin-bottom-sm flex-row flex-gap-sm">
                <FaMapMarkerAlt />
                Address
              </label>
              <div className="grid-form margin-top-sm">
                <div className="grid-col-span-full">
                  <input
                    type="text"
                    className="input"
                    value={profileData.address.street}
                    onChange={e => setProfileData({
                      ...profileData,
                      address: { ...profileData.address, street: e.target.value }
                    })}
                    placeholder="Street Address"
                  />
                </div>
                <input
                  type="text"
                  className="input"
                  value={profileData.address.city}
                  onChange={e => setProfileData({
                    ...profileData,
                    address: { ...profileData.address, city: e.target.value }
                  })}
                  placeholder="City"
                />
                <input
                  type="text"
                  className="input"
                  value={profileData.address.zipCode}
                  onChange={e => setProfileData({
                    ...profileData,
                    address: { ...profileData.address, zipCode: e.target.value }
                  })}
                  placeholder="ZIP/Postal Code"
                />
                <input
                  type="text"
                  className="input"
                  value={profileData.address.country}
                  onChange={e => setProfileData({
                    ...profileData,
                    address: { ...profileData.address, country: e.target.value }
                  })}
                  placeholder="Country"
                />
              </div>
            </div>

            <button
              className="btn-primary margin-top-md"
              onClick={handleUpdateProfile}
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Profile"}
            </button>
          </div>

          {/* Password Section */}
          <div className="card padding-lg margin-bottom-lg">
            <h2 className="section-title flex-row flex-gap-sm">
              <FaLock />
              Password
            </h2>
            
            {isGoogleUser && !showPasswordForm && (
              <div className="margin-top-md">
                <p className="text-muted margin-bottom-md">
                  You signed in with Google. Create a password to enable email/password sign-in.
                </p>
                <button
                  className="btn-secondary"
                  onClick={() => setShowPasswordForm(true)}
                >
                  Create Password
                </button>
              </div>
            )}

            {(!isGoogleUser || showPasswordForm) && (
              <div className="grid-form margin-top-md">
                {!isGoogleUser && (
                  <div>
                    <label className="text-sm font-medium margin-bottom-sm">Current Password</label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        className="input"
                        style={{ paddingRight: "5rem" }}
                        value={passwordData.currentPassword}
                        onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600 hover:text-gray-800 transition"
                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      >
                        {showPasswords.current ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium margin-bottom-sm">New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? "text" : "password"}
                      className="input"
                      style={{ paddingRight: "5rem" }}
                      value={passwordData.newPassword}
                      onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600 hover:text-gray-800 transition"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    >
                      {showPasswords.new ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium margin-bottom-sm">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? "text" : "password"}
                      className="input"
                      style={{ paddingRight: "5rem" }}
                      value={passwordData.confirmPassword}
                      onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600 hover:text-gray-800 transition"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    >
                      {showPasswords.confirm ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(!isGoogleUser || showPasswordForm) && (
              <div className="flex-row flex-gap-md margin-top-md">
                <button
                  className="btn-primary"
                  onClick={handleCreatePassword}
                  disabled={loading}
                >
                  {loading ? "Updating..." : isGoogleUser ? "Create Password" : "Update Password"}
                </button>
                {isGoogleUser && showPasswordForm && (
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                      setShowPasswords({ current: false, new: false, confirm: false });
                      setError("");
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Orders Section */}
          <div className="card padding-lg">
            <h2 className="section-title flex-row flex-gap-sm">
              <FaShoppingBag />
              My Orders ({orders.length})
            </h2>

            {loadingOrders ? (
              <div className="text-center padding-y-lg">
                <div className="loading-spinner mx-auto"></div>
                <p className="margin-top-md text-muted">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="card-empty margin-top-md">
                <p className="text-muted">You haven't placed any orders yet.</p>
              </div>
            ) : (
              <div className="margin-top-md">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Items</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id}>
                        <td className="font-mono text-xs">{order.id.substring(0, 8)}...</td>
                        <td>
                          {order.createdAt 
                            ? new Date(order.createdAt).toLocaleDateString()
                            : "-"}
                        </td>
                        <td>
                          <span className={`badge ${
                            order.status === "completed" ? "badge-success" :
                            order.status === "pending" ? "badge-warning" :
                            "badge-danger"
                          }`}>
                            {order.status || "pending"}
                          </span>
                        </td>
                        <td>
                          <ul className="text-sm">
                            {(order.items || []).slice(0, 2).map((item, idx) => (
                              <li key={idx}>{item.quantity} × {item.name}</li>
                            ))}
                            {(order.items || []).length > 2 && (
                              <li className="text-muted">+{(order.items || []).length - 2} more</li>
                            )}
                          </ul>
                        </td>
                        <td className="font-semibold">${Number(order.total || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </AuthRoute>
  );
}


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
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaLock, FaCalendarAlt, FaEdit, FaCheck, FaTimes } from "react-icons/fa";
import AuthRoute from "../components/AuthRoute";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [originalProfileData, setOriginalProfileData] = useState(null);
  
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
  const [createdAt, setCreatedAt] = useState(null);

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
        const loadedData = {
          displayName: data.displayName || user.displayName || "",
          email: data.email || user.email || "",
          phone: data.phone || "",
          address: data.address || {
            street: "",
            city: "",
            zipCode: "",
            country: ""
          }
        };
        setProfileData(loadedData);
        setOriginalProfileData(JSON.parse(JSON.stringify(loadedData)));
        // Store creation date if available
        // Handle both ISO string and Firestore timestamp formats
        if (data.createdAt) {
          // If it's already a string (ISO), use it directly
          if (typeof data.createdAt === 'string') {
            setCreatedAt(data.createdAt);
          } else if (data.createdAt._seconds) {
            // Firestore timestamp format with _seconds (serialized JSON)
            setCreatedAt(new Date(data.createdAt._seconds * 1000).toISOString());
          } else if (data.createdAt.seconds) {
            // Firestore timestamp format with seconds
            setCreatedAt(new Date(data.createdAt.seconds * 1000).toISOString());
          } else if (data.createdAt.toDate) {
            // Firestore Timestamp object (if not serialized)
            setCreatedAt(data.createdAt.toDate().toISOString());
          } else {
            // Try to parse as date string
            const parsed = new Date(data.createdAt);
            if (!isNaN(parsed.getTime())) {
              setCreatedAt(parsed.toISOString());
            } else {
              console.warn("Could not parse createdAt:", data.createdAt);
              setCreatedAt(null);
            }
          }
        } else if (user.metadata?.creationTime) {
          // Fallback to Firebase Auth creation time
          setCreatedAt(user.metadata.creationTime);
        } else {
          // No creation date available
          setCreatedAt(null);
        }
      } else {
        // Fallback to Firebase user data
        const fallbackData = {
          displayName: user.displayName || "",
          email: user.email || "",
          phone: "",
          address: {
            street: "",
            city: "",
            zipCode: "",
            country: ""
          }
        };
        setProfileData(fallbackData);
        setOriginalProfileData(JSON.parse(JSON.stringify(fallbackData)));
        // Try to get creation time from Firebase Auth
        if (user.metadata?.creationTime) {
          setCreatedAt(user.metadata.creationTime);
        } else {
          setCreatedAt(null);
        }
      }
    } catch (err) {
      console.error("Error loading profile:", err);
      // Fallback to Firebase user data
      const fallbackData = {
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
      };
      setProfileData(fallbackData);
      setOriginalProfileData(JSON.parse(JSON.stringify(fallbackData)));
      // Try to get creation time from Firebase Auth
      if (user.metadata?.creationTime) {
        setCreatedAt(user.metadata.creationTime);
      } else {
        setCreatedAt(null);
      }
    }
  }

  async function handleCreatePassword() {
    // Clear previous errors
    setError("");
    
    // Trim passwords for validation
    const trimmedNewPassword = passwordData.newPassword ? passwordData.newPassword.trim() : "";
    const trimmedConfirmPassword = passwordData.confirmPassword ? passwordData.confirmPassword.trim() : "";
    const trimmedCurrentPassword = passwordData.currentPassword ? passwordData.currentPassword.trim() : "";
    
    // Password requirements: 6-12 characters with at least one letter
    if (!trimmedNewPassword) {
      setError("Password: Please enter a new password");
      return;
    }

    if (trimmedNewPassword.length < 6) {
      setError("Password: Password must be at least 6 characters long");
      return;
    }

    if (trimmedNewPassword.length > 12) {
      setError("Password: Password must be no more than 12 characters long");
      return;
    }

    if (!/[a-zA-Z]/.test(trimmedNewPassword)) {
      setError("Password: Password must contain at least one letter");
      return;
    }

    if (trimmedNewPassword !== trimmedConfirmPassword) {
      setError("Password: Passwords do not match");
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
            trimmedNewPassword
          );
          await linkWithCredential(user, credential);
          setSuccess("Password: Password created successfully! You can now sign in with email and password.");
        } catch (linkErr) {
          if (linkErr.code === "auth/credential-already-in-use") {
            // Password provider already exists, just update password
            const credential = EmailAuthProvider.credential(
              user.email,
              trimmedNewPassword
            );
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, trimmedNewPassword);
            setSuccess("Password: Password updated successfully!");
          } else if (linkErr.code === "auth/requires-recent-login") {
            setError("Password: For security, please sign out and sign in again, then try creating your password.");
            return; // Return early to prevent clearing the error
          } else {
            throw linkErr;
          }
        }
      } else {
        // For existing password users, need to reauthenticate first
        if (!trimmedCurrentPassword) {
          setError("Password: Please enter your current password");
          return;
        }
        const credential = EmailAuthProvider.credential(
          user.email,
          trimmedCurrentPassword
        );
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, trimmedNewPassword);
        setSuccess("Password: Password updated successfully!");
      }

      // Only clear error and reset form on actual success
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordForm(false);
      setError(""); // Clear error on success
    } catch (err) {
      console.error("Password creation error:", err);
      let errorMessage = "";
      if (err.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password.";
      } else if (err.code === "auth/wrong-password") {
        errorMessage = "Current password is incorrect";
      } else if (err.code === "auth/requires-recent-login") {
        errorMessage = "Please sign out and sign in again before changing your password.";
      } else {
        errorMessage = err.message || "Failed to create password";
      }
      setError(`Password: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }

  function handleStartEdit() {
    setOriginalProfileData(JSON.parse(JSON.stringify(profileData)));
    setIsEditing(true);
    setError("");
    setSuccess("");
  }

  function handleCancelEdit() {
    if (originalProfileData) {
      setProfileData(JSON.parse(JSON.stringify(originalProfileData)));
    }
    setIsEditing(false);
    setError("");
    setSuccess("");
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

      // Update original data to match current state
      setOriginalProfileData(JSON.parse(JSON.stringify(profileData)));
      setIsEditing(false);
      setSuccess("Profile updated successfully!");
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess("");
      }, 5000);
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

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date string:", dateString);
        return "N/A";
      }
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    } catch (err) {
      console.error("Error formatting date:", err, dateString);
      return "N/A";
    }
  }

  return (
    <AuthRoute>
      <main className="page-with-navbar">
        <div className="container-main padding-y-xl">
          <h1 className="heading-1 margin-bottom-lg">My Profile</h1>

          {error && !error.includes("Password") && (
            <div className="card card-error padding-md margin-bottom-md">
              <p className="text-error">{error}</p>
            </div>
          )}

          {success && !success.includes("Password") && (
            <div className="card card-success padding-md margin-bottom-md">
              <p className="text-success">{success}</p>
            </div>
          )}

          {/* Profile Information Section */}
          <div className="card padding-lg margin-bottom-lg">
            <h2 className="section-title flex-row flex-gap-sm margin-bottom-md">
              <FaUser />
              Profile Information
            </h2>
            
            <div className="grid-form margin-top-md">
              <div>
                <label className="text-sm font-medium margin-bottom-sm">Display Name</label>
                <input
                  type="text"
                  value={profileData.displayName}
                  onChange={e => setProfileData({ ...profileData, displayName: e.target.value })}
                  placeholder="Your name"
                  disabled={!isEditing}
                  readOnly={!isEditing}
                  className={!isEditing ? "input input-disabled" : "input"}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium margin-bottom-sm flex-row flex-gap-sm">
                  <FaEnvelope />
                  Email
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                  placeholder="your@email.com"
                  disabled={!isEditing}
                  readOnly={!isEditing}
                  className={!isEditing ? "input input-disabled" : "input"}
                />
              </div>

              <div>
                <label className="text-sm font-medium margin-bottom-sm flex-row flex-gap-sm">
                  <FaPhone />
                  Phone Number
                </label>
                <input
                  type="tel"
                  className={!isEditing ? "input input-disabled" : "input"}
                  value={profileData.phone}
                  onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="05XXXXXXXX"
                  disabled={!isEditing}
                  readOnly={!isEditing}
                />
              </div>

              {createdAt && (
                <div>
                  <label className="text-sm font-medium margin-bottom-sm flex-row flex-gap-sm">
                    <FaCalendarAlt />
                    Member Since
                  </label>
                  <input
                    type="text"
                    value={formatDate(createdAt)}
                    disabled
                    readOnly
                    className="input input-disabled"
                  />
                  <p className="text-xs text-muted margin-top-xs">Account creation date</p>
                </div>
              )}
            </div>

            <div className="margin-top-md">
              <label className="text-sm font-medium margin-bottom-sm flex-row flex-gap-sm">
                <FaMapMarkerAlt />
                Address
              </label>
              <div className="grid-form margin-top-sm">
                <div className="grid-col-span-full">
                  <label className="text-sm font-medium margin-bottom-sm">Street Address</label>
                  <input
                    type="text"
                    className="input"
                    value={profileData.address.street}
                    onChange={e => setProfileData({
                      ...profileData,
                      address: { ...profileData.address, street: e.target.value }
                    })}
                    placeholder="Street Address"
                    disabled={!isEditing}
                    readOnly={!isEditing}
                    style={!isEditing ? { background: '#f9fafb', cursor: 'not-allowed' } : {}}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium margin-bottom-sm">City</label>
                  <input
                    type="text"
                    className="input"
                    value={profileData.address.city}
                    onChange={e => setProfileData({
                      ...profileData,
                      address: { ...profileData.address, city: e.target.value }
                    })}
                    placeholder="City"
                    disabled={!isEditing}
                    readOnly={!isEditing}
                    style={!isEditing ? { background: '#f9fafb', cursor: 'not-allowed' } : {}}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium margin-bottom-sm">ZIP/Postal Code</label>
                  <input
                    type="text"
                    className="input"
                    value={profileData.address.zipCode}
                    onChange={e => setProfileData({
                      ...profileData,
                      address: { ...profileData.address, zipCode: e.target.value }
                    })}
                    placeholder="ZIP/Postal Code"
                    disabled={!isEditing}
                    readOnly={!isEditing}
                    style={!isEditing ? { background: '#f9fafb', cursor: 'not-allowed' } : {}}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium margin-bottom-sm">Country</label>
                  <input
                    type="text"
                    className="input"
                    value={profileData.address.country}
                    onChange={e => setProfileData({
                      ...profileData,
                      address: { ...profileData.address, country: e.target.value }
                    })}
                    placeholder="Country"
                    disabled={!isEditing}
                    readOnly={!isEditing}
                    style={!isEditing ? { background: '#f9fafb', cursor: 'not-allowed' } : {}}
                  />
                </div>
              </div>
            </div>

            <div className="flex-row flex-gap-md margin-top-md">
              {isEditing ? (
                <>
                  <button
                    className="btn-primary flex-row flex-gap-sm"
                    onClick={handleUpdateProfile}
                    disabled={loading}
                  >
                    <FaCheck />
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    className="btn-secondary flex-row flex-gap-sm"
                    onClick={handleCancelEdit}
                    disabled={loading}
                  >
                    <FaTimes />
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  className="btn-secondary flex-row flex-gap-sm"
                  onClick={handleStartEdit}
                >
                  <FaEdit />
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Password Section */}
          <div className="card padding-lg margin-bottom-lg">
            <h2 className="section-title flex-row flex-gap-sm">
              <FaLock />
              Password
            </h2>
            
            {/* Password validation errors - shown above password section */}
            {error && error.includes("Password") && (
              <div className="card card-error padding-md margin-top-md margin-bottom-md">
                <p className="text-error">{error}</p>
              </div>
            )}
            
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
                        className="input input-with-action"
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
                  <label className="text-sm font-medium margin-bottom-sm">
                    New Password
                    <span className="text-xs text-muted label-with-help">
                      (6-12 characters, must include at least one letter)
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? "text" : "password"}
                      className="input input-with-action"
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
                      className="input input-with-action"
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

            {/* Password success messages - shown under password section */}
            {success && success.includes("Password:") && (
              <div className="card card-success padding-md margin-top-md">
                <p className="text-success">{success.replace("Password: ", "")}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </AuthRoute>
  );
}


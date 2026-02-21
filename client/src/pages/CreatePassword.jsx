import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../lib/firebase";
import { 
  EmailAuthProvider,
  linkWithCredential
} from "firebase/auth";
import { FaLock, FaSpinner } from "react-icons/fa";
import AuthRoute from "../components/AuthRoute";
import { checkProfileComplete } from "../utils/checkProfileComplete";
import { isPrivateRelayEmail } from "../utils/isPrivateRelayEmail";

export default function CreatePassword() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [checkingProfile, setCheckingProfile] = useState(true);
  
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: ""
  });

  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false
  });

  // Check if user signed in with Google or Apple (no password provider)
  const isOAuthUser = useMemo(() => {
    if (!user) return false;
    const hasOAuthProvider = user.providerData?.some(provider => 
      provider.providerId === "google.com" || provider.providerId === "apple.com"
    );
    const hasPasswordProvider = user.providerData?.some(provider => provider.providerId === "password");
    return hasOAuthProvider && !hasPasswordProvider;
  }, [user]);

  // Check if user already has password or profile is complete
  useEffect(() => {
    if (authLoading || !user) return;
    
    (async () => {
      try {
        // If user already has password, check if profile is complete
        const hasPassword = user.providerData?.some(provider => provider.providerId === "password");
        
        if (hasPassword) {
          // User has password, check if profile is complete
          const isComplete = await checkProfileComplete(user);
          if (isComplete) {
            navigate("/", { replace: true });
            return;
          } else {
            // Profile not complete, redirect to complete profile
            navigate("/complete-profile", { replace: true });
            return;
          }
        }
        
        // User doesn't have password and is OAuth user - stay on this page
        if (!isOAuthUser) {
          // Not an OAuth user without password - shouldn't be here
          navigate("/", { replace: true });
          return;
        }

        // Apple users with private relay email must provide real email first
        const isApple = user.providerData?.some((p) => p.providerId === "apple.com");
        if (isApple && isPrivateRelayEmail(user.email)) {
          navigate("/apple-email-required", { replace: true });
          return;
        }
        
        setCheckingProfile(false);
      } catch (err) {
        console.error("Error checking profile:", err);
        setCheckingProfile(false);
      }
    })();
  }, [user, authLoading, navigate, isOAuthUser]);

  // Handle password creation
  async function handleCreatePassword(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    // Trim passwords for validation
    const trimmedNewPassword = passwordData.newPassword ? passwordData.newPassword.trim() : "";
    const trimmedConfirmPassword = passwordData.confirmPassword ? passwordData.confirmPassword.trim() : "";
    
    // Password requirements: 6-12 characters with at least one letter
    if (!trimmedNewPassword) {
      setError("Please enter a new password");
      return;
    }

    if (trimmedNewPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (trimmedNewPassword.length > 12) {
      setError("Password must be no more than 12 characters long");
      return;
    }

    if (!/[a-zA-Z]/.test(trimmedNewPassword)) {
      setError("Password must contain at least one letter");
      return;
    }

    if (trimmedNewPassword !== trimmedConfirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      setError("");

      if (isOAuthUser) {
        // For Google or Apple users, link email/password provider
        const credential = EmailAuthProvider.credential(
          user.email,
          trimmedNewPassword
        );
        await linkWithCredential(user, credential);
        setSuccess("Password created successfully! Redirecting to complete your profile...");
        
        // Wait a moment to show success message, then redirect
        setTimeout(() => {
          navigate("/complete-profile", { replace: true });
        }, 1500);
      } else {
        setError("You already have a password. Please use the Profile page to update it.");
      }
    } catch (err) {
      console.error("Password creation error:", err);
      let errorMessage = "";
      if (err.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password.";
      } else if (err.code === "auth/requires-recent-login") {
        errorMessage = "For security, please sign out and sign in again, then try creating your password.";
      } else {
        errorMessage = err.message || "Failed to create password";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  if (checkingProfile || authLoading) {
    return (
      <AuthRoute>
        <main className="page-with-navbar">
          <div className="container-main padding-y-xl">
            <div className="max-w-2xl mx-auto">
              <div className="flex-row flex-items-center flex-gap-md" style={{ justifyContent: "center", padding: "2rem" }}>
                <FaSpinner className="animate-spin" />
                <span>Loading...</span>
              </div>
            </div>
          </div>
        </main>
      </AuthRoute>
    );
  }

  // If not OAuth user, shouldn't be here (will be redirected)
  if (!isOAuthUser) {
    return null;
  }

  return (
    <AuthRoute>
      <main className="page-with-navbar">
        <div className="container-main padding-y-xl">
          <div className="max-w-2xl mx-auto">
            <h1 className="heading-1 margin-bottom-md">Create Your Password</h1>
            <p className="text-muted margin-bottom-lg">
              Since you signed in with {user.providerData?.some(p => p.providerId === "apple.com") ? "Apple" : "Google"}, 
              please create a password to secure your account. You'll complete your profile information next.
            </p>

            {error && (
              <div className="card card-error padding-md margin-bottom-md">
                <p className="text-error">{error}</p>
              </div>
            )}

            {success && (
              <div className="card card-success padding-md margin-bottom-md">
                <p className="text-success">{success}</p>
              </div>
            )}

            <form onSubmit={handleCreatePassword} className="card padding-lg">
              <div className="margin-bottom-md">
                <div className="margin-bottom-sm">
                  <label className="text-sm font-medium">
                    Password Requirements
                  </label>
                  <p className="text-xs text-muted label-help-text">
                    6-12 characters, must include at least one letter
                  </p>
                </div>
                <div className="grid-form">
                  <div>
                    <label className="text-sm font-medium margin-bottom-sm">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        className="input input-with-action"
                        value={passwordData.newPassword}
                        onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        placeholder="Enter new password"
                        required
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
                        required
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
              </div>

              <button
                type="submit"
                className="btn-primary margin-top-md"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" style={{ marginRight: "0.5rem" }} />
                    Creating...
                  </>
                ) : (
                  <>
                    <FaLock style={{ marginRight: "0.5rem" }} />
                    Create Password
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </AuthRoute>
  );
}


// src/pages/SignIn.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, signInWithGoogle, signInWithApple } from "../lib/firebase";
import { FcGoogle } from "react-icons/fc";
import { FaApple } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext"; // assumes you expose user + loading
import { resolveRole } from "../utils/resolveRole";
import { checkProfileComplete } from "../utils/checkProfileComplete";

export default function SignIn() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get("redirect") || null;
    const hasRedirected = useRef(false); // Prevent multiple redirects
    const { t } = useTranslation();

    const { user, loading: authLoading } = useAuth?.() ?? { user: null, loading: false };

    // Helper function to handle post-sign-in redirect
    const handlePostSignInRedirect = useCallback(async (userToCheck) => {
        if (!userToCheck || hasRedirected.current) return;
        
        try {
            console.log("Checking redirect for user:", userToCheck.email);
            
            // Check if there's a redirect parameter
            if (redirectTo) {
                hasRedirected.current = true;
                navigate(redirectTo, { replace: true });
                return;
            }

            const role = await resolveRole(userToCheck);
            console.log("User role:", role);
            
            // Admins skip profile completion
            if (role === "admin") {
                hasRedirected.current = true;
                navigate("/admin", { replace: true });
                return;
            }

            // For regular users, check if profile is complete
            console.log("Checking profile completion...");
            const isProfileComplete = await checkProfileComplete(userToCheck);
            console.log("Profile complete:", isProfileComplete);
            
            if (!isProfileComplete) {
                hasRedirected.current = true;
                navigate("/complete-profile", { replace: true });
                return;
            }

            // Profile is complete, go to home
            hasRedirected.current = true;
            navigate("/", { replace: true });
        } catch (e) {
            console.error("Post-sign-in redirect failed:", e);
            hasRedirected.current = true;
            navigate(redirectTo || "/", { replace: true });
        }
    }, [navigate, redirectTo]);

    // If already signed in, redirect appropriately
    useEffect(() => {
        if (authLoading || !user || hasRedirected.current) return;
        
        // Small delay to ensure user document is created in backend
        const timer = setTimeout(() => {
            handlePostSignInRedirect(user);
        }, 300);
        
        return () => clearTimeout(timer);
    }, [user, authLoading, handlePostSignInRedirect]);

    async function onSubmit(e) {
        e.preventDefault();
        setErr(""); setLoading(true);
        hasRedirected.current = false; // Reset redirect flag
        try {
            await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
            // Redirect will be handled by the useEffect hook when user state updates
        } catch (e) {
            const code = e.code || "";
            let errorMessage = e.message || t("signIn.errors.failed");
            
            if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
                errorMessage = t("signIn.errors.invalidCredentials");
            } else if (code === "auth/user-not-found") {
                errorMessage = t("signIn.errors.userNotFound");
            } else if (code === "auth/too-many-requests") {
                errorMessage = t("signIn.errors.tooManyRequests");
            } else if (code === "auth/configuration-not-found" || errorMessage.includes("CONFIGURATION_NOT_FOUND")) {
                errorMessage = "Firebase project configuration not found. Please check your .env file and ensure the Firebase project exists and Authentication is enabled.";
            } else if (code === "auth/network-request-failed") {
                errorMessage = t("signIn.errors.networkError");
            }
            
            console.error("Sign-in error:", code, errorMessage);
            setErr(errorMessage);
        } finally {
            setLoading(false);
        }
    }

    async function onGoogle() {
        setErr(""); setLoading(true);
        hasRedirected.current = false; // Reset redirect flag
        try {
            await signInWithGoogle(); // must return a UserCredential
            // Redirect will be handled by the useEffect hook when user state updates
        } catch (e) {
            const code = e.code || "";
            let errorMessage = e.message || t("signIn.errors.failed");
            
            // Handle specific Firebase configuration errors
            if (code === "auth/configuration-not-found" || errorMessage.includes("CONFIGURATION_NOT_FOUND")) {
                errorMessage = "Firebase Authentication configuration not found. This usually means:\n\n1. ❌ Your API key doesn't match the project ID\n   → Check that VITE_FIREBASE_API_KEY belongs to the 'kingsman-saddlery' project\n\n2. ❌ Authentication is not enabled in Firebase Console\n   → Go to Firebase Console → Authentication → Get Started\n\n3. ❌ API key restrictions in Google Cloud Console\n   → Check Google Cloud Console → APIs & Services → Credentials\n\n4. ❌ Wrong project configuration\n   → Make sure ALL .env values are from the SAME Firebase project\n\nTo fix: Get a fresh config from Firebase Console → Project Settings → General → Your apps";
            } else if (code === "auth/popup-closed-by-user") {
                errorMessage = t("signIn.errors.popupClosed");
            } else if (code === "auth/popup-blocked") {
                errorMessage = t("signIn.errors.popupBlocked");
            } else if (code === "auth/cancelled-popup-request") {
                errorMessage = t("signIn.errors.popupCancelled");
            }
            
            console.error("Sign-in error:", code, errorMessage);
            setErr(errorMessage);
        } finally {
            setLoading(false);
        }
    }

    async function onApple() {
        setErr(""); setLoading(true);
        hasRedirected.current = false; // Reset redirect flag
        try {
            await signInWithApple(); // must return a UserCredential
            // Redirect will be handled by the useEffect hook when user state updates
        } catch (e) {
            const code = e.code || "";
            let errorMessage = e.message || t("signIn.errors.failed");
            
            // Handle specific Firebase configuration errors
            if (code === "auth/configuration-not-found" || errorMessage.includes("CONFIGURATION_NOT_FOUND")) {
                errorMessage = "Firebase Authentication configuration not found. This usually means:\n\n1. ❌ Your API key doesn't match the project ID\n   → Check that VITE_FIREBASE_API_KEY belongs to the 'kingsman-saddlery' project\n\n2. ❌ Authentication is not enabled in Firebase Console\n   → Go to Firebase Console → Authentication → Get Started\n\n3. ❌ API key restrictions in Google Cloud Console\n   → Check Google Cloud Console → APIs & Services → Credentials\n\n4. ❌ Wrong project configuration\n   → Make sure ALL .env values are from the SAME Firebase project\n\nTo fix: Get a fresh config from Firebase Console → Project Settings → General → Your apps";
            } else if (code === "auth/popup-closed-by-user") {
                errorMessage = t("signIn.errors.popupClosed");
            } else if (code === "auth/popup-blocked") {
                errorMessage = t("signIn.errors.popupBlocked");
            } else if (code === "auth/cancelled-popup-request") {
                errorMessage = t("signIn.errors.popupCancelled");
            }
            
            console.error("Sign-in error:", code, errorMessage);
            setErr(errorMessage);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-md mx-auto px-4 py-12 signin-page-container">
            <h1 className="text-2xl font-bold mb-6">{t("signIn.title")}</h1>

            <form onSubmit={onSubmit} className="space-y-4">
                <input
                    type="email"
                    className="w-full p-2 border rounded-lg"
                    placeholder={t("signIn.emailPlaceholder")}
                    value={email}
                    onChange={e=>setEmail(e.target.value)}
                    required
                />
                <div className="relative">
                    <input
                        type={show ? "text" : "password"}
                        className="w-full p-2 border rounded-lg pr-20"
                        placeholder={t("signIn.passwordPlaceholder")}
                        value={password}
                        onChange={e=>setPassword(e.target.value)}
                        required
                    />
                    <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600"
                        onClick={()=>setShow(s=>!s)}
                    >
                        {show ? t("common.hide") : t("common.show")}
                    </button>
                </div>

                <button
                    className="w-full px-4 py-2 rounded-lg disabled:opacity-60 transition-all font-bold"
                    style={{ 
                        background: loading ? '#f0f0f0' : '#ffffff',
                        border: '2px solid #000000',
                        color: '#000000'
                    }}
                    onMouseEnter={(e) => {
                        if (!loading) {
                            e.target.style.color = 'var(--brand)';
                            e.target.style.borderColor = 'var(--brand)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!loading) {
                            e.target.style.color = '#000000';
                            e.target.style.borderColor = '#000000';
                        }
                    }}
                    disabled={loading}
                >
                    {loading ? t("signIn.signingIn") : t("signIn.signInButton")}
                </button>
            </form>

            {err && <p className="mt-4 text-red-600">{err}</p>}

            <div className="default-margin-text">
                <div>
                    <button
                        onClick={onGoogle}
                        className="margin-text--google-button flex items-center justify-center gap-3 w-full border border-gray-300 rounded-md bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 active:bg-gray-100 focus:outline-none transition"
                        style={{ 
                            '--tw-ring-color': 'var(--brand)',
                        }}
                        onFocus={(e) => {
                            e.target.style.boxShadow = '0 0 0 2px var(--brand)';
                        }}
                        onBlur={(e) => {
                            e.target.style.boxShadow = '';
                        }}
                        disabled={loading}
                    >
                        <FcGoogle className="text-xl" />
                        <span>{t("signIn.continueWithGoogle")}</span>
                    </button>
                </div>
                <div className="mt-3">
                    <button
                        onClick={onApple}
                        className="flex items-center justify-center gap-3 w-full border border-gray-300 rounded-md bg-black px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-gray-900 active:bg-gray-800 focus:outline-none transition"
                        style={{ 
                            '--tw-ring-color': 'var(--brand)',
                        }}
                        onFocus={(e) => {
                            e.target.style.boxShadow = '0 0 0 2px var(--brand)';
                        }}
                        onBlur={(e) => {
                            e.target.style.boxShadow = '';
                        }}
                        disabled={loading}
                    >
                        <FaApple className="text-xl" />
                        <span>{t("signIn.continueWithApple")}</span>
                    </button>
                </div>
                <div className="mt-4 text-sm">
                    <Link to="/forgot-password" style={{ color: 'var(--brand)' }} className="hover:underline">
                        {t("signIn.forgotPassword")}
                    </Link>
                </div>
                <div className="mt-4 text-center">
                    <p className="text-sm text-muted">
                        {t("signIn.noAccount")}{" "}
                        <Link to="/signup" className="link-brand">
                            {t("signIn.signUp")}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
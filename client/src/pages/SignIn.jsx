// src/pages/SignIn.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, signInWithGoogle } from "../lib/firebase";
import { FcGoogle } from "react-icons/fc";
import { useAuth } from "../context/AuthContext"; // assumes you expose user + loading
import { resolveRole } from "../utils/resolveRole";

export default function SignIn() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectTo = searchParams.get("redirect") || null;

    const { user, loading: authLoading } = useAuth?.() ?? { user: null, loading: false };

    // If already signed in, redirect appropriately
    useEffect(() => {
        if (authLoading || !user) return;

        (async () => {
            try {
                // Check if there's a redirect parameter
                if (redirectTo) {
                    navigate(redirectTo, { replace: true });
                    return;
                }

                const role = await resolveRole(user);// "admin" | "owner" | null
                console.log("role: ",role)
                if (role === "admin") {
                    navigate("/admin", { replace: true });
                } else if (role === "owner") {
                    navigate("/owner", { replace: true });
                } else {
                    // unknown role -> send home or show a helpful message
                    navigate("/", { replace: true });
                }
            } catch (e) {
                console.error("resolveRole failed:", e);
                navigate(redirectTo || "/", { replace: true });
            }
        })();
    }, [user, authLoading, navigate, redirectTo]);

    async function onSubmit(e) {
        e.preventDefault();
        setErr(""); setLoading(true);
        try {
            const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
            //await redirectByRole(cred.user);
        } catch (e) {
            const code = e.code || "";
            let errorMessage = e.message || "Sign-in failed.";
            
            if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
                errorMessage = "Incorrect email or password.";
            } else if (code === "auth/user-not-found") {
                errorMessage = "No account for this email.";
            } else if (code === "auth/too-many-requests") {
                errorMessage = "Too many attempts. Try again later.";
            } else if (code === "auth/configuration-not-found" || errorMessage.includes("CONFIGURATION_NOT_FOUND")) {
                errorMessage = "Firebase project configuration not found. Please check your .env file and ensure the Firebase project exists and Authentication is enabled.";
            } else if (code === "auth/network-request-failed") {
                errorMessage = "Network error. Please check your internet connection.";
            }
            
            console.error("Sign-in error:", code, errorMessage);
            setErr(errorMessage);
        } finally {
            setLoading(false);
        }
    }

    async function onGoogle() {
        setErr(""); setLoading(true);
        try {
            const cred = await signInWithGoogle(); // must return a UserCredential
            //await redirectByRole(cred.user);
        } catch (e) {
            const code = e.code || "";
            let errorMessage = e.message || "Google sign-in failed.";
            
            // Handle specific Firebase configuration errors
            if (code === "auth/configuration-not-found" || errorMessage.includes("CONFIGURATION_NOT_FOUND")) {
                errorMessage = "Firebase Authentication configuration not found. This usually means:\n\n1. ❌ Your API key doesn't match the project ID\n   → Check that VITE_FIREBASE_API_KEY belongs to the 'kingsman-saddlery' project\n\n2. ❌ Authentication is not enabled in Firebase Console\n   → Go to Firebase Console → Authentication → Get Started\n\n3. ❌ API key restrictions in Google Cloud Console\n   → Check Google Cloud Console → APIs & Services → Credentials\n\n4. ❌ Wrong project configuration\n   → Make sure ALL .env values are from the SAME Firebase project\n\nTo fix: Get a fresh config from Firebase Console → Project Settings → General → Your apps";
            } else if (code === "auth/popup-closed-by-user") {
                errorMessage = "Sign-in popup was closed.";
            } else if (code === "auth/popup-blocked") {
                errorMessage = "Sign-in popup was blocked. Please allow popups for this site.";
            } else if (code === "auth/cancelled-popup-request") {
                errorMessage = "Only one popup request is allowed at a time.";
            }
            
            console.error("Sign-in error:", code, errorMessage);
            setErr(errorMessage);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-md mx-auto px-4 py-12 signin-page-container">
            <h1 className="text-2xl font-bold mb-6">Sign in</h1>

            <form onSubmit={onSubmit} className="space-y-4">
                <input
                    type="email"
                    className="w-full p-2 border rounded-lg"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e=>setEmail(e.target.value)}
                    required
                />
                <div className="relative">
                    <input
                        type={show ? "text" : "password"}
                        className="w-full p-2 border rounded-lg pr-20"
                        placeholder="Your password"
                        value={password}
                        onChange={e=>setPassword(e.target.value)}
                        required
                    />
                    <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600"
                        onClick={()=>setShow(s=>!s)}
                    >
                        {show ? "Hide" : "Show"}
                    </button>
                </div>

                <button
                    className="w-full px-4 py-2 rounded-lg disabled:opacity-60 transition-all"
                    style={{ 
                        background: loading ? 'transparent' : 'transparent',
                        border: '2px solid var(--brand)',
                        color: 'var(--text)'
                    }}
                    onMouseEnter={(e) => {
                        if (!loading) {
                            e.target.style.background = 'var(--brand)';
                            e.target.style.color = '#000000';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!loading) {
                            e.target.style.background = 'transparent';
                            e.target.style.color = 'var(--text)';
                        }
                    }}
                    disabled={loading}
                >
                    {loading ? "Signing in..." : "Sign in"}
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
                        <span>Continue with Google</span>
                    </button>
                </div>
                <div className="mt-4 text-sm">
                    <Link to="/forgot-password" style={{ color: 'var(--brand)' }} className="hover:underline">
                        Forgot password?
                    </Link>
                </div>
            </div>
        </div>
    );
}
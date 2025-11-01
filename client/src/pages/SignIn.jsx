// src/pages/SignIn.jsx
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
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

    const { user, loading: authLoading } = useAuth?.() ?? { user: null, loading: false };

    // If already signed in, don't allow /signin
    useEffect(() => {
        if (authLoading || !user) return;

        (async () => {
            try {
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
                navigate("/", { replace: true });
            }
        })();
    }, [user, authLoading, navigate]);

    async function onSubmit(e) {
        e.preventDefault();
        setErr(""); setLoading(true);
        try {
            const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
            //await redirectByRole(cred.user);
        } catch (e) {
            const code = e.code || "";
            if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
                setErr("Incorrect email or password.");
            } else if (code === "auth/user-not-found") {
                setErr("No account for this email.");
            } else if (code === "auth/too-many-requests") {
                setErr("Too many attempts. Try again later.");
            } else {
                setErr(e.message || "Sign-in failed.");
            }
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
            setErr(e.message || "Google sign-in failed.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-md mx-auto px-4 py-12">
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
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-60"
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
                        className="margin-text--google-button flex items-center justify-center gap-3 w-full border border-gray-300 rounded-md bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition"
                        disabled={loading}
                    >
                        <FcGoogle className="text-xl" />
                        <span>Continue with Google</span>
                    </button>
                </div>
                <div className="mt-4 text-sm">
                    <Link to="/forgot-password" className="text-indigo-600 hover:underline">
                        Forgot password?
                    </Link>
                </div>
            </div>
        </div>
    );
}
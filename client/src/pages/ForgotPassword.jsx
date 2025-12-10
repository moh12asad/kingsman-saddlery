// src/pages/ForgotPassword.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    async function onSubmit(e) {
        e.preventDefault();
        setMsg(""); 
        setErr("");
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email.trim().toLowerCase(), {
                url: `${window.location.origin}/signin`,
                handleCodeInApp: false,
            });
            setMsg("Password reset link sent! Check your email inbox.");
        } catch (e) {
            const code = e.code || "";
            let errorMessage = e.message || "Failed to send reset email.";
            
            if (code === "auth/user-not-found") {
                errorMessage = "No account found with this email address.";
            } else if (code === "auth/invalid-email") {
                errorMessage = "Invalid email address.";
            } else if (code === "auth/too-many-requests") {
                errorMessage = "Too many requests. Please try again later.";
            }
            
            setErr(errorMessage);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="signin-page-container">
            <div className="max-w-md mx-auto px-4 py-12">
                <h1 className="text-2xl font-bold mb-2">Forgot Password</h1>
                <p className="text-muted mb-6">
                    Enter your email address and we'll send you a link to reset your password.
                </p>

                <form onSubmit={onSubmit} className="space-y-4">
                    <input
                        className="w-full p-2 border rounded-lg"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        disabled={loading}
                    />
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
                        {loading ? "Sending..." : "Send reset link"}
                    </button>
                </form>

                {msg && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-700 text-sm">{msg}</p>
                    </div>
                )}
                
                {err && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700 text-sm">{err}</p>
                    </div>
                )}

                <div className="mt-6 text-center">
                    <Link to="/signin" style={{ color: 'var(--brand)' }} className="hover:underline text-sm">
                        Back to Sign In
                    </Link>
                </div>
            </div>
        </main>
    );
}

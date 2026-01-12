// src/pages/ForgotPassword.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "../lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { useTranslation } from "react-i18next";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);
    const { t } = useTranslation();

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
            setMsg(t("forgotPassword.success.linkSent"));
        } catch (e) {
            const code = e.code || "";
            let errorMessage = t("forgotPassword.errors.failed");
            
            if (code === "auth/user-not-found") {
                errorMessage = t("forgotPassword.errors.userNotFound");
            } else if (code === "auth/invalid-email") {
                errorMessage = t("forgotPassword.errors.invalidEmail");
            } else if (code === "auth/too-many-requests") {
                errorMessage = t("forgotPassword.errors.tooManyRequests");
            }
            
            setErr(errorMessage);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="signin-page-container">
            <div className="max-w-md mx-auto px-4 py-12">
                <h1 className="text-2xl font-bold mb-2">{t("forgotPassword.title")}</h1>
                <p className="text-muted mb-6">
                    {t("forgotPassword.description")}
                </p>

                <form onSubmit={onSubmit} className="space-y-4">
                    <input
                        className="w-full p-2 border rounded-lg"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder={t("forgotPassword.emailPlaceholder")}
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
                        {loading ? t("forgotPassword.sending") : t("forgotPassword.sendResetLink")}
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
                        {t("forgotPassword.backToSignIn")}
                    </Link>
                </div>
            </div>
        </main>
    );
}

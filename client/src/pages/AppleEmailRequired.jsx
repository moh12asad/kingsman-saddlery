import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../lib/firebase";
import { updateEmail } from "firebase/auth";
import { FaEnvelope, FaSpinner } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import AuthRoute from "../components/AuthRoute";
import { isPrivateRelayEmail } from "../utils/isPrivateRelayEmail";

export default function AppleEmailRequired() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isAppleWithRelay =
    user &&
    user.providerData?.some((p) => p.providerId === "apple.com") &&
    isPrivateRelayEmail(user.email);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/signin", { replace: true });
      return;
    }
    if (!isAppleWithRelay) {
      navigate("/create-password", { replace: true });
    }
  }, [user, authLoading, isAppleWithRelay, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError(t("appleEmailRequired.errors.enterEmail"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(t("appleEmailRequired.errors.invalidEmail"));
      return;
    }
    if (isPrivateRelayEmail(trimmed)) {
      setError(t("appleEmailRequired.errors.noRelay"));
      return;
    }

    try {
      setLoading(true);
      await updateEmail(auth.currentUser, trimmed);
      navigate("/create-password", { replace: true });
    } catch (err) {
      console.error("Update email error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError(t("appleEmailRequired.errors.emailAlreadyInUse"));
      } else if (err.code === "auth/requires-recent-login") {
        setError(t("profile.errors.requiresRecentLoginEmail"));
      } else {
        setError(err.message || t("appleEmailRequired.errors.failed"));
      }
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || !user || !isAppleWithRelay) {
    return (
      <AuthRoute>
        <main className="page-with-navbar">
          <div className="container-main padding-y-xl">
            <div className="max-w-2xl mx-auto">
              <div className="flex-row flex-items-center flex-gap-md" style={{ justifyContent: "center", padding: "2rem" }}>
                <FaSpinner className="animate-spin" />
                <span>{t("common.loading")}</span>
              </div>
            </div>
          </div>
        </main>
      </AuthRoute>
    );
  }

  return (
    <AuthRoute>
      <main className="page-with-navbar">
        <div className="container-main padding-y-xl">
          <div className="max-w-2xl mx-auto">
            <h1 className="heading-1 margin-bottom-md">{t("appleEmailRequired.title")}</h1>
            <p className="text-muted margin-bottom-lg">{t("appleEmailRequired.description")}</p>

            {error && (
              <div className="card card-error padding-md margin-bottom-md">
                <p className="text-error">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="card padding-lg">
              <div className="margin-bottom-md">
                <label className="text-sm font-medium margin-bottom-sm flex-row flex-gap-sm">
                  <FaEnvelope />
                  {t("appleEmailRequired.emailLabel")} *
                </label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("signIn.emailPlaceholder")}
                  required
                  autoComplete="email"
                />
                <p className="text-xs text-muted label-help-text margin-top-sm">
                  {t("appleEmailRequired.help")}
                </p>
              </div>

              <button type="submit" className="btn-primary margin-top-md" disabled={loading}>
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" style={{ marginRight: "0.5rem" }} />
                    {t("appleEmailRequired.submitting")}
                  </>
                ) : (
                  <>
                    <FaEnvelope style={{ marginRight: "0.5rem" }} />
                    {t("appleEmailRequired.submit")}
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

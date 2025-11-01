import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";

export default function AdminGate({ children, fallback = null }) {
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { setOk(false); setLoading(false); return; }
      const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
        .split(",")
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
      setOk(adminEmails.includes((user.email || "").toLowerCase()));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return null; // or a spinner
  if (!ok) return fallback;
  return children;
}

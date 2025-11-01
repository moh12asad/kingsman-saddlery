// src/pages/ForgotPassword.jsx
import { useState } from "react";
import { auth } from "../lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");

    async function onSubmit(e) {
        e.preventDefault();
        setMsg(""); setErr("");
        try {
            await sendPasswordResetEmail(auth, email.trim().toLowerCase(), {
                url: `${window.location.origin}/welcome?email=${encodeURIComponent(email.trim().toLowerCase())}`,
                handleCodeInApp: false,
            });
            setMsg("Reset link sent. Check your inbox.");
        } catch (e) {
            setErr(e?.message || "Failed to send reset email.");
        }
    }

    return (
        <form onSubmit={onSubmit} className="max-w-md mx-auto space-y-3">
            <h1 className="text-xl font-semibold">Forgot Password</h1>
            <input
                className="border rounded-lg px-2 py-1 w-full"
                type="email"
                value={email}
                onChange={e=>setEmail(e.target.value)}
                placeholder="you@example.com"
                required
            />
            <button className="px-3 py-2 rounded-lg bg-indigo-600 text-white">Send reset link</button>
            {msg && <p className="text-green-600">{msg}</p>}
            {err && <p className="text-red-600">{err}</p>}
        </form>
    );
}

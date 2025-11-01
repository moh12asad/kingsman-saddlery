// src/components/GuestRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function GuestRoute({ children }) {
    const { user, loading } = useAuth();   // your context should expose these
    if (loading) return null;              // or a spinner
    return user ? <Navigate to="/" replace /> : children;
}
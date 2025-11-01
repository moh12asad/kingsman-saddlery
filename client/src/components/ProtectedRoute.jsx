import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const allowList = (import.meta.env.VITE_ADMIN_EMAILS || "").split(",").map(s => s.trim()).filter(Boolean);

  if (loading) {
    return (
      <div className="min-h-[50vh] grid place-items-center">
        <div className="animate-pulse text-gray-500">Checking permissions…</div>
      </div>
    );
  }

  const isAllowed = !!user && (allowList.length === 0 || allowList.includes(user.email));
  return isAllowed ? children : <Navigate to="/" replace />;
}

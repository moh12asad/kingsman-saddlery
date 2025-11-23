import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * AuthRoute - Protects routes that require authentication
 * Allows any authenticated user (not just admins)
 */
export default function AuthRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[50vh] grid place-items-center">
        <div className="animate-pulse text-gray-500">Loading…</div>
      </div>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return children;
}


// client/src/utils/checkAdmin.js
import { auth } from "../lib/firebase";

const API = import.meta.env.VITE_API_BASE_URL || "";

/**
 * Check if the current user is an admin by querying the backend API
 * This avoids Firestore security rules issues and is more secure
 * @returns {Promise<boolean>} True if user is admin, false otherwise
 */
export async function checkAdmin() {
  const user = auth.currentUser;
  if (!user) {
    console.log("[checkAdmin] No authenticated user");
    return false;
  }

  console.log("[checkAdmin] Checking admin status for user:", user.uid, user.email);

  try {
    // Get user data from backend API (which includes role)
    const token = await user.getIdToken();
    console.log("[checkAdmin] Fetching user data from backend API...");
    
    const res = await fetch(`${API}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      console.error("[checkAdmin] Failed to fetch user data:", res.status, res.statusText);
      return false;
    }

    const userData = await res.json();
    console.log("[checkAdmin] User data from API:", {
      role: userData.role,
      active: userData.active,
      email: userData.email
    });

    const isAdmin = userData.role === "ADMIN" && userData.active !== false;
    console.log("[checkAdmin] Admin check result:", isAdmin, {
      roleMatch: userData.role === "ADMIN",
      activeCheck: userData.active !== false
    });

    return isAdmin;
  } catch (error) {
    console.error("[checkAdmin] Error checking admin status:", error);
    return false;
  }
}










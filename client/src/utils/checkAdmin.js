// client/src/utils/checkAdmin.js
import { auth, db } from "../lib/firebase";
import { doc, getDocFromServer, getDocFromCache } from "firebase/firestore";

/**
 * Check if the current user is an admin by querying Firestore users collection
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
    // Check Firestore users collection for admin role
    // Use getDocFromServer to force network read and avoid offline cache issues
    console.log("[checkAdmin] Attempting server read from users collection...");
    const userDoc = await getDocFromServer(doc(db, "users", user.uid));
    
    if (!userDoc.exists()) {
      console.warn("[checkAdmin] User document does not exist in Firestore for:", user.uid);
      return false;
    }

    const userData = userDoc.data();
    console.log("[checkAdmin] User document data:", {
      role: userData?.role,
      active: userData?.active,
      email: userData?.email,
      fullData: userData
    });

    const isAdmin = userData?.role === "ADMIN" && userData?.active !== false;
    console.log("[checkAdmin] Admin check result:", isAdmin, {
      roleMatch: userData?.role === "ADMIN",
      activeCheck: userData?.active !== false
    });

    return isAdmin;
  } catch (error) {
    console.error("[checkAdmin] Server read error:", {
      code: error.code,
      message: error.message,
      error: error
    });

    // If server read fails due to network/offline, try cache as fallback
    if (error.code === 'unavailable' || error.code === 'failed-precondition' || error.message?.includes('offline')) {
      console.log("[checkAdmin] Network unavailable, trying cache fallback...");
      try {
        const userDoc = await getDocFromCache(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
          console.warn("[checkAdmin] User document not in cache");
          return false;
        }
        const userData = userDoc.data();
        console.log("[checkAdmin] Cache data:", {
          role: userData?.role,
          active: userData?.active
        });
        const isAdmin = userData?.role === "ADMIN" && userData?.active !== false;
        console.log("[checkAdmin] Cache admin check result:", isAdmin);
        return isAdmin;
      } catch (cacheError) {
        // Document not in cache is expected - just return false silently
        // Only log actual errors (not cache misses)
        if (cacheError.code !== 'unavailable' && !cacheError.message?.includes('cache')) {
          console.error("[checkAdmin] Error checking admin status from cache:", cacheError);
        }
        return false;
      }
    }
    // For other errors, log and return false
    console.error("[checkAdmin] Error checking admin status:", error);
    return false;
  }
}










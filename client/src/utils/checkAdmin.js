// client/src/utils/checkAdmin.js
import { auth, db } from "../lib/firebase";
import { doc, getDocFromServer, getDocFromCache } from "firebase/firestore";

/**
 * Check if the current user is an admin by querying Firestore users collection
 * @returns {Promise<boolean>} True if user is admin, false otherwise
 */
export async function checkAdmin() {
  const user = auth.currentUser;
  if (!user) return false;

  try {
    // Check Firestore users collection for admin role
    // Use getDocFromServer to force network read and avoid offline cache issues
    const userDoc = await getDocFromServer(doc(db, "users", user.uid));
    if (!userDoc.exists()) return false;

    const userData = userDoc.data();
    return userData?.role === "ADMIN" && userData?.active !== false;
  } catch (error) {
    // If server read fails due to network/offline, try cache as fallback
    if (error.code === 'unavailable' || error.code === 'failed-precondition' || error.message?.includes('offline')) {
      try {
        const userDoc = await getDocFromCache(doc(db, "users", user.uid));
        if (!userDoc.exists()) return false;
        const userData = userDoc.data();
        return userData?.role === "ADMIN" && userData?.active !== false;
      } catch (cacheError) {
        // Document not in cache is expected - just return false silently
        // Only log actual errors (not cache misses)
        if (cacheError.code !== 'unavailable' && !cacheError.message?.includes('cache')) {
          console.error("Error checking admin status from cache:", cacheError);
        }
        return false;
      }
    }
    // For other errors, log and return false
    console.error("Error checking admin status:", error);
    return false;
  }
}










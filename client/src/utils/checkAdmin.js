// client/src/utils/checkAdmin.js
import { auth, db } from "../lib/firebase";
import { doc, getDocFromServer, getDocFromCache } from "firebase/firestore";

/**
 * Check if the current user is an admin by querying Firestore users collection
 * @returns {Promise<boolean>} True if user is admin, false otherwise
 */
export async function checkAdmin() {
  try {
    const user = auth.currentUser;
    if (!user) return false;

    // Check Firestore users collection for admin role
    // Use getDocFromServer to force network read and avoid offline cache issues
    const userDoc = await getDocFromServer(doc(db, "users", user.uid));
    if (!userDoc.exists()) return false;

    const userData = userDoc.data();
    return userData?.role === "ADMIN" && userData?.active !== false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    // If server read fails (e.g., network issue), try cache as fallback
    try {
      const userDoc = await getDocFromCache(doc(db, "users", user.uid));
      if (!userDoc.exists()) return false;
      const userData = userDoc.data();
      return userData?.role === "ADMIN" && userData?.active !== false;
    } catch (cacheError) {
      console.error("Error checking admin status from cache:", cacheError);
      return false;
    }
  }
}










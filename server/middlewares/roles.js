// server/middlewares/roles.js
import admin from "firebase-admin";

export function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      const uid = req.user?.uid;
      if (!uid) return res.status(401).json({ error: "Unauthenticated" });

      // Read user doc for role + active flag
      let snap;
      try {
        snap = await admin.firestore().collection("users").doc(uid).get();
      } catch (firestoreError) {
        console.error("Firestore access error in requireRole:", firestoreError);
        if (firestoreError.code === 7 || firestoreError.message?.includes("PERMISSION_DENIED")) {
          throw new Error("Service account lacks Firestore permissions. See server console for details.");
        }
        throw firestoreError;
      }
      const u = snap.exists ? snap.data() : null;

      // If you use 'active' instead of 'isBlocked', deny when active === false
      if (u && u.active === false) {
        return res.status(403).json({ error: "Account is not active" });
      }

      const role = u?.role || req.user?.role || ""; // fallback if you add custom claims later
      if (roles.length && !roles.includes(role)) {
        console.log(`User ${uid} has role "${role}", but required: ${roles.join(" or ")}`);
        return res.status(403).json({ 
          error: "Insufficient permissions",
          details: `Your account needs role "${roles.join('" or "')}" but currently has "${role || 'none'}". Create a user document in Firestore at users/${uid} with role: "ADMIN" or "STAFF".`
        });
      }

      return next();
    } catch (e) {
      console.error("requireRole failed:", e);
      return res.status(500).json({ error: "Role check failed" });
    }
  };
}

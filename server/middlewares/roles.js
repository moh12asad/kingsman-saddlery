// server/middlewares/roles.js
import admin from "firebase-admin";

export function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      const uid = req.user?.uid;
      if (!uid) return res.status(401).json({ error: "Unauthenticated" });

      // Read user doc for role + active flag
      const snap = await admin.firestore().collection("users").doc(uid).get();
      const u = snap.exists ? snap.data() : null;

      // If you use 'active' instead of 'isBlocked', deny when active === false
      if (u && u.active === false) {
        return res.status(403).json({ error: "Account is not active" });
      }

      const role = u?.role || req.user?.role || ""; // fallback if you add custom claims later
      if (roles.length && !roles.includes(role)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      return next();
    } catch (e) {
      console.error("requireRole failed:", e);
      return res.status(500).json({ error: "Role check failed" });
    }
  };
}

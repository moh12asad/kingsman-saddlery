// server/middlewares/auth.js
import admin from "firebase-admin";
import "../lib/firebaseAdmin.js";

/**
 * Verifies a Firebase ID token from the Authorization: Bearer <token> header.
 * Attaches decoded token as req.user.
 */
export async function verifyFirebaseToken(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const parts = auth.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({ error: "Missing Bearer token" });
    }
    const idToken = parts[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    return next();
  } catch (err) {
    console.error("verifyFirebaseToken error:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
}

export default admin; // after initialization code

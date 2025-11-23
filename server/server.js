// server/server.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import * as dotenv from "dotenv";
import "./lib/firebaseAdmin.js";
import admin from "firebase-admin";

import usersAdmin from "./routes/users.admin.basic.js";
import productsAdmin from "./routes/products.admin.basic.js";
import ordersAdmin from "./routes/orders.admin.js";
import categoriesAdmin from "./routes/categories.admin.js";
import { verifyFirebaseToken } from "./middlewares/auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.get("/", (_req, res) => res.json({ ok: true, service: "kingsman API" })); // 200 instead of 404


// ---------- Middleware ----------
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

// ---------- Health ----------
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ---------- Helper endpoint to set user role (admin only, one-time setup) ----------
app.post("/api/set-user-role", verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const { role, targetUid } = req.body;
    
    // Allow setting your own role OR if you're already an admin, set others
    const targetUserId = targetUid || uid;
    
    // Check if requester is admin (if setting someone else)
    if (targetUserId !== uid) {
      const requesterSnap = await admin.firestore().collection("users").doc(uid).get();
      const requesterRole = requesterSnap.data()?.role;
      if (requesterRole !== "ADMIN") {
        return res.status(403).json({ error: "Only admins can set other users' roles" });
      }
    }
    
    // Create or update user document
    await admin.firestore().collection("users").doc(targetUserId).set({
      role: role || "ADMIN",
      active: true,
      email: req.user.email,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    
    res.json({ 
      ok: true, 
      message: `Role "${role || 'ADMIN'}" set for user ${targetUserId}`,
      uid: targetUserId
    });
  } catch (error) {
    console.error("set-user-role error:", error);
    res.status(500).json({ error: "Failed to set user role", details: error.message });
  }
});

// ---------- Diagnostic endpoint to test service account ----------
app.get("/api/test-firestore", async (_req, res) => {
  try {
    const { db, adminAuth } = await import("./lib/firebaseAdmin.js");
    
    // Get the service account email being used
    const serviceAccountEmail = adminAuth.app.options.credential?.clientEmail || "unknown";
    const projectId = adminAuth.app.options.projectId || process.env.FIREBASE_PROJECT_ID || "unknown";
    
    // Try to read from Firestore
    const testDoc = await db.collection("_test").doc("connection").get();
    res.json({ 
      ok: true, 
      message: "Service account can access Firestore",
      serviceAccountEmail: serviceAccountEmail,
      projectId: projectId,
      testDocExists: testDoc.exists 
    });
  } catch (error) {
    console.error("Firestore test error:", error);
    
    // Try to get the service account email from the error or config
    let serviceAccountEmail = "unknown";
    let projectId = process.env.FIREBASE_PROJECT_ID || "unknown";
    try {
      const { adminAuth } = await import("./lib/firebaseAdmin.js");
      serviceAccountEmail = adminAuth.app.options.credential?.clientEmail || "unknown";
      projectId = adminAuth.app.options.projectId || process.env.FIREBASE_PROJECT_ID || "unknown";
    } catch (e) {
      // Ignore
    }
    
    res.status(500).json({ 
      ok: false,
      error: "Service account cannot access Firestore",
      serviceAccountEmail: serviceAccountEmail,
      projectId: projectId,
      envProjectId: process.env.FIREBASE_PROJECT_ID,
      code: error.code,
      message: error.message,
      fix: `Grant 'Firebase Admin SDK Administrator Service Agent' role to: ${serviceAccountEmail} in Google Cloud Console → IAM & Admin → IAM`
    });
  }
});

// ---------- Routes ----------
app.use("/api/users", verifyFirebaseToken, usersAdmin);
// Public GET is allowed for listing products; POST/PATCH protected inside the router:
app.use("/api/products", productsAdmin);
app.use("/api/orders", ordersAdmin);
app.use("/api/categories", categoriesAdmin);

// ---------- Fallback ----------
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

export default app;

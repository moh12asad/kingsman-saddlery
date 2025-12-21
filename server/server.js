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
import heroSlidesAdmin from "./routes/hero-slides.admin.js";
import adsAdmin from "./routes/ads.admin.js";
import brandsAdmin from "./routes/brands.admin.js";
import emailRoutes from "./routes/email.js";
import settingsAdmin from "./routes/settings.admin.js";
import paymentRoutes from "./routes/payment.js";
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
    
    // Try to read from Firestore
    const testDoc = await db.collection("_test").doc("connection").get();
    res.json({ 
      ok: true, 
      message: "Service account can access Firestore",
      serviceAccountEmail: serviceAccountEmail,
      testDocExists: testDoc.exists 
    });
  } catch (error) {
    console.error("Firestore test error:", error);
    
    // Try to get the service account email from the error or config
    let serviceAccountEmail = "unknown";
    try {
      const { adminAuth } = await import("./lib/firebaseAdmin.js");
      serviceAccountEmail = adminAuth.app.options.credential?.clientEmail || "unknown";
    } catch (e) {
      // Ignore
    }
    
    res.status(500).json({ 
      ok: false,
      error: "Service account cannot access Firestore",
      serviceAccountEmail: serviceAccountEmail,
      code: error.code,
      message: error.message,
      fix: `Grant 'Firebase Admin SDK Administrator Service Agent' role to: ${serviceAccountEmail} in Google Cloud Console → IAM & Admin → IAM`
    });
  }
});

// ---------- Routes ----------
// Public endpoint to check if user exists (no auth required)
app.post("/api/users/check-exists", async (req, res) => {
  try {
    const { adminAuth, db } = await import("./lib/firebaseAdmin.js");
    const { email, phone } = req.body;
    
    if (!email && !phone) {
      return res.status(400).json({ error: "Email or phone is required" });
    }

    let emailExists = false;
    let phoneExists = false;

    // Check email in Firebase Auth
    if (email) {
      try {
        const normalizedEmail = email.trim().toLowerCase();
        await adminAuth.getUserByEmail(normalizedEmail);
        emailExists = true;
      } catch (error) {
        if (error.code !== "auth/user-not-found") {
          console.error("Error checking email:", error);
        }
        emailExists = false;
      }
    }

    // Check phone in Firestore users collection
    if (phone) {
      try {
        const normalizedPhone = phone.trim();
        const usersSnapshot = await db.collection("users")
          .where("phone", "==", normalizedPhone)
          .limit(1)
          .get();
        
        phoneExists = !usersSnapshot.empty;
      } catch (error) {
        console.error("Error checking phone:", error);
        phoneExists = false;
      }
    }

    res.json({
      emailExists,
      phoneExists,
      exists: emailExists || phoneExists
    });
  } catch (error) {
    console.error("Error checking if user exists:", error);
    res.status(500).json({ error: "Failed to check if user exists", details: error.message });
  }
});

app.use("/api/users", verifyFirebaseToken, usersAdmin);
// Public GET is allowed for listing products; POST/PATCH protected inside the router:
app.use("/api/products", productsAdmin);
app.use("/api/orders", ordersAdmin);
app.use("/api/categories", categoriesAdmin);
app.use("/api/hero-slides", heroSlidesAdmin);
app.use("/api/ads", adsAdmin);
app.use("/api/brands", brandsAdmin);
app.use("/api/email", emailRoutes);
app.use("/api/settings", settingsAdmin);
app.use("/api/payment", paymentRoutes);

// ---------- Fallback ----------
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

export default app;

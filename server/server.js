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
import contactRoutes from "./routes/contact.js";
import { verifyFirebaseToken } from "./middlewares/auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.get("/", (_req, res) => res.json({ ok: true, service: "kingsman API" })); // 200 instead of 404


// ---------- Middleware ----------
// Security: Restrict CORS to specific origins
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
];

app.use(cors({ 
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true 
}));

// Security: Limit request body size to prevent DoS attacks
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan("dev"));

// ---------- Health ----------
app.get("/api/health", (_req, res) => res.json({ ok: true }));

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
app.use("/api/contact", contactRoutes);

// ---------- Fallback ----------
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

export default app;

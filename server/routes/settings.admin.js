// server/routes/settings.admin.js
import { Router } from "express";
import admin from "firebase-admin";
import { requireRole } from "../middlewares/roles.js";
import { verifyFirebaseToken } from "../middlewares/auth.js";

const db = admin.firestore();
const router = Router();

// Get settings (public endpoint)
router.get("/", async (_req, res) => {
  try {
    const settingsDoc = await db.collection("settings").doc("general").get();
    if (!settingsDoc.exists) {
      // Return default settings if none exist
      return res.json({ 
        settings: {
          whatsappNumber: "",
          storeName: "",
          storeEmail: "",
          storePhone: "",
        } 
      });
    }
    res.json({ settings: settingsDoc.data() });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings", details: error.message });
  }
});

// Require authentication for mutating routes
router.use((req, res, next) => {
  if (["GET", "OPTIONS", "HEAD"].includes(req.method)) {
    return next();
  }
  return verifyFirebaseToken(req, res, next);
});

// Update settings (ADMIN only)
router.patch("/", requireRole("ADMIN"), async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("settings").doc("general").set(updateData, { merge: true });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ error: "Failed to update settings", details: error.message });
  }
});

export default router;



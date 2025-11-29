import { Router } from "express";
import admin from "firebase-admin";
import { requireRole } from "../middlewares/roles.js";
import { verifyFirebaseToken } from "../middlewares/auth.js";

const db = admin.firestore();
const router = Router();

// Get all brands (public endpoint)
router.get("/", async (_req, res) => {
  try {
    const snap = await db
      .collection("brands")
      .orderBy("name")
      .get();

    const brands = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ brands });
  } catch (error) {
    console.error("Error fetching brands:", error);
    res.status(500).json({ error: "Failed to fetch brands", details: error.message });
  }
});

// Require authentication for mutating routes
router.use(verifyFirebaseToken);

// Create brand (ADMIN only)
router.post("/", requireRole("ADMIN"), async (req, res) => {
  try {
    const { name = "", logo = "" } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Brand name is required" });
    }

    if (!logo || logo.trim() === "") {
      return res.status(400).json({ error: "Brand logo is required" });
    }

    const docRef = await db.collection("brands").add({
      name: name.trim(),
      logo: logo.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ id: docRef.id });
  } catch (error) {
    console.error("Error creating brand:", error);
    res.status(500).json({ error: "Failed to create brand", details: error.message });
  }
});

// Update brand (ADMIN only)
router.patch("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    const { name, logo } = req.body;

    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (logo !== undefined) updateData.logo = logo.trim();

    await db.collection("brands").doc(req.params.id).set(updateData, { merge: true });

    res.json({ ok: true });
  } catch (error) {
    console.error("Error updating brand:", error);
    res.status(500).json({ error: "Failed to update brand", details: error.message });
  }
});

// Delete brand (ADMIN only)
router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    await db.collection("brands").doc(req.params.id).delete();

    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting brand:", error);
    res.status(500).json({ error: "Failed to delete brand", details: error.message });
  }
});

export default router;





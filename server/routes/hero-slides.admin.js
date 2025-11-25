import { Router } from "express";
import admin from "firebase-admin";
import { requireRole } from "../middlewares/roles.js";
import { verifyFirebaseToken } from "../middlewares/auth.js";

const db = admin.firestore();
const router = Router();

// Get all hero slides (public endpoint for carousel)
router.get("/", async (_req, res) => {
  try {
    const snap = await db
      .collection("heroSlides")
      .orderBy("order", "asc")
      .get();

    const slides = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ slides });
  } catch (error) {
    console.error("Error fetching hero slides:", error);
    res.status(500).json({ error: "Failed to fetch hero slides", details: error.message });
  }
});

// Require authentication for mutating routes
router.use(verifyFirebaseToken);

// Create hero slide (ADMIN only)
router.post("/", requireRole("ADMIN"), async (req, res) => {
  try {
    const { 
      image = "", 
      title = "", 
      subtitle = "", 
      button1 = "", 
      button2 = "",
      order = 0
    } = req.body;

    if (!image || image.trim() === "") {
      return res.status(400).json({ error: "Image URL is required" });
    }

    const docRef = await db.collection("heroSlides").add({
      image: image.trim(),
      title: title.trim() || "",
      subtitle: subtitle.trim() || "",
      button1: button1.trim() || "",
      button2: button2.trim() || "",
      order: Number(order) || 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ id: docRef.id });
  } catch (error) {
    console.error("Error creating hero slide:", error);
    res.status(500).json({ error: "Failed to create hero slide", details: error.message });
  }
});

// Update hero slide (ADMIN only)
router.patch("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    const { image, title, subtitle, button1, button2, order } = req.body;

    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (image !== undefined) updateData.image = image.trim();
    if (title !== undefined) updateData.title = title.trim() || "";
    if (subtitle !== undefined) updateData.subtitle = subtitle.trim() || "";
    if (button1 !== undefined) updateData.button1 = button1.trim() || "";
    if (button2 !== undefined) updateData.button2 = button2.trim() || "";
    if (order !== undefined) updateData.order = Number(order) || 0;

    await db.collection("heroSlides").doc(req.params.id).set(updateData, { merge: true });

    res.json({ ok: true });
  } catch (error) {
    console.error("Error updating hero slide:", error);
    res.status(500).json({ error: "Failed to update hero slide", details: error.message });
  }
});

// Delete hero slide (ADMIN only)
router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    await db.collection("heroSlides").doc(req.params.id).delete();
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting hero slide:", error);
    res.status(500).json({ error: "Failed to delete hero slide", details: error.message });
  }
});

export default router;


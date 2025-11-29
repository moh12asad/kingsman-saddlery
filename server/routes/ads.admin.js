import { Router } from "express";
import admin from "firebase-admin";
import { requireRole } from "../middlewares/roles.js";
import { verifyFirebaseToken } from "../middlewares/auth.js";

const db = admin.firestore();
const router = Router();

// Get all active ads (public endpoint for promotional banner)
router.get("/", async (_req, res) => {
  try {
    // Fetch all ads and filter/sort in code to avoid needing a composite index
    const snap = await db.collection("ads").get();

    const ads = snap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((ad) => ad.active !== false) // Filter active ads
      .sort((a, b) => (a.order || 0) - (b.order || 0)); // Sort by order

    res.json({ ads });
  } catch (error) {
    console.error("Error fetching ads:", error);
    res.status(500).json({ error: "Failed to fetch ads", details: error.message });
  }
});

// Require authentication for mutating routes
router.use(verifyFirebaseToken);

// Get all ads including inactive (ADMIN only - for admin panel)
router.get("/all", requireRole("ADMIN"), async (_req, res) => {
  try {
    const snap = await db.collection("ads").get();

    const ads = snap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) => (a.order || 0) - (b.order || 0)); // Sort by order

    res.json({ ads });
  } catch (error) {
    console.error("Error fetching all ads:", error);
    res.status(500).json({ error: "Failed to fetch ads", details: error.message });
  }
});

// Create ad (ADMIN only)
router.post("/", requireRole("ADMIN"), async (req, res) => {
  try {
    const { 
      image = "", 
      title = "", 
      subtitle = "",
      link = "",
      order = 0,
      active = true
    } = req.body;

    if (!image || image.trim() === "") {
      return res.status(400).json({ error: "Image URL is required" });
    }

    const docRef = await db.collection("ads").add({
      image: image.trim(),
      title: title.trim() || "",
      subtitle: subtitle.trim() || "",
      link: link.trim() || "",
      order: Number(order) || 0,
      active: active !== false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ id: docRef.id });
  } catch (error) {
    console.error("Error creating ad:", error);
    res.status(500).json({ error: "Failed to create ad", details: error.message });
  }
});

// Update ad (ADMIN only)
router.patch("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    const { image, title, subtitle, link, order, active } = req.body;

    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (image !== undefined) updateData.image = image.trim();
    if (title !== undefined) updateData.title = title.trim() || "";
    if (subtitle !== undefined) updateData.subtitle = subtitle.trim() || "";
    if (link !== undefined) updateData.link = link.trim() || "";
    if (order !== undefined) updateData.order = Number(order) || 0;
    if (active !== undefined) updateData.active = active !== false;

    await db.collection("ads").doc(req.params.id).set(updateData, { merge: true });

    res.json({ ok: true });
  } catch (error) {
    console.error("Error updating ad:", error);
    res.status(500).json({ error: "Failed to update ad", details: error.message });
  }
});

// Delete ad (ADMIN only)
router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    await db.collection("ads").doc(req.params.id).delete();
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting ad:", error);
    res.status(500).json({ error: "Failed to delete ad", details: error.message });
  }
});

export default router;


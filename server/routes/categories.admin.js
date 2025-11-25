import { Router } from "express";
import admin from "firebase-admin";
import { requireRole } from "../middlewares/roles.js";
import { verifyFirebaseToken } from "../middlewares/auth.js";

const db = admin.firestore();
const router = Router();

// Get all categories (public endpoint for shop page)
router.get("/", async (_req, res) => {
  try {
    const snap = await db
      .collection("categories")
      .orderBy("name")
      .get();

    const categories = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories", details: error.message });
  }
});

// Require authentication for mutating routes
router.use(verifyFirebaseToken);

// Create category (ADMIN only)
router.post("/", requireRole("ADMIN"), async (req, res) => {
  try {
    const { name = "", description = "", image = "", subCategories = [] } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Category name is required" });
    }

    // Validate subCategories structure
    const validSubCategories = Array.isArray(subCategories) 
      ? subCategories.filter(sub => sub && typeof sub === 'object' && sub.name && sub.name.trim())
      : [];

    const docRef = await db.collection("categories").add({
      name: name.trim(),
      description: description.trim() || "",
      image: image || "",
      subCategories: validSubCategories.map(sub => ({
        name: sub.name.trim(),
        image: sub.image || "",
      })),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ id: docRef.id });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Failed to create category", details: error.message });
  }
});

// Update category (ADMIN only)
router.patch("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    const { name, description, image, subCategories } = req.body;

    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim() || "";
    if (image !== undefined) updateData.image = image || "";
    
    if (subCategories !== undefined) {
      // Validate subCategories structure
      const validSubCategories = Array.isArray(subCategories) 
        ? subCategories.filter(sub => sub && typeof sub === 'object' && sub.name && sub.name.trim())
        : [];
      updateData.subCategories = validSubCategories.map(sub => ({
        name: sub.name.trim(),
        image: sub.image || "",
      }));
    }

    await db.collection("categories").doc(req.params.id).set(updateData, { merge: true });

    res.json({ ok: true });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Failed to update category", details: error.message });
  }
});

// Delete category (ADMIN only)
router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    await db.collection("categories").doc(req.params.id).delete();
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Failed to delete category", details: error.message });
  }
});

export default router;


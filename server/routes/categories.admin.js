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

// Helper to clean multilingual object
const cleanMultilingual = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { en: "", ar: "", he: "" };
  }
  // Ensure all values are strings before calling trim
  const en = obj.en != null ? String(obj.en) : "";
  const ar = obj.ar != null ? String(obj.ar) : "";
  const he = obj.he != null ? String(obj.he) : "";
  return {
    en: en.trim(),
    ar: ar.trim(),
    he: he.trim()
  };
};

// Create category (ADMIN only)
router.post("/", requireRole("ADMIN"), async (req, res) => {
  try {
    const { name = "", description = "", image = "", subCategories = [] } = req.body;

    // Handle both old format (string) and new format (multilingual object)
    const nameObj = (typeof name === 'string' && name !== null && name !== undefined)
      ? { en: name.trim(), ar: "", he: "" }
      : cleanMultilingual(name || {});
    
    if (!nameObj.en || nameObj.en.trim() === "") {
      return res.status(400).json({ error: "Category name is required" });
    }

    const descriptionObj = (typeof description === 'string' && description !== null && description !== undefined)
      ? { en: description.trim(), ar: "", he: "" }
      : cleanMultilingual(description || {});

    // Validate subCategories structure
    const validSubCategories = Array.isArray(subCategories) 
      ? subCategories
          .filter(sub => sub && typeof sub === 'object' && sub.name)
          .map(sub => {
            const subName = (typeof sub.name === 'string' && sub.name !== null && sub.name !== undefined)
              ? { en: sub.name.trim(), ar: "", he: "" }
              : cleanMultilingual(sub.name || {});
            return {
              name: subName,
              image: sub.image || "",
            };
          })
          .filter(sub => sub.name.en && sub.name.en.trim())
      : [];

    const docRef = await db.collection("categories").add({
      name: nameObj,
      description: descriptionObj,
      image: image || "",
      subCategories: validSubCategories,
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

    if (name !== undefined) {
      updateData.name = (typeof name === 'string' && name !== null)
        ? { en: name.trim(), ar: "", he: "" }
        : cleanMultilingual(name || {});
    }
    
    if (description !== undefined) {
      updateData.description = (typeof description === 'string' && description !== null)
        ? { en: description.trim(), ar: "", he: "" }
        : cleanMultilingual(description || {});
    }
    
    if (image !== undefined) updateData.image = image || "";
    
    if (subCategories !== undefined) {
      // Validate subCategories structure
      const validSubCategories = Array.isArray(subCategories) 
        ? subCategories
            .filter(sub => sub && typeof sub === 'object' && sub.name)
            .map(sub => {
              const subName = (typeof sub.name === 'string' && sub.name !== null)
                ? { en: sub.name.trim(), ar: "", he: "" }
                : cleanMultilingual(sub.name || {});
              return {
                name: subName,
                image: sub.image || "",
              };
            })
            .filter(sub => sub.name.en && sub.name.en.trim())
        : [];
      updateData.subCategories = validSubCategories;
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


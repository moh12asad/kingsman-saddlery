import { Router } from "express";
import admin from "firebase-admin";
import { requireRole } from "../middlewares/roles.js";
import { verifyFirebaseToken } from "../middlewares/auth.js";
import {
  getTranslatedCategory,
  prepareCategoryForStorage,
  mergeTranslations
} from "../utils/translations.js";

const db = admin.firestore();
const router = Router();

// Get all categories (public endpoint for shop page)
router.get("/", async (req, res) => {
  try {
    const lang = req.query.lang || 'en'; // Get language from query parameter, default to 'en'
    const includeAllLanguages = req.query.all === 'true'; // Admin can request all languages
    
    const snap = await db
      .collection("categories")
      .get();

    let categories = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // If admin requests all languages, return raw data
    // Otherwise, return translated version
    if (!includeAllLanguages) {
      categories = categories.map(cat => getTranslatedCategory(cat, lang));
    }

    // Sort by translated name (or original name if all languages)
    categories.sort((a, b) => {
      const nameA = typeof a.name === 'string' ? a.name : (a.name?.en || '');
      const nameB = typeof b.name === 'string' ? b.name : (b.name?.en || '');
      return nameA.localeCompare(nameB);
    });

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
    const { image = "", subCategories = [], name, description } = req.body;

    // Validate name (can be string or translation object)
    const nameValue = typeof name === 'string' ? name : (name?.en || '');
    if (!nameValue || nameValue.trim() === "") {
      return res.status(400).json({ error: "Category name is required" });
    }

    // Prepare category data with translation support
    const categoryData = prepareCategoryForStorage({
      name: name || "",
      description: description || "",
      image: image || "",
      subCategories: subCategories || [],
    });

    // Validate subCategories structure
    if (Array.isArray(categoryData.subCategories)) {
      categoryData.subCategories = categoryData.subCategories
        .filter(sub => sub && typeof sub === 'object')
        .map(sub => ({
          name: sub.name || { en: '', ar: '', he: '' },
          image: sub.image || "",
        }));
    }

    categoryData.createdAt = admin.firestore.FieldValue.serverTimestamp();
    categoryData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    const docRef = await db.collection("categories").add(categoryData);

    res.status(201).json({ id: docRef.id });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Failed to create category", details: error.message });
  }
});

// Update category (ADMIN only)
router.patch("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    // Get existing category to merge translations properly
    const docRef = db.collection("categories").doc(req.params.id);
    const existingDoc = await docRef.get();
    
    if (!existingDoc.exists) {
      return res.status(404).json({ error: "Category not found" });
    }
    
    const existingData = existingDoc.data();
    const { name, description, image, subCategories } = req.body;

    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Handle name translation merge
    if (name !== undefined) {
      if (existingData.name && typeof existingData.name === 'object' &&
          name && typeof name === 'object') {
        updateData.name = mergeTranslations(existingData.name, name);
      } else {
        const prepared = prepareCategoryForStorage({ name });
        updateData.name = prepared.name;
      }
    }

    // Handle description translation merge
    if (description !== undefined) {
      if (existingData.description && typeof existingData.description === 'object' &&
          description && typeof description === 'object') {
        updateData.description = mergeTranslations(existingData.description, description);
      } else {
        const prepared = prepareCategoryForStorage({ description });
        updateData.description = prepared.description;
      }
    }

    if (image !== undefined) updateData.image = image || "";
    
    // Handle subCategories
    if (subCategories !== undefined) {
      const existingSubCats = existingData.subCategories || [];
      const updatedSubCats = Array.isArray(subCategories) ? subCategories : [];
      
      updateData.subCategories = updatedSubCats
        .filter(sub => sub && typeof sub === 'object')
        .map((sub, index) => {
          const existingSub = existingSubCats[index];
          let subName = sub.name;
          
          // Merge translation if both are objects
          if (existingSub?.name && typeof existingSub.name === 'object' &&
              subName && typeof subName === 'object') {
            subName = mergeTranslations(existingSub.name, subName);
          } else {
            const prepared = prepareCategoryForStorage({ subCategories: [{ name: subName }] });
            subName = prepared.subCategories[0]?.name || { en: '', ar: '', he: '' };
          }
          
          return {
            name: subName,
            image: sub.image || "",
          };
        });
    }

    await docRef.set(updateData, { merge: true });

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


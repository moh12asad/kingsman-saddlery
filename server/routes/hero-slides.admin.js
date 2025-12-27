import { Router } from "express";
import admin from "firebase-admin";
import { requireRole } from "../middlewares/roles.js";
import { verifyFirebaseToken } from "../middlewares/auth.js";
import {
  getTranslatedHeroSlide,
  prepareHeroSlideForStorage,
  mergeTranslations
} from "../utils/translations.js";

const db = admin.firestore();
const router = Router();

// Get all hero slides (public endpoint for carousel)
router.get("/", async (req, res) => {
  try {
    const lang = req.query.lang || 'en'; // Get language from query parameter, default to 'en'
    const includeAllLanguages = req.query.all === 'true'; // Admin can request all languages
    
    const snap = await db
      .collection("heroSlides")
      .orderBy("order", "asc")
      .get();

    const slides = snap.docs.map((doc) => {
      const data = doc.data();
      
      // If admin requests all languages, return raw data
      // Otherwise, return translated version
      if (includeAllLanguages) {
        return { id: doc.id, ...data };
      } else {
        return { id: doc.id, ...getTranslatedHeroSlide(data, lang) };
      }
    });

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
      title, 
      subtitle, 
      button1, 
      button2,
      order = 0
    } = req.body;

    if (!image || image.trim() === "") {
      return res.status(400).json({ error: "Image URL is required" });
    }

    // Prepare slide data with translation support
    const slideData = prepareHeroSlideForStorage({
      image: image.trim(),
      title: title || "",
      subtitle: subtitle || "",
      button1: button1 || "",
      button2: button2 || "",
      order: Number(order) || 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const docRef = await db.collection("heroSlides").add(slideData);

    res.status(201).json({ id: docRef.id });
  } catch (error) {
    console.error("Error creating hero slide:", error);
    res.status(500).json({ error: "Failed to create hero slide", details: error.message });
  }
});

// Update hero slide (ADMIN only)
router.patch("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    // Get existing slide to merge translations properly
    const docRef = db.collection("heroSlides").doc(req.params.id);
    const existingDoc = await docRef.get();
    
    if (!existingDoc.exists) {
      return res.status(404).json({ error: "Hero slide not found" });
    }
    
    const existingData = existingDoc.data();
    const updates = { ...req.body };
    
    // Handle translation merges for translatable fields
    const translatableFields = ['title', 'subtitle', 'button1', 'button2'];
    
    for (const field of translatableFields) {
      if (updates[field] !== undefined) {
        // If existing field is a translation object and update is also an object, merge them
        if (existingData[field] && typeof existingData[field] === 'object' && 
            updates[field] && typeof updates[field] === 'object') {
          updates[field] = mergeTranslations(existingData[field], updates[field]);
        } else if (typeof updates[field] === 'string') {
          // If update is a string (empty or not)
          const updateValue = updates[field].trim();
          
          // If empty string and existing data has translations, preserve existing translations
          if (updateValue === '' && existingData[field] && typeof existingData[field] === 'object') {
            // Don't update this field - preserve existing translations
            delete updates[field];
          } else if (updateValue !== '') {
            // Non-empty string: convert to translation object
            const prepared = prepareHeroSlideForStorage({ [field]: updateValue });
            updates[field] = prepared[field];
          } else {
            // Empty string and no existing translations: set to empty translation object
            const prepared = prepareHeroSlideForStorage({ [field]: '' });
            updates[field] = prepared[field];
          }
        } else {
          // Handle other cases (null, undefined, etc.)
          // If existing has translations, preserve them
          if (existingData[field] && typeof existingData[field] === 'object') {
            delete updates[field];
          } else {
            // No existing translations, set to empty
            const prepared = prepareHeroSlideForStorage({ [field]: '' });
            updates[field] = prepared[field];
          }
        }
      }
    }
    
    // Handle non-translatable fields
    if (updates.image !== undefined) updates.image = updates.image.trim();
    if (updates.order !== undefined) updates.order = Number(updates.order) || 0;
    
    // Add updated timestamp
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    await docRef.set(updates, { merge: true });
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









import { Router } from "express";
import admin from "firebase-admin";
import { requireRole } from "../middlewares/roles.js";
import { verifyFirebaseToken } from "../middlewares/auth.js";
import {
  getTranslatedAd,
  prepareAdForStorage,
  mergeTranslations
} from "../utils/translations.js";

const db = admin.firestore();
const router = Router();

// Get all active ads (public endpoint for promotional banner)
router.get("/", async (req, res) => {
  try {
    const lang = req.query.lang || 'en'; // Get language from query parameter, default to 'en'
    
    // Fetch all ads and filter/sort in code to avoid needing a composite index
    const snap = await db.collection("ads").get();

    const ads = snap.docs
      .map((doc) => {
        const data = doc.data();
        // Always return translated version for public endpoint
        return { id: doc.id, ...getTranslatedAd(data, lang) };
      })
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
router.get("/all", requireRole("ADMIN"), async (req, res) => {
  try {
    const includeAllLanguages = req.query.all === 'true'; // Can request all languages
    const lang = req.query.lang || 'en';
    
    const snap = await db.collection("ads").get();

    const ads = snap.docs
      .map((doc) => {
        const data = doc.data();
        
        // If requesting all languages, return raw data
        // Otherwise, return translated version
        if (includeAllLanguages) {
          return { id: doc.id, ...data };
        } else {
          return { id: doc.id, ...getTranslatedAd(data, lang) };
        }
      })
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
      title,
      subtitle,
      link = "",
      order = 0,
      active = true
    } = req.body;

    if (!image || image.trim() === "") {
      return res.status(400).json({ error: "Image URL is required" });
    }

    // Prepare ad data with translation support
    const adData = prepareAdForStorage({
      image: image.trim(),
      title: title || "",
      subtitle: subtitle || "",
      link: link.trim() || "",
      order: Number(order) || 0,
      active: active !== false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const docRef = await db.collection("ads").add(adData);

    res.status(201).json({ id: docRef.id });
  } catch (error) {
    console.error("Error creating ad:", error);
    res.status(500).json({ error: "Failed to create ad", details: error.message });
  }
});

// Update ad (ADMIN only)
router.patch("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    // Get existing ad to merge translations properly
    const docRef = db.collection("ads").doc(req.params.id);
    const existingDoc = await docRef.get();
    
    if (!existingDoc.exists) {
      return res.status(404).json({ error: "Ad not found" });
    }
    
    const existingData = existingDoc.data();
    const updates = { ...req.body };
    
    // Handle translation merges for translatable fields
    const translatableFields = ['title', 'subtitle'];
    
    for (const field of translatableFields) {
      if (updates[field] !== undefined) {
        // If update is a translation object
        if (updates[field] && typeof updates[field] === 'object' && !Array.isArray(updates[field])) {
          // If existing field is also a translation object, merge them
          if (existingData[field] && typeof existingData[field] === 'object' && !Array.isArray(existingData[field])) {
            updates[field] = mergeTranslations(existingData[field], updates[field]);
          } else {
            // Existing is a string or doesn't exist - use the update object directly
            // This handles migration case: existing string -> new translation object
            updates[field] = updates[field];
          }
        } else if (typeof updates[field] === 'string') {
          // If update is a string (empty or not)
          const updateValue = updates[field].trim();
          
          // If empty string, preserve existing data (whether it's a string or translation object)
          if (updateValue === '') {
            if (existingData[field]) {
              // Preserve existing data (string or translation object)
              delete updates[field];
            } else {
              // No existing data: set to empty translation object
              const prepared = prepareAdForStorage({ [field]: '' });
              updates[field] = prepared[field];
            }
          } else {
            // Non-empty string: convert to translation object
            const prepared = prepareAdForStorage({ [field]: updateValue });
            updates[field] = prepared[field];
          }
        } else {
          // Handle other cases (null, undefined, etc.)
          // If existing has translations, preserve them
          if (existingData[field] && typeof existingData[field] === 'object' && !Array.isArray(existingData[field])) {
            delete updates[field];
          } else {
            // No existing translations, set to empty
            const prepared = prepareAdForStorage({ [field]: '' });
            updates[field] = prepared[field];
          }
        }
      }
    }
    
    // Handle non-translatable fields
    if (updates.image !== undefined) {
      updates.image = typeof updates.image === 'string' ? updates.image.trim() : String(updates.image || '');
    }
    if (updates.link !== undefined) {
      updates.link = typeof updates.link === 'string' ? (updates.link.trim() || "") : String(updates.link || "");
    }
    if (updates.order !== undefined) updates.order = Number(updates.order) || 0;
    if (updates.active !== undefined) updates.active = updates.active !== false;
    
    // Add updated timestamp
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    await docRef.set(updates, { merge: true });
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


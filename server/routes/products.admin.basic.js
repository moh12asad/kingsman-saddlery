// server/routes/products.admin.basic.js
import { Router } from "express";
import admin from "firebase-admin";
import { requireRole } from "../middlewares/roles.js";
import { verifyFirebaseToken } from "../middlewares/auth.js";
import {
  getTranslatedProduct,
  prepareProductForStorage,
  mergeTranslations
} from "../utils/translations.js";

const db = admin.firestore();
const router = Router();

// Public: list products
router.get("/", async (req, res) => {
  try {
    const lang = req.query.lang || 'en'; // Get language from query parameter, default to 'en'
    const includeAllLanguages = req.query.all === 'true'; // Admin can request all languages
    
    const snap = await db.collection("products").get();
    const products = snap.docs.map((d) => {
      const data = d.data();
      
      // Convert Firestore Timestamps to ISO strings for JSON serialization
      if (data.createdAt && data.createdAt.toDate) {
        data.createdAt = data.createdAt.toDate().toISOString();
      }
      if (data.updatedAt && data.updatedAt.toDate) {
        data.updatedAt = data.updatedAt.toDate().toISOString();
      }
      
      // If admin requests all languages, return raw data
      // Otherwise, return translated version
      if (includeAllLanguages) {
        return { id: d.id, ...data };
      } else {
        return { id: d.id, ...getTranslatedProduct(data, lang) };
      }
    });
    res.json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    if (error.code === 7 || error.message?.includes("PERMISSION_DENIED") || error.message?.includes("invalid authentication credentials")) {
      res.status(500).json({ 
        error: "Service account lacks Firestore permissions",
        details: "The Firebase service account needs 'Cloud Datastore User' or 'Firebase Admin SDK Administrator Service Agent' role in Google Cloud Console"
      });
    } else {
      res.status(500).json({ error: "Failed to fetch products", details: error.message });
    }
  }
});

// Require authentication for mutating routes
router.use((req, res, next) => {
  if (["GET", "OPTIONS", "HEAD"].includes(req.method)) {
    return next();
  }
  return verifyFirebaseToken(req, res, next);
});

// Create product (ADMIN or STAFF)
router.post("/", requireRole("ADMIN", "STAFF"), async (req, res) => {
  try {
    const {
      price = 0,
      category = "",
      subCategory = "",
      image = "",
      available = true,
      sale = false,
      sale_proce = 0,
      featured = false,
      sku = "",
      brand = "",
      specifications = {},
      videoUrl = "",
      additionalImages = [],
      // Translation fields (can be objects or strings for backward compatibility)
      name,
      description,
      technicalDetails,
      additionalDetails,
      warranty,
      shippingInfo,
    } = req.body;

    // Prepare product data with translation support
    const productData = prepareProductForStorage({
      name: name || "",
      price,
      category,
      subCategory: subCategory || "",
      image,
      description: description || "",
      available,
      sale,
      sale_proce,
      featured: featured || false,
      sku: sku || "",
      brand: brand || "",
      specifications: specifications || {},
      technicalDetails: technicalDetails || "",
      additionalDetails: additionalDetails || "",
      warranty: warranty || "",
      shippingInfo: shippingInfo || "",
      videoUrl: videoUrl || "",
      additionalImages: Array.isArray(additionalImages) ? additionalImages : [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const doc = await db.collection("products").add(productData);

    res.json({ id: doc.id });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: "Failed to create product", details: error.message });
  }
});

// Update product (ADMIN or STAFF)
router.patch("/:id", requireRole("ADMIN", "STAFF"), async (req, res) => {
  try {
    // Get existing product to merge translations properly
    const docRef = db.collection("products").doc(req.params.id);
    const existingDoc = await docRef.get();
    
    if (!existingDoc.exists) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    const existingData = existingDoc.data();
    const updates = { ...req.body };
    
    // Handle translation merges for translatable fields
    const translatableFields = [
      'name',
      'description',
      'technicalDetails',
      'additionalDetails',
      'warranty',
      'shippingInfo'
    ];
    
    for (const field of translatableFields) {
      if (updates[field] !== undefined) {
        // If existing field is a translation object and update is also an object, merge them
        if (existingData[field] && typeof existingData[field] === 'object' && 
            updates[field] && typeof updates[field] === 'object') {
          updates[field] = mergeTranslations(existingData[field], updates[field]);
        } else {
          // Otherwise, prepare for storage (converts strings to translation objects)
          const prepared = prepareProductForStorage({ [field]: updates[field] });
          updates[field] = prepared[field];
        }
      }
    }
    
    // Handle specifications merge
    if (updates.specifications && typeof updates.specifications === 'object') {
      const existingSpecs = existingData.specifications || {};
      const mergedSpecs = { ...existingSpecs };
      
      for (const [key, value] of Object.entries(updates.specifications)) {
        if (existingSpecs[key] && typeof existingSpecs[key] === 'object' &&
            value && typeof value === 'object') {
          mergedSpecs[key] = mergeTranslations(existingSpecs[key], value);
        } else {
          const prepared = prepareProductForStorage({ specifications: { [key]: value } });
          mergedSpecs[key] = prepared.specifications[key];
        }
      }
      updates.specifications = mergedSpecs;
    }
    
    // Add updated timestamp
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    await docRef.set(updates, { merge: true });
    res.json({ ok: true });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Failed to update product", details: error.message });
  }
});

// Delete product (ADMIN only)
router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    await db.collection("products").doc(req.params.id).delete();
    res.json({ ok: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product", details: error.message });
  }
});

export default router;

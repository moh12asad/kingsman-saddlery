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
      categories = [],
      subCategories = [],
      categoryPairs = [],
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
      weight = 0,
      // Translation fields (can be objects or strings for backward compatibility)
      name,
      description,
      technicalDetails,
      additionalDetails,
      warranty,
      shippingInfo,
    } = req.body;

    // Handle new format: categoryPairs (array of {category, subCategory} objects)
    // Also support backward compatibility with old formats
    let finalCategoryPairs = [];
    
    if (Array.isArray(categoryPairs) && categoryPairs.length > 0) {
      // New format: categoryPairs
      finalCategoryPairs = categoryPairs.filter(pair => pair && pair.category);
    } else if (Array.isArray(categories) && categories.length > 0) {
      // Old format: separate arrays - convert to pairs
      finalCategoryPairs = categories.map((cat, idx) => ({
        category: cat,
        subCategory: subCategories[idx] || ""
      }));
    } else if (category) {
      // Oldest format: single category/subCategory - convert to pair
      finalCategoryPairs = [{
        category: category,
        subCategory: subCategory || ""
      }];
    }

    // Extract categories and subCategories arrays for backward compatibility
    const finalCategories = finalCategoryPairs.map(p => p.category).filter(Boolean);
    const finalSubCategories = finalCategoryPairs.map(p => p.subCategory).filter(Boolean);

    // Prepare product data with translation support
    const productData = prepareProductForStorage({
      name: name || "",
      price,
      categoryPairs: finalCategoryPairs,
      categories: finalCategories,
      subCategories: finalSubCategories,
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
      weight: Math.max(0, Number(weight) || 0),
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
    
    // Check if any category-related fields were provided in the request
    const hasCategoryFields = 
      updates.categoryPairs !== undefined ||
      updates.categories !== undefined ||
      updates.category !== undefined ||
      updates.subCategories !== undefined ||
      updates.subCategory !== undefined;
    
    // Only process category fields if they were explicitly provided in the request
    // This prevents unintended data loss when updating other product fields
    if (hasCategoryFields) {
      // Handle categoryPairs: new format (array of {category, subCategory} objects)
      if (updates.categoryPairs !== undefined && Array.isArray(updates.categoryPairs)) {
        // New format: categoryPairs
        updates.categoryPairs = updates.categoryPairs.filter(pair => pair && pair.category);
        // Also update categories and subCategories arrays for backward compatibility
        updates.categories = updates.categoryPairs.map(p => p.category).filter(Boolean);
        updates.subCategories = updates.categoryPairs.map(p => p.subCategory).filter(Boolean);
        
        // BUG FIX: Explicitly clear old single-value fields to prevent fallback to stale data
        // If categoryPairs is empty, clear all category-related fields
        if (updates.categoryPairs.length === 0) {
          updates.category = '';
          updates.subCategory = '';
          updates.categories = [];
          updates.subCategories = [];
        } else {
          // Set first category/subCategory for backward compatibility, but clear if empty
          updates.category = updates.categories[0] || '';
          updates.subCategory = updates.subCategories[0] || '';
        }
      } else {
        // Handle old formats for backward compatibility
        let categoriesProvided = false;
        let subCategoriesProvided = false;
        
        // Handle categories: support both old format (single string) and new format (array)
        if (updates.categories !== undefined) {
          // New format: array
          updates.categories = Array.isArray(updates.categories) ? updates.categories : [];
          categoriesProvided = true;
        } else if (updates.category !== undefined) {
          // Old format: single string - convert to array for consistency
          updates.categories = updates.category ? [updates.category] : [];
          categoriesProvided = true;
        } else {
          // No category field provided - preserve existing data
          updates.categories = existingData.categories || [];
        }
        
        // Handle subCategories: support both old format (single string) and new format (array)
        if (updates.subCategories !== undefined) {
          // New format: array
          updates.subCategories = Array.isArray(updates.subCategories) ? updates.subCategories : [];
          subCategoriesProvided = true;
        } else if (updates.subCategory !== undefined) {
          // Old format: single string - convert to array for consistency
          updates.subCategories = updates.subCategory ? [updates.subCategory] : [];
          subCategoriesProvided = true;
        } else {
          // No subCategory field provided - preserve existing data
          updates.subCategories = existingData.subCategories || [];
        }
        
        // Convert old format to categoryPairs
        // If categories were explicitly provided (even if empty), use them
        // Otherwise, preserve existing categoryPairs
        if (categoriesProvided || subCategoriesProvided) {
          if (updates.categories && updates.categories.length > 0) {
            updates.categoryPairs = updates.categories.map((cat, idx) => ({
              category: cat,
              subCategory: (updates.subCategories && updates.subCategories[idx]) || ""
            }));
          } else {
            // Category fields were explicitly provided but are empty - clear all
            updates.categoryPairs = [];
            updates.category = '';
            updates.subCategory = '';
            updates.categories = [];
            updates.subCategories = [];
          }
        } else {
          // No category fields were provided - preserve existing categoryPairs
          // Don't include category fields in updates to preserve existing data
          delete updates.categories;
          delete updates.subCategories;
          delete updates.categoryPairs;
          delete updates.category;
          delete updates.subCategory;
        }
      }
    }
    // If no category fields were provided, don't include them in updates
    // This preserves existing category data when updating other product fields
    
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
    
    // Validate weight if provided (must be >= 0)
    if (updates.weight !== undefined) {
      updates.weight = Math.max(0, Number(updates.weight) || 0);
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

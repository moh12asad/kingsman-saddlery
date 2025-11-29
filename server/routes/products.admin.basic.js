// server/routes/products.admin.basic.js
import { Router } from "express";
import admin from "firebase-admin";
import { requireRole } from "../middlewares/roles.js";
import { verifyFirebaseToken } from "../middlewares/auth.js";

const db = admin.firestore();
const router = Router();

// Public: list products
router.get("/", async (_req, res) => {
  try {
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
      return { id: d.id, ...data };
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
  const {
    name = "",
    price = 0,
    category = "",
    subCategory = "",
    image = "",
    description = "",
    available = true,
    sale = false,
    sale_proce = 0,
  } = req.body;

  const productData = {
    name,
    price,
    category,
    subCategory: subCategory || "",
    image,
    description: description || "",
    available,
    sale,
    sale_proce,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const doc = await db.collection("products").add(productData);

  res.json({ id: doc.id });
});

// Update product (ADMIN or STAFF)
router.patch("/:id", requireRole("ADMIN", "STAFF"), async (req, res) => {
  await db.collection("products").doc(req.params.id).set(
    {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  res.json({ ok: true });
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

import { Router } from "express";
import admin from "firebase-admin";
import { requireRole } from "../middlewares/roles.js";
import { verifyFirebaseToken } from "../middlewares/auth.js";

const db = admin.firestore();
const router = Router();

// Public endpoint to get best sellers (limited data)
router.get("/best-sellers", async (_req, res) => {
  try {
    const snap = await db
      .collection("orders")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const orders = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        items: data.items || [],
      };
    });

    // Calculate product sales
    const productSales = {};
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const productId = item.productId;
          if (productId) {
            if (!productSales[productId]) {
              productSales[productId] = {
                productId,
                totalQuantity: 0,
              };
            }
            productSales[productId].totalQuantity += item.quantity || 1;
          }
        });
      }
    });

    // Sort by total quantity sold and return top 20 product IDs
    const bestSellerIds = Object.values(productSales)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 20)
      .map(p => p.productId);

    res.json({ productIds: bestSellerIds });
  } catch (error) {
    console.error("best-sellers error", error);
    res.status(500).json({ error: "Failed to fetch best sellers" });
  }
});

router.use(verifyFirebaseToken);

// Create order (for regular users)
router.post("/create", async (req, res) => {
  try {
    const { uid, email, displayName } = req.user;
    const {
      items = [],
      shippingAddress,
      phone,
      status = "pending",
      notes = "",
      subtotal,
      tax,
      total,
      transactionId,
      metadata = {},
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Order items are required" });
    }

    // Delivery address is only required for delivery orders
    const deliveryType = metadata?.deliveryType || "delivery";
    if (deliveryType === "delivery") {
      if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.zipCode) {
        return res.status(400).json({ error: "Complete delivery address is required for delivery orders" });
      }
    }
    // For pickup orders, shippingAddress can be null - no validation needed

    const normalizedItems = items.map((item, index) => ({
      productId: item.productId || item.id || "",
      name: item.name || `Item ${index + 1}`,
      image: item.image || "",
      quantity: Number(item.quantity) || 1,
      price: Number(item.price) || 0,
    }));

    // Calculate subtotal from items (server-side calculation - trusted)
    const computedSubtotal = normalizedItems.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );
    
    // Use provided subtotal if it matches computed, otherwise use computed (more secure)
    const orderSubtotal = (typeof subtotal === "number" && Math.abs(subtotal - computedSubtotal) < 0.01) 
      ? subtotal 
      : computedSubtotal;
    
    const orderTax = typeof tax === "number" && tax >= 0 ? tax : 0;
    
    // Delivery cost constant (must match client-side)
    const DELIVERY_COST = 50;
    const deliveryCost = deliveryType === "delivery" ? DELIVERY_COST : 0;
    
    // Calculate expected total on server (trusted calculation)
    const expectedTotal = orderSubtotal + orderTax + deliveryCost;
    
    // Validate client-provided total matches expected total (with small tolerance for floating point)
    const clientTotal = typeof total === "number" ? total : null;
    if (clientTotal !== null) {
      const difference = Math.abs(clientTotal - expectedTotal);
      if (difference > 0.01) { // Allow 0.01 ILS tolerance for floating point errors
        console.warn(`Order total mismatch: client sent ${clientTotal}, expected ${expectedTotal}. Using server-calculated total.`);
        // Reject or use server-calculated total - using server-calculated for security
      }
    }
    
    // Always use server-calculated total for security
    const orderTotal = expectedTotal;

    const orderDoc = {
      customerId: uid,
      customerName: displayName || req.body.customerName || "Customer",
      customerEmail: email || req.body.customerEmail,
      phone: phone || req.body.phone || "",
      items: normalizedItems,
      shippingAddress: deliveryType === "delivery" ? shippingAddress : null,
      status,
      notes,
      subtotal: orderSubtotal,
      tax: orderTax,
      total: orderTotal,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Add payment transaction details if provided
    if (transactionId) {
      orderDoc.transactionId = transactionId;
    }

    // Merge metadata (includes payment method, transaction ID, etc.)
    if (Object.keys(metadata).length > 0) {
      orderDoc.metadata = metadata;
    }

    const docRef = await db.collection("orders").add(orderDoc);

    res.status(201).json({ 
      id: docRef.id,
      message: "Order created successfully"
    });
  } catch (error) {
    console.error("orders.create error", error);
    res.status(500).json({ error: "Failed to create order", details: error.message });
  }
});

// Get current user's orders
router.get("/my-orders", async (req, res) => {
  try {
    const { uid, email } = req.user;
    
    // Fetch orders by customerId (without orderBy to avoid index requirement)
    // No limit - fetch all user orders
    const snap = await db
      .collection("orders")
      .where("customerId", "==", uid)
      .get();

    // If no orders by customerId, try by email
    let orders = [];
    if (snap.empty && email) {
      const emailSnap = await db
        .collection("orders")
        .where("customerEmail", "==", email)
        .get();
      
      orders = emailSnap.docs.map((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.() ?? null;
        const updatedAt = data.updatedAt?.toDate?.() ?? null;
        return {
          id: doc.id,
          ...data,
          createdAt: createdAt ? createdAt.toISOString() : null,
          updatedAt: updatedAt ? updatedAt.toISOString() : null,
        };
      });
    } else {
      orders = snap.docs.map((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.() ?? null;
        const updatedAt = data.updatedAt?.toDate?.() ?? null;
        return {
          id: doc.id,
          ...data,
          createdAt: createdAt ? createdAt.toISOString() : null,
          updatedAt: updatedAt ? updatedAt.toISOString() : null,
        };
      });
    }

    // Sort by createdAt in descending order (newest first) in memory
    orders.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA; // Descending order
    });

    res.json({ orders });
  } catch (error) {
    console.error("orders.my-orders error", error);
    res.status(500).json({ error: "Failed to fetch orders", details: error.message });
  }
});

// Public endpoint to get best sellers (limited data)
router.get("/best-sellers", async (_req, res) => {
  try {
    const snap = await db
      .collection("orders")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const orders = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        items: data.items || [],
      };
    });

    // Calculate product sales
    const productSales = {};
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const productId = item.productId;
          if (productId) {
            if (!productSales[productId]) {
              productSales[productId] = {
                productId,
                totalQuantity: 0,
              };
            }
            productSales[productId].totalQuantity += item.quantity || 1;
          }
        });
      }
    });

    // Sort by total quantity sold and return top 20 product IDs
    const bestSellerIds = Object.values(productSales)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 20)
      .map(p => p.productId);

    res.json({ productIds: bestSellerIds });
  } catch (error) {
    console.error("best-sellers error", error);
    res.status(500).json({ error: "Failed to fetch best sellers" });
  }
});

router.get("/", requireRole("ADMIN"), async (_req, res) => {
  try {
    // Get all orders, then filter active ones in memory (avoids index requirement)
    // No limit - fetch all orders
    const snap = await db
      .collection("orders")
      .orderBy("createdAt", "desc")
      .get();

    const allOrders = snap.docs.map((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() ?? null;
      const updatedAt = data.updatedAt?.toDate?.() ?? null;
      return {
        id: doc.id,
        ...data,
        createdAt: createdAt ? createdAt.toISOString() : null,
        updatedAt: updatedAt ? updatedAt.toISOString() : null,
      };
    });

    // Filter to only active orders (archivedAt is null or doesn't exist)
    const orders = allOrders.filter(order => !order.archivedAt);

    res.json({ orders });
  } catch (error) {
    console.error("orders.list error", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.post("/", requireRole("ADMIN"), async (req, res) => {
  try {
    const {
      customerId = "",
      customerName = "",
      customerEmail = "",
      items = [],
      status = "pending",
      notes = "",
      subtotal,
      tax,
      total,
      metadata = {},
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Order items are required" });
    }

    const normalizedItems = items.map((item, index) => ({
      productId: item.productId || "",
      name: item.name || `Item ${index + 1}`,
      quantity: Number(item.quantity) || 1,
      price: Number(item.price) || 0,
    }));

    const computedSubtotal = normalizedItems.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );
    const orderSubtotal = typeof subtotal === "number" ? subtotal : computedSubtotal;
    const orderTax = typeof tax === "number" ? tax : 0;
    const orderTotal = typeof total === "number" ? total : orderSubtotal + orderTax;

    const docRef = await db.collection("orders").add({
      customerId,
      customerName,
      customerEmail,
      items: normalizedItems,
      status,
      notes,
      subtotal: orderSubtotal,
      tax: orderTax,
      total: orderTotal,
      metadata,
      createdBy: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({ id: docRef.id });
  } catch (error) {
    console.error("orders.create error", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// Update order status (ADMIN only)
router.patch("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentMethod, deliveryType } = req.body;

    const orderRef = db.collection("orders").doc(id);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({ error: "Order not found" });
    }

    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (status !== undefined) {
      updateData.status = status;
    }

    // Update payment method and delivery type in metadata
    if (paymentMethod !== undefined || deliveryType !== undefined) {
      const currentData = orderDoc.data();
      const currentMetadata = currentData.metadata || {};
      
      updateData.metadata = {
        ...currentMetadata,
        ...(paymentMethod !== undefined && { paymentMethod }),
        ...(deliveryType !== undefined && { deliveryType }),
      };
    }

    await orderRef.set(updateData, { merge: true });

    res.json({ ok: true });
  } catch (error) {
    console.error("orders.update error", error);
    res.status(500).json({ error: "Failed to update order", details: error.message });
  }
});

// Archive order (ADMIN only) - sets archivedAt timestamp in the same collection
router.post("/:id/archive", requireRole("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;

    const orderRef = db.collection("orders").doc(id);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({ error: "Order not found" });
    }

    const orderData = orderDoc.data();

    // Check if already archived
    if (orderData.archivedAt) {
      return res.status(400).json({ error: "Order is already archived" });
    }

    // Set archived timestamp and archivedBy (keep order in same collection)
    await orderRef.set({
      archivedAt: admin.firestore.FieldValue.serverTimestamp(),
      archivedBy: req.user.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.json({ ok: true, message: "Order archived successfully" });
  } catch (error) {
    console.error("orders.archive error", error);
    res.status(500).json({ error: "Failed to archive order", details: error.message });
  }
});

// Get archived orders (ADMIN only) - filters from same collection
router.get("/archived", requireRole("ADMIN"), async (_req, res) => {
  try {
    // Get all orders, then filter archived ones in memory (avoids index requirement)
    // No limit - fetch all orders
    const snap = await db
      .collection("orders")
      .orderBy("createdAt", "desc")
      .get();

    const allOrders = snap.docs.map((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() ?? null;
      const updatedAt = data.updatedAt?.toDate?.() ?? null;
      const archivedAt = data.archivedAt?.toDate?.() ?? null;
      return {
        id: doc.id,
        ...data,
        createdAt: createdAt ? createdAt.toISOString() : null,
        updatedAt: updatedAt ? updatedAt.toISOString() : null,
        archivedAt: archivedAt ? archivedAt.toISOString() : null,
      };
    });

    // Filter to only archived orders (archivedAt is not null)
    const orders = allOrders
      .filter(order => order.archivedAt)
      .sort((a, b) => {
        // Sort by archivedAt descending
        const dateA = a.archivedAt ? new Date(a.archivedAt).getTime() : 0;
        const dateB = b.archivedAt ? new Date(b.archivedAt).getTime() : 0;
        return dateB - dateA;
      });

    res.json({ orders });
  } catch (error) {
    console.error("orders.archived error", error);
    res.status(500).json({ error: "Failed to fetch archived orders", details: error.message });
  }
});

export default router;









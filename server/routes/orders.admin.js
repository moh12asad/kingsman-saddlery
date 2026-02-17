import { Router } from "express";
import admin from "firebase-admin";
import { requireRole } from "../middlewares/roles.js";
import { verifyFirebaseToken } from "../middlewares/auth.js";
import { checkNewUserDiscountEligibility, calculateDiscountAmount } from "../utils/discount.js";
import { validateAndGetCouponDiscount, markCouponAsUsed } from "./coupons.admin.js";

const db = admin.firestore();
const router = Router();

// Helper function to round to 2 decimal places (fix floating point precision)
const roundTo2Decimals = (num) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

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
      couponCode,
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
      // SECURITY: Validate that a delivery zone is provided for delivery orders
      // This prevents orders from being created with 0 delivery cost
      const deliveryZone = metadata?.deliveryZone || null;
      const DELIVERY_ZONE_FEES = {
        telaviv_north: 65,
        jerusalem: 85,
        south: 85,
        westbank: 85
      };
      if (!deliveryZone || !DELIVERY_ZONE_FEES[deliveryZone]) {
        return res.status(400).json({ 
          error: "Valid delivery zone is required for delivery orders",
          details: "Please select a delivery zone (telaviv_north, jerusalem, south, or westbank)"
        });
      }
    }
    // For pickup orders, shippingAddress can be null - no validation needed

    // SECURITY: Validate product prices against database (never trust client-provided prices)
    const productIds = items.map(item => item.productId || item.id).filter(id => id);
    const productPriceMap = new Map();
    const productWeightMap = new Map();
    
    if (productIds.length > 0) {
      try {
        // Fetch all products in parallel for efficiency
        const productPromises = productIds.map(productId => 
          db.collection("products").doc(productId).get()
        );
        const productDocs = await Promise.all(productPromises);
        
        productDocs.forEach((doc, index) => {
          if (doc.exists) {
            const productData = doc.data();
            const productId = productIds[index];
            // Use sale price if on sale, otherwise use regular price
            const actualPrice = productData.sale && productData.sale_proce > 0 
              ? Number(productData.sale_proce) 
              : Number(productData.price);
            
            if (typeof actualPrice === "number" && actualPrice >= 0 && isFinite(actualPrice)) {
              productPriceMap.set(productId, actualPrice);
            }
            
            // Store product weight for delivery cost calculation
            const productWeight = typeof productData.weight === "number" && productData.weight >= 0 
              ? Number(productData.weight) 
              : 0;
            productWeightMap.set(productId, productWeight);
          }
        });
      } catch (error) {
        console.error("Error fetching product prices:", error);
        return res.status(500).json({ 
          error: "Failed to validate product prices", 
          details: "Could not fetch product information from database" 
        });
      }
    }

    // SECURITY: Validate and normalize items with database prices
    const normalizedItems = [];
    const priceMismatches = [];
    
    for (const item of items) {
      const productId = item.productId || item.id || "";
      const clientPrice = Number(item.price) || 0;
      // SECURITY: Convert to number first, then validate (don't default 0 to 1)
      const quantityNum = Number(item.quantity);
      // Only default to 1 if quantity is missing/undefined/null/NaN, but preserve 0 for validation
      const quantity = (item.quantity == null || isNaN(quantityNum)) ? 1 : quantityNum;
      
      // Validate quantity (0 is invalid and should be rejected, not defaulted)
      if (quantity <= 0 || !isFinite(quantity)) {
        return res.status(400).json({ 
          error: "Invalid item quantity", 
          details: `Item ${item.name || productId} has invalid quantity: ${item.quantity}` 
        });
      }
      
      // SECURITY: If productId exists, validate price against database
      if (productId && productPriceMap.has(productId)) {
        const databasePrice = productPriceMap.get(productId);
        
        // Allow small tolerance for floating point errors (0.01 ILS)
        if (Math.abs(clientPrice - databasePrice) > 0.01) {
          priceMismatches.push({
            productId,
            productName: item.name || "Unknown",
            clientPrice,
            databasePrice,
            difference: Math.abs(clientPrice - databasePrice)
          });
          
          // Use database price for security (reject client price)
          console.warn(`Price mismatch for product ${productId}: client sent ${clientPrice}, database has ${databasePrice}. Using database price.`);
        }
        
        // Get weight from item or database
        const itemWeight = (item.weight !== undefined && typeof item.weight === "number" && item.weight >= 0)
          ? item.weight
          : (productWeightMap.has(productId) ? productWeightMap.get(productId) : 0);
        
        // Always use database price (source of truth)
        // Save selectedSize and selectedColor - be permissive with data types
        let savedSize = null;
        let savedColor = null;
        
        if (item.selectedSize !== undefined && item.selectedSize !== null) {
          const sizeStr = String(item.selectedSize).trim();
          if (sizeStr) savedSize = sizeStr;
        }
        
        if (item.selectedColor !== undefined && item.selectedColor !== null) {
          const colorStr = String(item.selectedColor).trim();
          if (colorStr) savedColor = colorStr;
        }
        
        normalizedItems.push({
          productId,
          name: item.name || `Item ${normalizedItems.length + 1}`,
          image: item.image || "",
          quantity,
          price: databasePrice, // SECURITY: Use database price, not client price
          weight: itemWeight, // Store weight for order record
          selectedSize: savedSize,
          selectedColor: savedColor,
        });
      } else if (productId) {
        // Product ID provided but product not found in database
        return res.status(400).json({ 
          error: "Invalid product", 
          details: `Product ${productId} not found in database` 
        });
      } else {
        // No productId - allow custom items (for admin orders or special cases)
        // But validate price is reasonable
        if (clientPrice < 0 || !isFinite(clientPrice)) {
          return res.status(400).json({ 
            error: "Invalid item price", 
            details: `Item ${item.name || "Unknown"} has invalid price: ${item.price}` 
          });
        }
        
        // Get weight from item if provided
        const itemWeight = (item.weight !== undefined && typeof item.weight === "number" && item.weight >= 0)
          ? item.weight
          : 0;
        
        // Save selectedSize and selectedColor - be permissive with data types
        let savedSize = null;
        let savedColor = null;
        
        if (item.selectedSize !== undefined && item.selectedSize !== null) {
          const sizeStr = String(item.selectedSize).trim();
          if (sizeStr) savedSize = sizeStr;
        }
        
        if (item.selectedColor !== undefined && item.selectedColor !== null) {
          const colorStr = String(item.selectedColor).trim();
          if (colorStr) savedColor = colorStr;
        }
        
        normalizedItems.push({
          productId: "",
          name: item.name || `Item ${normalizedItems.length + 1}`,
          image: item.image || "",
          quantity,
          price: clientPrice,
          weight: itemWeight, // Store weight for order record
          selectedSize: savedSize,
          selectedColor: savedColor,
        });
      }
    }
    
    // Log price mismatches for security monitoring
    if (priceMismatches.length > 0) {
      console.warn(`[SECURITY] Price mismatches detected for user ${uid}:`, priceMismatches);
    }

    // Calculate subtotal from items using validated database prices
    const computedSubtotal = roundTo2Decimals(normalizedItems.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    ));
    
    // Use provided subtotal if it matches computed, otherwise use computed (more secure)
    const orderSubtotalBeforeDiscount = (typeof subtotal === "number" && Math.abs(subtotal - computedSubtotal) < 0.01) 
      ? roundTo2Decimals(subtotal)
      : computedSubtotal;
    
    // SECURITY: Check coupon code first (takes precedence over new user discount)
    let discountAmount = 0;
    let discountPercentage = 0;
    let discountType = null;
    let discountReason = null;
    let couponId = null;
    
    if (couponCode && typeof couponCode === "string" && couponCode.trim() !== "") {
      const couponValidation = await validateAndGetCouponDiscount(couponCode.trim(), uid);
      if (couponValidation.valid) {
        discountPercentage = couponValidation.percentage;
        discountAmount = roundTo2Decimals(calculateDiscountAmount(orderSubtotalBeforeDiscount, discountPercentage));
        discountType = "coupon";
        discountReason = `Coupon code: ${couponCode.toUpperCase()}`;
        couponId = couponValidation.couponId;
        console.log(`Applied ${discountPercentage}% coupon discount for user ${uid}: ${discountAmount} ILS off`);
      } else {
        return res.status(400).json({ 
          error: "Invalid coupon code", 
          details: couponValidation.error || "Coupon code validation failed" 
        });
      }
    } else {
      // Check new user discount eligibility if no coupon code
      const discountCheck = await checkNewUserDiscountEligibility(uid);
      if (discountCheck.eligible) {
        discountPercentage = discountCheck.discountPercentage;
        discountAmount = roundTo2Decimals(calculateDiscountAmount(orderSubtotalBeforeDiscount, discountPercentage));
        discountType = "new_user";
        discountReason = discountCheck.reason || "New user discount (first 3 months)";
        console.log(`Applied ${discountPercentage}% new user discount for user ${uid}: ${discountAmount} ILS off`);
      }
    }
    
    // Apply discount to subtotal (discount applies to product prices, before tax and delivery)
    const orderSubtotal = roundTo2Decimals(Math.max(0, orderSubtotalBeforeDiscount - discountAmount));
    
    // Delivery zone fees (in ILS)
    const DELIVERY_ZONE_FEES = {
      telaviv_north: 65,  // North (Tel Aviv to North of Israel)
      jerusalem: 85,      // Jerusalem
      south: 85,          // South
      westbank: 85       // West Bank
    };
    
    // Calculate delivery cost server-side based on zone and weight
    // Each 30kg increment adds another delivery fee (max 2 fees total)
    // Free delivery: orders over 850 ILS (all zones except westbank), or over 1500 ILS (westbank)
    const calculateDeliveryCost = (zone, weight, subtotal) => {
      if (!zone || !DELIVERY_ZONE_FEES[zone]) return 0;
      
      // Free delivery thresholds
      const FREE_DELIVERY_THRESHOLD = zone === "westbank" ? 1500 : 850;
      
      // Check if order qualifies for free delivery
      if (subtotal >= FREE_DELIVERY_THRESHOLD) {
        return 0;
      }
      
      const baseFee = DELIVERY_ZONE_FEES[zone];
      // Calculate number of 30kg increments (each increment adds another base fee)
      // 0-30kg: 1 fee, 31-60kg: 2 fees, 61kg+: 2 fees (capped at 2)
      // Use Math.max(1, Math.ceil(weight / 30)) to correctly handle 0kg case and boundaries
      // Cap at maximum 2 fees
      const increments = Math.min(2, Math.max(1, Math.ceil(weight / 30)));
      
      return baseFee * increments;
    };
    
    // Calculate total weight from items
    // First try to get weight from items, then from product database, then from metadata
    let totalWeight = normalizedItems.reduce((sum, item) => {
      const productId = item.productId;
      let itemWeight = 0;
      
      // Try to get weight from item first (if provided in request)
      if (item.weight !== undefined && typeof item.weight === "number" && item.weight >= 0) {
        itemWeight = item.weight;
      } 
      // Otherwise, get weight from product database
      else if (productId && productWeightMap.has(productId)) {
        itemWeight = productWeightMap.get(productId);
      }
      
      // Multiply by quantity to get total weight for this item
      return sum + (itemWeight * item.quantity);
    }, 0);
    
    // Get delivery zone from metadata
    const deliveryZone = metadata?.deliveryZone || null;
    // Use weight from metadata if provided and totalWeight is 0 (fallback)
    const itemTotalWeight = totalWeight > 0 ? totalWeight : (metadata?.totalWeight || 0);
    
    // Calculate delivery cost based on zone and weight
    // Pass subtotal (after discount) to check for free delivery threshold
    const deliveryCost = roundTo2Decimals(deliveryType === "delivery" && deliveryZone
      ? calculateDeliveryCost(deliveryZone, itemTotalWeight, orderSubtotal)
      : 0);
    
    // Calculate base amount (subtotal + delivery) before tax
    const baseAmount = roundTo2Decimals(orderSubtotal + deliveryCost);
    
    // Calculate tax on the total (subtotal + delivery) (18% VAT)
    // SECURITY: Recalculate tax server-side based on total amount
    const VAT_RATE = 0.18;
    const orderTax = roundTo2Decimals(baseAmount * VAT_RATE);
    
    // Calculate expected total on server (trusted calculation)
    // Total = (Subtotal + Delivery) + Tax on Total
    const expectedTotal = roundTo2Decimals(Math.max(0, baseAmount + orderTax));
    
    // SECURITY: Ensure total is a valid finite number
    if (!isFinite(expectedTotal)) {
      console.error(`Invalid order total calculation for user ${uid}: ${expectedTotal}`);
      return res.status(500).json({ 
        error: "Invalid order calculation", 
        details: "Order total calculation resulted in invalid value" 
      });
    }
    
    // Validate client-provided total matches expected total (with small tolerance for floating point)
    const clientTotal = typeof total === "number" && isFinite(total) ? total : null;
    if (clientTotal !== null) {
      const difference = Math.abs(clientTotal - expectedTotal);
      if (difference > 0.01) { // Allow 0.01 ILS tolerance for floating point errors
        console.warn(`Order total mismatch: client sent ${clientTotal}, expected ${expectedTotal}. Using server-calculated total.`);
        // Reject or use server-calculated total - using server-calculated for security
      }
    }
    
    // Always use server-calculated total for security
    const orderTotal = expectedTotal;

    // Get user's real email if they have Apple Private Relay email
    let customerEmail = email || req.body.customerEmail;
    if (uid) {
      try {
        const userDoc = await db.collection("users").doc(uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          // Use real email if available (for users with Apple Private Relay)
          if (userData.realEmail) {
            customerEmail = userData.realEmail;
            console.log(`[ORDER] Using real email for user ${uid}: ${customerEmail}`);
          }
        }
      } catch (error) {
        console.warn(`[ORDER] Could not fetch user real email: ${error.message}`);
        // Continue with default email
      }
    }

    const orderDoc = {
      customerId: uid,
      customerName: displayName || req.body.customerName || "Customer",
      customerEmail: customerEmail,
      phone: phone || req.body.phone || "",
      items: normalizedItems,
      shippingAddress: deliveryType === "delivery" ? shippingAddress : null,
      status,
      notes,
      subtotal: orderSubtotal, // Subtotal after discount
      subtotalBeforeDiscount: orderSubtotalBeforeDiscount, // Original subtotal before discount
      discount: discountAmount > 0 ? {
        amount: discountAmount,
        percentage: discountPercentage,
        type: discountType,
        reason: discountReason,
        couponCode: discountType === "coupon" ? couponCode?.toUpperCase() : null,
        couponId: couponId || null,
      } : null,
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

    // Mark coupon as used if it was applied
    if (couponCode && discountType === "coupon" && couponId) {
      const markResult = await markCouponAsUsed(couponCode.trim());
      if (!markResult.success) {
        console.error(`Failed to mark coupon as used: ${markResult.error}`);
        // Don't fail the order creation, but log the error
      }
    }

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
      couponCode,
      metadata = {},
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Order items are required" });
    }

    // SECURITY: Validate delivery zone for delivery orders (same validation as regular user endpoint)
    const deliveryType = metadata?.deliveryType || "delivery";
    if (deliveryType === "delivery") {
      // SECURITY: Validate that a delivery zone is provided for delivery orders
      // This prevents orders from being created with 0 delivery cost
      const deliveryZone = metadata?.deliveryZone || null;
      const DELIVERY_ZONE_FEES = {
        telaviv_north: 65,
        jerusalem: 85,
        south: 85,
        westbank: 85
      };
      if (!deliveryZone || !DELIVERY_ZONE_FEES[deliveryZone]) {
        return res.status(400).json({ 
          error: "Valid delivery zone is required for delivery orders",
          details: "Please select a delivery zone (telaviv_north, jerusalem, south, or westbank)"
        });
      }
    }
    // For pickup orders, delivery zone is not required

    // SECURITY: Validate product prices against database (never trust client-provided prices)
    const productIds = items.map(item => item.productId).filter(id => id);
    const productPriceMap = new Map();
    const productWeightMap = new Map();
    
    if (productIds.length > 0) {
      try {
        // Fetch all products in parallel for efficiency
        const productPromises = productIds.map(productId => 
          db.collection("products").doc(productId).get()
        );
        const productDocs = await Promise.all(productPromises);
        
        productDocs.forEach((doc, index) => {
          if (doc.exists) {
            const productData = doc.data();
            const productId = productIds[index];
            // Use sale price if on sale, otherwise use regular price
            const actualPrice = productData.sale && productData.sale_proce > 0 
              ? Number(productData.sale_proce) 
              : Number(productData.price);
            
            if (typeof actualPrice === "number" && actualPrice >= 0 && isFinite(actualPrice)) {
              productPriceMap.set(productId, actualPrice);
            }
            
            // Store product weight for order record
            const productWeight = typeof productData.weight === "number" && productData.weight >= 0 
              ? Number(productData.weight) 
              : 0;
            productWeightMap.set(productId, productWeight);
          }
        });
      } catch (error) {
        console.error("Error fetching product prices:", error);
        return res.status(500).json({ 
          error: "Failed to validate product prices", 
          details: "Could not fetch product information from database" 
        });
      }
    }

    // SECURITY: Validate and normalize items with database prices
    const normalizedItems = [];
    const priceMismatches = [];
    
    for (const item of items) {
      const productId = item.productId || "";
      const clientPrice = Number(item.price) || 0;
      // SECURITY: Convert to number first, then validate (don't default 0 to 1)
      const quantityNum = Number(item.quantity);
      // Only default to 1 if quantity is missing/undefined/null/NaN, but preserve 0 for validation
      const quantity = (item.quantity == null || isNaN(quantityNum)) ? 1 : quantityNum;
      
      // Validate quantity (0 is invalid and should be rejected, not defaulted)
      if (quantity <= 0 || !isFinite(quantity)) {
        return res.status(400).json({ 
          error: "Invalid item quantity", 
          details: `Item ${item.name || productId} has invalid quantity: ${item.quantity}` 
        });
      }
      
      // SECURITY: If productId exists, validate price against database
      if (productId && productPriceMap.has(productId)) {
        const databasePrice = productPriceMap.get(productId);
        
        // Allow small tolerance for floating point errors (0.01 ILS)
        if (Math.abs(clientPrice - databasePrice) > 0.01) {
          priceMismatches.push({
            productId,
            productName: item.name || "Unknown",
            clientPrice,
            databasePrice,
            difference: Math.abs(clientPrice - databasePrice)
          });
          
          // Use database price for security (reject client price)
          console.warn(`[ADMIN ORDER] Price mismatch for product ${productId}: client sent ${clientPrice}, database has ${databasePrice}. Using database price.`);
        }
        
        // Get weight from item or database
        const itemWeight = (item.weight !== undefined && typeof item.weight === "number" && item.weight >= 0)
          ? item.weight
          : (productWeightMap.has(productId) ? productWeightMap.get(productId) : 0);
        
        // Always use database price (source of truth)
        // Save selectedSize and selectedColor - be permissive with data types
        let savedSize = null;
        let savedColor = null;
        
        if (item.selectedSize !== undefined && item.selectedSize !== null) {
          const sizeStr = String(item.selectedSize).trim();
          if (sizeStr) savedSize = sizeStr;
        }
        
        if (item.selectedColor !== undefined && item.selectedColor !== null) {
          const colorStr = String(item.selectedColor).trim();
          if (colorStr) savedColor = colorStr;
        }
        
        normalizedItems.push({
          productId,
          name: item.name || `Item ${normalizedItems.length + 1}`,
          quantity,
          price: databasePrice, // SECURITY: Use database price, not client price
          weight: itemWeight, // Store weight for order record
          selectedSize: savedSize,
          selectedColor: savedColor,
        });
      } else if (productId) {
        // Product ID provided but product not found in database
        return res.status(400).json({ 
          error: "Invalid product", 
          details: `Product ${productId} not found in database` 
        });
      } else {
        // No productId - allow custom items (for admin orders or special cases)
        // But validate price is reasonable
        if (clientPrice < 0 || !isFinite(clientPrice)) {
          return res.status(400).json({ 
            error: "Invalid item price", 
            details: `Item ${item.name || "Unknown"} has invalid price: ${item.price}` 
          });
        }
        
        // Get weight from item if provided
        const itemWeight = (item.weight !== undefined && typeof item.weight === "number" && item.weight >= 0)
          ? item.weight
          : 0;
        
        // Save selectedSize and selectedColor - be permissive with data types
        let savedSize = null;
        let savedColor = null;
        
        if (item.selectedSize !== undefined && item.selectedSize !== null) {
          const sizeStr = String(item.selectedSize).trim();
          if (sizeStr) savedSize = sizeStr;
        }
        
        if (item.selectedColor !== undefined && item.selectedColor !== null) {
          const colorStr = String(item.selectedColor).trim();
          if (colorStr) savedColor = colorStr;
        }
        
        normalizedItems.push({
          productId: "",
          name: item.name || `Item ${normalizedItems.length + 1}`,
          quantity,
          price: clientPrice,
          weight: itemWeight, // Store weight for order record
          selectedSize: savedSize,
          selectedColor: savedColor,
        });
      }
    }
    
    // Log price mismatches for security monitoring
    if (priceMismatches.length > 0) {
      console.warn(`[SECURITY] [ADMIN ORDER] Price mismatches detected:`, priceMismatches);
    }

    const computedSubtotal = normalizedItems.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );
    const orderSubtotalBeforeDiscount = typeof subtotal === "number" ? subtotal : computedSubtotal;
    
    // SECURITY: Check coupon code first (takes precedence over new user discount)
    let discountAmount = 0;
    let discountPercentage = 0;
    let discountInfo = null;
    let couponId = null;
    
    if (couponCode && typeof couponCode === "string" && couponCode.trim() !== "") {
      // SECURITY: For admin orders, if coupon is user-specific, require customerId
      // This prevents admins from bypassing user restrictions on promotional coupons
      const couponUserId = customerId && customerId.trim() !== "" ? customerId : null;
      const couponValidation = await validateAndGetCouponDiscount(couponCode.trim(), couponUserId, true);
      if (couponValidation.valid) {
        discountPercentage = couponValidation.percentage;
        discountAmount = roundTo2Decimals(calculateDiscountAmount(orderSubtotalBeforeDiscount, discountPercentage));
        discountInfo = {
          amount: discountAmount,
          percentage: discountPercentage,
          type: "coupon",
          reason: `Coupon code: ${couponCode.toUpperCase()}`,
          couponCode: couponCode.toUpperCase(),
          couponId: couponValidation.couponId,
        };
        couponId = couponValidation.couponId;
        console.log(`Applied ${discountPercentage}% coupon discount: ${discountAmount} ILS off`);
      } else {
        return res.status(400).json({ 
          error: "Invalid coupon code", 
          details: couponValidation.error || "Coupon code validation failed" 
        });
      }
    } else if (customerId && typeof customerId === "string" && customerId.trim() !== "") {
      // Check new user discount eligibility if no coupon code
      const discountCheck = await checkNewUserDiscountEligibility(customerId);
      if (discountCheck.eligible) {
        discountPercentage = discountCheck.discountPercentage;
        discountAmount = roundTo2Decimals(calculateDiscountAmount(orderSubtotalBeforeDiscount, discountPercentage));
        discountInfo = {
          amount: discountAmount,
          percentage: discountPercentage,
          type: "new_user",
          eligible: discountCheck.eligible,
          reason: discountCheck.reason || "New user discount (first 3 months)"
        };
        console.log(`Applied ${discountPercentage}% new user discount for user ${customerId}: ${discountAmount} ILS off`);
      }
    }
    
    // Apply discount to subtotal
    const orderSubtotal = Math.max(0, orderSubtotalBeforeDiscount - discountAmount);
    const orderTax = typeof tax === "number" ? tax : 0;
    const orderTotal = typeof total === "number" ? total : orderSubtotal + orderTax;

    const docRef = await db.collection("orders").add({
      customerId,
      customerName,
      customerEmail,
      items: normalizedItems,
      status,
      notes,
      subtotal: orderSubtotal, // Subtotal after discount
      subtotalBeforeDiscount: orderSubtotalBeforeDiscount, // Original subtotal before discount
      discount: discountInfo,
      tax: orderTax,
      total: orderTotal,
      metadata,
      createdBy: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Mark coupon as used if it was applied
    if (couponCode && discountInfo?.type === "coupon" && couponId) {
      const markResult = await markCouponAsUsed(couponCode.trim());
      if (!markResult.success) {
        console.error(`Failed to mark coupon as used: ${markResult.error}`);
        // Don't fail the order creation, but log the error
      }
    }

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

// Log failed order (when payment succeeds but order creation fails)
// SECURITY: Uses verifyFirebaseToken to allow users to log their own failures
// but includes strict validation to prevent abuse
router.post("/failed", verifyFirebaseToken, async (req, res) => {
  const requestId = `FAILED-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { uid, email, displayName } = req.user || {};
    
    if (!uid) {
      console.error(`[FAILED_ORDER] [${requestId}] Unauthenticated request`);
      return res.status(401).json({ error: "Authentication required" });
    }

    const {
      transactionId,
      orderData,
      error,
      errorDetails
    } = req.body;

    // SECURITY: Validate required fields
    if (!transactionId || typeof transactionId !== 'string' || transactionId.trim().length === 0) {
      console.error(`[FAILED_ORDER] [${requestId}] [SECURITY] Invalid transaction ID from user ${uid}`);
      return res.status(400).json({ error: "Valid transaction ID is required" });
    }

    // SECURITY: Validate transaction ID format (basic validation - should be non-empty string)
    const trimmedTransactionId = transactionId.trim();
    if (trimmedTransactionId.length < 3 || trimmedTransactionId.length > 100) {
      console.error(`[FAILED_ORDER] [${requestId}] [SECURITY] Suspicious transaction ID length from user ${uid}: ${trimmedTransactionId.length}`);
      return res.status(400).json({ error: "Invalid transaction ID format" });
    }

    if (!orderData || typeof orderData !== 'object') {
      console.error(`[FAILED_ORDER] [${requestId}] [SECURITY] Invalid order data from user ${uid}`);
      return res.status(400).json({ error: "Valid order data is required" });
    }

    // SECURITY: Validate order data structure
    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      console.error(`[FAILED_ORDER] [${requestId}] [SECURITY] Invalid items array from user ${uid}`);
      return res.status(400).json({ error: "Order must contain at least one item" });
    }

    // SECURITY: Validate amount is a positive number
    const amount = parseFloat(orderData.total) || 0;
    if (isNaN(amount) || amount <= 0) {
      console.error(`[FAILED_ORDER] [${requestId}] [SECURITY] Invalid amount from user ${uid}: ${orderData.total}`);
      return res.status(400).json({ error: "Valid order total is required" });
    }

    // SECURITY: Verify user identity matches order data (if provided)
    const orderEmail = orderData.customerEmail || null;
    if (orderEmail && email && orderEmail.toLowerCase() !== email.toLowerCase()) {
      console.warn(`[FAILED_ORDER] [${requestId}] [SECURITY] Email mismatch: user ${uid} (${email}) vs order email (${orderEmail})`);
      // Don't reject, but log for security monitoring
    }

    // SECURITY: Check for duplicate transaction IDs (prevent spam)
    const existingFailedOrder = await db.collection("failed_orders")
      .where("transactionId", "==", trimmedTransactionId)
      .limit(1)
      .get();

    if (!existingFailedOrder.empty) {
      const existingDoc = existingFailedOrder.docs[0];
      const existingData = existingDoc.data();
      
      // If same user, allow update (might be retry)
      if (existingData.userId === uid) {
        console.log(`[FAILED_ORDER] [${requestId}] Duplicate transaction ID from same user ${uid}, updating existing record`);
        // Update existing record instead of creating duplicate
        await db.collection("failed_orders").doc(existingDoc.id).update({
          comment: error || errorDetails || existingData.comment || "Order creation failed after successful payment",
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return res.status(200).json({
          id: existingDoc.id,
          message: "Failed order updated successfully",
          transactionId: trimmedTransactionId
        });
      } else {
        // Different user with same transaction ID - potential security issue
        console.error(`[FAILED_ORDER] [${requestId}] [SECURITY ALERT] Duplicate transaction ID from different user! Transaction: ${trimmedTransactionId}, User: ${uid}, Original User: ${existingData.userId}`);
        return res.status(409).json({ 
          error: "Transaction ID already exists",
          details: "This transaction has already been logged. Please contact support if you believe this is an error."
        });
      }
    }

    // SECURITY: Rate limiting check - prevent spam (check last 5 minutes)
    // CRITICAL FIX: Make rate limiting optional - if query fails (missing index), allow the order to be logged
    // This ensures failed orders are always logged even if Firestore index is missing
    let rateLimitExceeded = false;
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentFailedOrders = await db.collection("failed_orders")
        .where("userId", "==", uid)
        .where("createdAt", ">", admin.firestore.Timestamp.fromDate(fiveMinutesAgo))
        .get();

      if (recentFailedOrders.size >= 5) {
        rateLimitExceeded = true;
        console.error(`[FAILED_ORDER] [${requestId}] [SECURITY] Rate limit exceeded for user ${uid}: ${recentFailedOrders.size} failed orders in last 5 minutes`);
      }
    } catch (rateLimitError) {
      // If rate limiting query fails (e.g., missing Firestore index), log warning but allow order to be logged
      // This is critical - we don't want to prevent failed order logging due to missing index
      console.warn(`[FAILED_ORDER] [${requestId}] Rate limiting query failed (likely missing Firestore index). Allowing order to be logged. Error:`, rateLimitError.message);
      console.warn(`[FAILED_ORDER] [${requestId}] To fix: Create Firestore composite index on failed_orders collection with fields: userId (Ascending), createdAt (Ascending)`);
      // Continue without rate limiting - better to log the order than to block it
      rateLimitExceeded = false;
    }

    if (rateLimitExceeded) {
      return res.status(429).json({ 
        error: "Too many requests",
        details: "You have submitted too many failed order reports. Please wait a few minutes or contact support."
      });
    }

    // Create failed order document
    const failedOrderDoc = {
      transactionId: trimmedTransactionId,
      userId: uid,
      userEmail: email || orderEmail || null,
      userName: displayName || orderData.customerName || "Unknown",
      amount: amount,
      currency: "ILS",
      orderData: {
        items: orderData.items || [],
        shippingAddress: orderData.shippingAddress || null,
        phone: orderData.phone || null,
        notes: orderData.notes || "",
        subtotal: orderData.subtotal || 0,
        subtotalBeforeDiscount: orderData.subtotalBeforeDiscount || 0,
        tax: orderData.tax || 0,
        total: amount,
        deliveryType: orderData.metadata?.deliveryType || null,
        deliveryZone: orderData.metadata?.deliveryZone || null,
        metadata: orderData.metadata || {}
      },
      comment: error || errorDetails || "Order creation failed after successful payment",
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection("failed_orders").add(failedOrderDoc);

    console.log(`[FAILED_ORDER] [${requestId}] Logged failed order: ${docRef.id} for transaction: ${trimmedTransactionId}, user: ${uid}`);

    res.status(201).json({
      id: docRef.id,
      message: "Failed order logged successfully",
      transactionId: trimmedTransactionId
    });
  } catch (error) {
    console.error(`[FAILED_ORDER] [${requestId}] Error:`, error);
    res.status(500).json({ error: "Failed to log failed order", details: error.message });
  }
});

// Get all failed orders (admin only)
router.get("/failed", requireRole("ADMIN", "STAFF"), async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    
    let query = db.collection("failed_orders").orderBy("createdAt", "desc");
    
    if (status) {
      query = query.where("status", "==", status);
    }
    
    if (limit) {
      query = query.limit(parseInt(limit));
    }
    
    const snap = await query.get();
    
    const failedOrders = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        transactionId: data.transactionId,
        userId: data.userId,
        userEmail: data.userEmail,
        userName: data.userName,
        amount: data.amount,
        currency: data.currency,
        orderData: data.orderData,
        comment: data.comment,
        status: data.status,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
      };
    });

    res.json({ failedOrders, count: failedOrders.length });
  } catch (error) {
    console.error("orders.failed.get error", error);
    res.status(500).json({ error: "Failed to fetch failed orders", details: error.message });
  }
});

// Get single failed order by ID (admin only)
router.get("/failed/:id", requireRole("ADMIN", "STAFF"), async (req, res) => {
  try {
    const { id } = req.params;
    
    const doc = await db.collection("failed_orders").doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: "Failed order not found" });
    }
    
    const data = doc.data();
    const failedOrder = {
      id: doc.id,
      transactionId: data.transactionId,
      userId: data.userId,
      userEmail: data.userEmail,
      userName: data.userName,
      amount: data.amount,
      currency: data.currency,
      orderData: data.orderData,
      comment: data.comment,
      status: data.status,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
    };

    res.json({ failedOrder });
  } catch (error) {
    console.error("orders.failed.getById error", error);
    res.status(500).json({ error: "Failed to fetch failed order", details: error.message });
  }
});

// Update failed order status/comment (admin only)
router.patch("/failed/:id", requireRole("ADMIN", "STAFF"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;
    
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (status !== undefined) {
      updateData.status = status;
    }
    
    if (comment !== undefined) {
      updateData.comment = comment;
    }
    
    await db.collection("failed_orders").doc(id).update(updateData);
    
    res.json({ message: "Failed order updated successfully" });
  } catch (error) {
    console.error("orders.failed.update error", error);
    res.status(500).json({ error: "Failed to update failed order", details: error.message });
  }
});

export default router;









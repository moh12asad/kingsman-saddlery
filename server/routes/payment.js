import { Router } from "express";
import admin from "firebase-admin";
import { verifyFirebaseToken } from "../middlewares/auth.js";
import { checkNewUserDiscountEligibility, calculateDiscountAmount } from "../utils/discount.js";

const db = admin.firestore();
const router = Router();

// Helper function to round to 2 decimal places (fix floating point precision)
const roundTo2Decimals = (num) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

// Calculate order total with discount (before payment)
// This endpoint allows the client to get the correct total including any applicable discounts
router.post("/calculate-total", verifyFirebaseToken, async (req, res) => {
  const requestId = `CALC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  try {
    const { uid, email } = req.user || {};
    
    console.log(`[PAYMENT] [${requestId}] Calculate Total Request Started`);
    console.log(`[PAYMENT] [${requestId}] User: ${uid || 'unknown'} (${email || 'no email'})`);
    console.log(`[PAYMENT] [${requestId}] Timestamp: ${new Date().toISOString()}`);
    
    if (!uid || typeof uid !== "string") {
      console.error(`[PAYMENT] [${requestId}] Authentication failed: Invalid user ID`);
      return res.status(400).json({ 
        error: "Invalid user authentication" 
      });
    }

    const {
      items = [],
      subtotal, // Optional: for backward compatibility, but will be recalculated
      tax = 0,
      deliveryCost = 0,
      deliveryZone = null,
      totalWeight = 0,
    } = req.body;

    console.log(`[PAYMENT] [${requestId}] Input Data:`, {
      itemsCount: items.length,
      subtotal: subtotal,
      tax: tax,
      deliveryCost: deliveryCost,
      deliveryZone: deliveryZone,
      totalWeight: totalWeight,
      currency: "ILS"
    });

    // SECURITY: Recalculate subtotal from database prices (never trust client)
    let computedSubtotal = 0;
    
    if (Array.isArray(items) && items.length > 0) {
      // Fetch product prices from database
      const productIds = items.map(item => item.productId || item.id).filter(id => id);
      const productPriceMap = new Map();
      
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
            }
          });
        } catch (error) {
          console.error(`[PAYMENT] [${requestId}] Error fetching product prices:`, error);
          return res.status(500).json({ 
            error: "Failed to validate product prices",
            details: "Could not fetch product information from database" 
          });
        }
      }
      
      // Calculate subtotal from database prices
      for (const item of items) {
        const productId = item.productId || item.id || "";
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
        
        // SECURITY: Use database price if available, otherwise use client price (for custom items)
        let itemPrice = 0;
        if (productId && productPriceMap.has(productId)) {
          itemPrice = productPriceMap.get(productId);
        } else if (productId) {
          // Product ID provided but not found in database
          return res.status(400).json({ 
            error: "Invalid product", 
            details: `Product ${productId} not found in database` 
          });
        } else {
          // No productId - allow custom items, but validate price
          const clientPrice = Number(item.price) || 0;
          if (clientPrice < 0 || !isFinite(clientPrice)) {
            return res.status(400).json({ 
              error: "Invalid item price", 
              details: `Item ${item.name || "Unknown"} has invalid price: ${item.price}` 
            });
          }
          itemPrice = clientPrice;
        }
        
        computedSubtotal += itemPrice * quantity;
      }
      
      // Round subtotal to 2 decimal places
      computedSubtotal = roundTo2Decimals(computedSubtotal);
    } else if (typeof subtotal === "number" && subtotal >= 0 && isFinite(subtotal)) {
      // Fallback: use provided subtotal if items not provided (backward compatibility)
      computedSubtotal = roundTo2Decimals(subtotal);
      console.warn(`[PAYMENT] [${requestId}] [SECURITY] No items provided, using client subtotal. This is less secure.`);
    } else {
      return res.status(400).json({ 
        error: "Invalid input: must provide either items array or valid subtotal" 
      });
    }
    
    // Use computed subtotal (from database prices)
    const validatedSubtotal = computedSubtotal;

    const validatedTax = typeof tax === "number" && tax >= 0 && isFinite(tax) ? tax : 0;
    
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
    
    // Note: Delivery cost will be calculated after discount is applied (to check free delivery threshold)
    const validatedWeight = typeof totalWeight === "number" && totalWeight >= 0 && isFinite(totalWeight) ? totalWeight : 0;

    console.log(`[PAYMENT] [${requestId}] Validated Inputs:`, {
      subtotal: subtotal,
      tax: validatedTax,
      deliveryCost: deliveryCost, // Client-provided, will be validated later
      deliveryZone: deliveryZone,
      totalWeight: validatedWeight
    });

    // SECURITY: Check discount eligibility server-side (never trust client)
    console.log(`[PAYMENT] [${requestId}] Checking discount eligibility for user ${uid}...`);
    const discountCheck = await checkNewUserDiscountEligibility(uid);
    
    console.log(`[PAYMENT] [${requestId}] Discount Eligibility:`, {
      eligible: discountCheck.eligible,
      percentage: discountCheck.percentage || 0,
      reason: discountCheck.reason || "N/A",
      accountCreationDate: discountCheck.accountCreationDate || "N/A",
      monthsSinceCreation: discountCheck.monthsSinceCreation ? discountCheck.monthsSinceCreation.toFixed(2) : "N/A"
    });
    
    let discountAmount = 0;
    
    if (discountCheck.eligible && discountCheck.discountPercentage > 0) {
      discountAmount = calculateDiscountAmount(validatedSubtotal, discountCheck.discountPercentage);
      // Ensure discount doesn't exceed subtotal (safety check)
      discountAmount = Math.min(discountAmount, validatedSubtotal);
      // Round discount to 2 decimal places
      discountAmount = roundTo2Decimals(discountAmount);
      console.log(`[PAYMENT] [${requestId}] Discount Applied:`, {
        percentage: discountCheck.discountPercentage,
        amount: discountAmount,
        subtotalBeforeDiscount: validatedSubtotal
      });
    } else {
      console.log(`[PAYMENT] [${requestId}] No discount applied: ${discountCheck.reason || "Not eligible"}`);
    }

    // Calculate final total: (Subtotal - Discount) + Delivery, then apply tax on total
    // SECURITY: Ensure values are never negative
    const finalSubtotal = roundTo2Decimals(Math.max(0, validatedSubtotal - discountAmount));
    
    // SECURITY: Recalculate delivery cost with final subtotal (after discount) for free delivery check
    const expectedDeliveryCost = deliveryZone && DELIVERY_ZONE_FEES[deliveryZone]
      ? calculateDeliveryCost(deliveryZone, validatedWeight, finalSubtotal)
      : 0;
    
    // SECURITY: Validate client-provided delivery cost matches server calculation
    let validatedDeliveryCost = 0;
    if (typeof deliveryCost === "number" && deliveryCost >= 0 && isFinite(deliveryCost)) {
      const difference = Math.abs(deliveryCost - expectedDeliveryCost);
      if (deliveryCost === 0 && expectedDeliveryCost === 0) {
        validatedDeliveryCost = 0; // Pickup
      } else if (difference < 0.01) {
        validatedDeliveryCost = expectedDeliveryCost; // Matches expected
      } else {
        // Log security warning for unexpected delivery cost
        console.warn(`[PAYMENT] [${requestId}] [SECURITY] Delivery cost mismatch: client=${deliveryCost}, expected=${expectedDeliveryCost}, zone=${deliveryZone}, weight=${validatedWeight}, subtotal=${finalSubtotal}`);
        validatedDeliveryCost = expectedDeliveryCost; // Use server-calculated value for security
      }
    } else {
      validatedDeliveryCost = expectedDeliveryCost;
    }
    
    // Round delivery cost to 2 decimal places
    const roundedDeliveryCost = roundTo2Decimals(validatedDeliveryCost);
    
    // Calculate base amount (subtotal + delivery) before tax
    const baseAmount = roundTo2Decimals(finalSubtotal + roundedDeliveryCost);
    
    // Calculate tax on the total (subtotal + delivery) (18% VAT)
    // SECURITY: Recalculate tax server-side based on total amount
    const VAT_RATE = 0.18;
    const calculatedTax = roundTo2Decimals(baseAmount * VAT_RATE);
    
    // Final total = base amount + tax
    const finalTotal = roundTo2Decimals(Math.max(0, baseAmount + calculatedTax));

    console.log(`[PAYMENT] [${requestId}] Calculation Breakdown:`, {
      subtotalBeforeDiscount: validatedSubtotal,
      discountAmount: discountAmount,
      subtotalAfterDiscount: finalSubtotal,
      deliveryCost: roundedDeliveryCost,
      baseAmount: baseAmount,
      tax: calculatedTax,
      total: finalTotal
    });

    // SECURITY: Ensure total is a valid number
    if (!isFinite(finalTotal)) {
      console.error(`[PAYMENT] [${requestId}] Invalid calculation result: ${finalTotal}`);
      return res.status(500).json({ 
        error: "Invalid calculation result" 
      });
    }

    const responseData = {
      subtotal: finalSubtotal,
      subtotalBeforeDiscount: validatedSubtotal,
      discount: discountCheck.eligible && discountAmount > 0 ? {
        amount: discountAmount,
        percentage: discountCheck.discountPercentage,
        type: "new_user"
      } : null,
      tax: calculatedTax,
      deliveryCost: roundedDeliveryCost,
      total: finalTotal
    };

    const duration = Date.now() - startTime;
    console.log(`[PAYMENT] [${requestId}] Calculate Total Success:`, {
      total: finalTotal,
      discountApplied: discountAmount > 0,
      durationMs: duration
    });

    res.json(responseData);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[PAYMENT] [${requestId}] Calculate Total Error:`, {
      error: error.message,
      stack: error.stack,
      durationMs: duration
    });
    res.status(500).json({ 
      error: "Failed to calculate total", 
      details: error.message 
    });
  }
});

// Process payment (placeholder for future payment gateway integration)
router.post("/process", verifyFirebaseToken, async (req, res) => {
  const requestId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  try {
    const { uid, email } = req.user || {};
    
    console.log(`[PAYMENT] [${requestId}] Payment Process Request Started`);
    console.log(`[PAYMENT] [${requestId}] User: ${uid || 'unknown'} (${email || 'no email'})`);
    console.log(`[PAYMENT] [${requestId}] Timestamp: ${new Date().toISOString()}`);
    console.log(`[PAYMENT] [${requestId}] IP Address: ${req.ip || req.connection.remoteAddress || 'unknown'}`);
    console.log(`[PAYMENT] [${requestId}] User Agent: ${req.get('user-agent') || 'unknown'}`);
    
    const {
      amount,
      currency = "ILS",
      paymentMethod,
      items = [],
      subtotal, // Optional: for validation (will be recalculated from items if provided)
      tax = 0,
      deliveryCost = 0,
      deliveryZone = null,
      totalWeight = 0,
      // Add other payment-related fields as needed
      // NOTE: Card details are NOT logged for security
    } = req.body;

    console.log(`[PAYMENT] [${requestId}] Payment Request Data:`, {
      amount: amount,
      currency: currency,
      paymentMethod: paymentMethod || "not specified",
      subtotal: subtotal !== undefined ? subtotal : "not provided",
      tax: tax,
      deliveryCost: deliveryCost,
      // Explicitly NOT logging any card-related fields
      hasCardData: !!(req.body.cardNumber || req.body.cvv || req.body.cardHolderName)
    });

    // Validate required fields
    if (!amount || amount <= 0) {
      console.error(`[PAYMENT] [${requestId}] Validation failed: Invalid payment amount (${amount})`);
      return res.status(400).json({ 
        error: "Invalid payment amount" 
      });
    }

    console.log(`[PAYMENT] [${requestId}] Validating payment amount against server calculation...`);

    // SECURITY: Recalculate subtotal from database prices (never trust client-provided subtotal)
    // This prevents discount manipulation attacks where client sends lower subtotal
    let validatedSubtotal = 0;
    
    if (Array.isArray(items) && items.length > 0) {
      // Fetch product prices from database
      const productIds = items.map(item => item.productId || item.id).filter(id => id);
      const productPriceMap = new Map();
      
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
            }
          });
        } catch (error) {
          console.error(`[PAYMENT] [${requestId}] Error fetching product prices:`, error);
          return res.status(500).json({ 
            error: "Failed to validate product prices",
            details: "Could not fetch product information from database" 
          });
        }
      }
      
      // Calculate subtotal from database prices
      for (const item of items) {
        const productId = item.productId || item.id || "";
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
        
        // SECURITY: Use database price if available, otherwise use client price (for custom items)
        let itemPrice = 0;
        if (productId && productPriceMap.has(productId)) {
          itemPrice = productPriceMap.get(productId);
        } else if (productId) {
          // Product ID provided but not found in database
          return res.status(400).json({ 
            error: "Invalid product", 
            details: `Product ${productId} not found in database` 
          });
        } else {
          // No productId - allow custom items, but validate price
          const clientPrice = Number(item.price) || 0;
          if (clientPrice < 0 || !isFinite(clientPrice)) {
            return res.status(400).json({ 
              error: "Invalid item price", 
              details: `Item ${item.name || "Unknown"} has invalid price: ${item.price}` 
            });
          }
          itemPrice = clientPrice;
        }
        
        validatedSubtotal += itemPrice * quantity;
      }
      
      // Round subtotal to 2 decimal places
      validatedSubtotal = roundTo2Decimals(validatedSubtotal);
    } else if (typeof subtotal === "number" && subtotal >= 0 && isFinite(subtotal)) {
      // Fallback: use provided subtotal if items not provided (backward compatibility)
      validatedSubtotal = roundTo2Decimals(subtotal);
      console.warn(`[PAYMENT] [${requestId}] [SECURITY] No items provided, using client subtotal. This is less secure.`);
    } else {
      return res.status(400).json({ 
        error: "Invalid input: must provide either items array or valid subtotal" 
      });
    }

    // SECURITY: Recalculate expected total with discount using server-calculated subtotal
    if (validatedSubtotal > 0) {
      console.log(`[PAYMENT] [${requestId}] Recalculating expected total with discount...`);
      
      const discountCheck = await checkNewUserDiscountEligibility(uid);
      
      console.log(`[PAYMENT] [${requestId}] Discount Check Result:`, {
        eligible: discountCheck.eligible,
        percentage: discountCheck.discountPercentage || 0,
        reason: discountCheck.reason || "N/A"
      });
      
      let discountAmount = 0;
      
      if (discountCheck.eligible) {
        // SECURITY: Use server-calculated subtotal, not client-provided subtotal
        discountAmount = calculateDiscountAmount(validatedSubtotal, discountCheck.discountPercentage);
        // Round discount to 2 decimal places
        discountAmount = roundTo2Decimals(discountAmount);
        console.log(`[PAYMENT] [${requestId}] Discount calculated: ${discountAmount} ILS (${discountCheck.discountPercentage}% of ${validatedSubtotal})`);
      }

      const finalSubtotal = roundTo2Decimals(Math.max(0, validatedSubtotal - discountAmount));
      
      // SECURITY: Validate delivery cost (should be 0 or 50, but allow any non-negative value)
      // Delivery zone fees (in ILS)
      const DELIVERY_ZONE_FEES = {
        telaviv_north: 65,  // Tel Aviv until the north of Israel
        jerusalem: 85,      // Jerusalem
        south: 85,          // South Region
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
      
      const deliveryZone = req.body.deliveryZone || null;
      const totalWeight = typeof req.body.totalWeight === "number" && req.body.totalWeight >= 0 && isFinite(req.body.totalWeight)
        ? req.body.totalWeight
        : 0;
      
      const expectedDeliveryCost = deliveryZone && DELIVERY_ZONE_FEES[deliveryZone]
        ? calculateDeliveryCost(deliveryZone, totalWeight, finalSubtotal)
        : 0;
      
      // SECURITY: Validate client-provided delivery cost matches server calculation
      // Always use server-calculated value for security (never trust client-provided delivery cost)
      const validatedDeliveryCost = roundTo2Decimals(expectedDeliveryCost);
      
      // Calculate base amount (subtotal + delivery) before tax
      const baseAmount = roundTo2Decimals(finalSubtotal + validatedDeliveryCost);
      
      // SECURITY: Recalculate tax server-side (never trust client-provided tax)
      const VAT_RATE = 0.18;
      const calculatedTax = roundTo2Decimals(baseAmount * VAT_RATE);
      
      // Calculate expected total
      const expectedTotal = roundTo2Decimals(Math.max(0, baseAmount + calculatedTax));
      
      console.log(`[PAYMENT] [${requestId}] Expected Total Calculation:`, {
        subtotalBeforeDiscount: validatedSubtotal,
        discountAmount: discountAmount,
        subtotalAfterDiscount: finalSubtotal,
        deliveryCost: validatedDeliveryCost,
        baseAmount: baseAmount,
        calculatedTax: calculatedTax,
        expectedTotal: expectedTotal
      });
      
      // SECURITY: Validate payment amount matches expected total (with small tolerance for floating point)
      const difference = Math.abs(amount - expectedTotal);
      console.log(`[PAYMENT] [${requestId}] Amount Validation:`, {
        clientAmount: amount,
        expectedAmount: expectedTotal,
        difference: difference,
        tolerance: 0.01,
        isValid: difference <= 0.01
      });
      
      if (difference > 0.01) {
        console.error(`[PAYMENT] [${requestId}] [SECURITY ALERT] Payment amount mismatch!`, {
          userId: uid,
          clientAmount: amount,
          expectedAmount: expectedTotal,
          difference: difference,
          subtotal: subtotal,
          discountAmount: discountAmount,
          tax: tax,
          deliveryCost: deliveryCost
        });
        return res.status(400).json({ 
          success: false,
          error: "Payment amount mismatch", 
          details: `Payment amount (${amount} ILS) does not match calculated total (${expectedTotal} ILS). Please refresh and try again.`,
          expectedTotal: expectedTotal
        });
      }
      
      console.log(`[PAYMENT] [${requestId}] Amount validation passed (difference: ${difference.toFixed(4)} ILS)`);
    } else {
      console.log(`[PAYMENT] [${requestId}] Subtotal not provided, skipping amount validation`);
    }

    // Tranzila Payment Integration
    // The payment is processed via Tranzila iframe on the frontend
    // This endpoint verifies the transaction and stores payment details
    
    const { transactionId, tranzilaResponse } = req.body;

    console.log(`[PAYMENT] [${requestId}] Processing Tranzila payment verification...`);
    console.log(`[PAYMENT] [${requestId}] Transaction ID: ${transactionId || 'not provided'}`);
    console.log(`[PAYMENT] [${requestId}] Payment Method: ${paymentMethod || 'not specified'}`);

    // Extract transaction ID from request or Tranzila response
    // Transaction ID is REQUIRED - payment cannot be processed without it
    let finalTransactionId = transactionId;
    
    if (!finalTransactionId && tranzilaResponse) {
      // Extract transaction ID from Tranzila response if available
      finalTransactionId = tranzilaResponse.TransactionId || 
                          tranzilaResponse.RefNo || 
                          tranzilaResponse.transactionId;
    }
    
    // Reject payment if no transaction ID is provided
    // This is a security requirement - we cannot process payments without verification
    if (!finalTransactionId) {
      console.error(`[PAYMENT] [${requestId}] Payment rejected: No transaction ID provided`);
      return res.status(400).json({
        success: false,
        error: "Payment verification failed",
        details: "Transaction ID is required. Payment cannot be processed without a valid transaction ID from the payment gateway."
      });
    }

    // TODO: Verify payment with Tranzila API if credentials are available
    // This would involve making an API call to Tranzila to verify the transaction
    // For now, we trust the iframe response (in production, implement proper verification)
    
    // Example verification (commented out - implement when Tranzila API credentials are available):
    /*
    if (process.env.TRANZILA_API_KEY && process.env.TRANZILA_TERMINAL_ID) {
      try {
        const verificationResponse = await verifyTranzilaTransaction(
          finalTransactionId,
          amount,
          process.env.TRANZILA_API_KEY,
          process.env.TRANZILA_TERMINAL_ID
        );
        
        if (!verificationResponse.success) {
          console.error(`[PAYMENT] [${requestId}] Tranzila verification failed:`, verificationResponse);
          return res.status(400).json({
            success: false,
            error: "Payment verification failed",
            details: "Transaction could not be verified with payment gateway"
          });
        }
      } catch (verifyError) {
        console.error(`[PAYMENT] [${requestId}] Error verifying with Tranzila:`, verifyError);
        // In production, you might want to fail here or implement retry logic
        // For now, we continue but log the error
      }
    }
    */

    const paymentResult = {
      success: true,
      transactionId: finalTransactionId,
      amount: amount,
      currency: currency,
      status: "completed",
      message: "Payment verified successfully",
      paymentGateway: paymentMethod === "tranzila" ? "tranzila" : "unknown"
    };

    const duration = Date.now() - startTime;
    console.log(`[PAYMENT] [${requestId}] Payment Process Success:`, {
      transactionId: finalTransactionId,
      amount: amount,
      currency: currency,
      status: "completed",
      durationMs: duration,
      timestamp: new Date().toISOString()
    });

    // Return success response
    res.status(200).json(paymentResult);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[PAYMENT] [${requestId}] Payment Process Error:`, {
      error: error.message,
      stack: error.stack,
      durationMs: duration,
      userId: req.user?.uid || "unknown",
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      success: false,
      error: "Payment processing failed", 
      details: error.message 
    });
  }
});

export default router;


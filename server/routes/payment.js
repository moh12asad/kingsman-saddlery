import { Router } from "express";
import { verifyFirebaseToken } from "../middlewares/auth.js";
import { checkNewUserDiscountEligibility, calculateDiscountAmount } from "../utils/discount.js";

const router = Router();

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
      subtotal,
      tax = 0,
      deliveryCost = 0,
      deliveryZone = null,
      totalWeight = 0,
    } = req.body;

    console.log(`[PAYMENT] [${requestId}] Input Data:`, {
      subtotal: subtotal,
      tax: tax,
      deliveryCost: deliveryCost,
      deliveryZone: deliveryZone,
      totalWeight: totalWeight,
      currency: "ILS"
    });

    // SECURITY: Validate all inputs are numbers and non-negative
    if (typeof subtotal !== "number" || subtotal < 0 || !isFinite(subtotal)) {
      console.error(`[PAYMENT] [${requestId}] Validation failed: Invalid subtotal (${subtotal})`);
      return res.status(400).json({ 
        error: "Invalid subtotal: must be a non-negative number" 
      });
    }

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
    const calculateDeliveryCost = (zone, weight) => {
      if (!zone || !DELIVERY_ZONE_FEES[zone]) return 0;
      
      const baseFee = DELIVERY_ZONE_FEES[zone];
      // Calculate number of 30kg increments (each increment adds another base fee)
      // 0-30kg: 1 fee, 31-60kg: 2 fees, 61kg+: 2 fees (capped at 2)
      // Use Math.max(1, Math.ceil(weight / 30)) to correctly handle 0kg case and boundaries
      // Cap at maximum 2 fees
      const increments = Math.min(2, Math.max(1, Math.ceil(weight / 30)));
      
      return baseFee * increments;
    };
    
    // SECURITY: Calculate expected delivery cost server-side
    const validatedWeight = typeof totalWeight === "number" && totalWeight >= 0 && isFinite(totalWeight) ? totalWeight : 0;
    const expectedDeliveryCost = deliveryZone && DELIVERY_ZONE_FEES[deliveryZone]
      ? calculateDeliveryCost(deliveryZone, validatedWeight)
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
        console.warn(`[PAYMENT] [${requestId}] [SECURITY] Delivery cost mismatch: client=${deliveryCost}, expected=${expectedDeliveryCost}, zone=${deliveryZone}, weight=${validatedWeight}`);
        validatedDeliveryCost = expectedDeliveryCost; // Use server-calculated value for security
      }
    }

    console.log(`[PAYMENT] [${requestId}] Validated Inputs:`, {
      subtotal: subtotal,
      tax: validatedTax,
      deliveryCost: validatedDeliveryCost
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
      discountAmount = calculateDiscountAmount(subtotal, discountCheck.discountPercentage);
      // Ensure discount doesn't exceed subtotal (safety check)
      discountAmount = Math.min(discountAmount, subtotal);
      console.log(`[PAYMENT] [${requestId}] Discount Applied:`, {
        percentage: discountCheck.discountPercentage,
        amount: discountAmount,
        subtotalBeforeDiscount: subtotal
      });
    } else {
      console.log(`[PAYMENT] [${requestId}] No discount applied: ${discountCheck.reason || "Not eligible"}`);
    }

    // Calculate final total: (Subtotal - Discount) + Delivery, then apply tax on total
    // SECURITY: Ensure values are never negative
    const finalSubtotal = Math.max(0, subtotal - discountAmount);
    
    // Calculate base amount (subtotal + delivery) before tax
    const baseAmount = finalSubtotal + validatedDeliveryCost;
    
    // Calculate tax on the total (subtotal + delivery) (18% VAT)
    // SECURITY: Recalculate tax server-side based on total amount
    const VAT_RATE = 0.18;
    const calculatedTax = baseAmount * VAT_RATE;
    
    // Final total = base amount + tax
    const finalTotal = Math.max(0, baseAmount + calculatedTax);

    console.log(`[PAYMENT] [${requestId}] Calculation Breakdown:`, {
      subtotalBeforeDiscount: subtotal,
      discountAmount: discountAmount,
      subtotalAfterDiscount: finalSubtotal,
      deliveryCost: validatedDeliveryCost,
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
      subtotalBeforeDiscount: subtotal,
      discount: discountCheck.eligible && discountAmount > 0 ? {
        amount: discountAmount,
        percentage: discountCheck.discountPercentage,
        type: "new_user"
      } : null,
      tax: calculatedTax,
      deliveryCost: validatedDeliveryCost,
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
      subtotal, // Optional: for validation
      tax = 0,
      deliveryCost = 0,
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

    // SECURITY: If subtotal is provided, validate the payment amount matches server calculation
    if (typeof subtotal === "number" && subtotal >= 0) {
      console.log(`[PAYMENT] [${requestId}] Recalculating expected total with discount...`);
      
      const discountCheck = await checkNewUserDiscountEligibility(uid);
      
      console.log(`[PAYMENT] [${requestId}] Discount Check Result:`, {
        eligible: discountCheck.eligible,
        percentage: discountCheck.discountPercentage || 0,
        reason: discountCheck.reason || "N/A"
      });
      
      let discountAmount = 0;
      
      if (discountCheck.eligible) {
        discountAmount = calculateDiscountAmount(subtotal, discountCheck.discountPercentage);
        console.log(`[PAYMENT] [${requestId}] Discount calculated: ${discountAmount} ILS (${discountCheck.discountPercentage}% of ${subtotal})`);
      }

      const finalSubtotal = Math.max(0, subtotal - discountAmount);
      
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
      const calculateDeliveryCost = (zone, weight) => {
        if (!zone || !DELIVERY_ZONE_FEES[zone]) return 0;
        
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
        ? calculateDeliveryCost(deliveryZone, totalWeight)
        : 0;
      
      // SECURITY: Validate client-provided delivery cost matches server calculation
      // Always use server-calculated value for security (never trust client-provided delivery cost)
      const validatedDeliveryCost = expectedDeliveryCost;
      
      // Calculate base amount (subtotal + delivery) before tax
      const baseAmount = finalSubtotal + validatedDeliveryCost;
      
      // SECURITY: Recalculate tax server-side (never trust client-provided tax)
      const VAT_RATE = 0.18;
      const calculatedTax = baseAmount * VAT_RATE;
      
      // Calculate expected total
      const expectedTotal = Math.max(0, baseAmount + calculatedTax);
      
      console.log(`[PAYMENT] [${requestId}] Expected Total Calculation:`, {
        subtotalBeforeDiscount: subtotal,
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

    // TODO: Integrate with Tranzilla or Max Business payment gateway here
    // 
    // Integration Guides Available:
    // - server/PAYMENT_INTEGRATION_TRANZILLA.md (for Tranzilla)
    // - server/PAYMENT_INTEGRATION_MAX_BUSINESS.md (for Max עסקים)
    //
    // For now, this is a placeholder that always returns success
    // In the future, this will:
    // 1. Process payment through chosen gateway (Tranzilla/Max Business)
    // 2. Handle payment callbacks
    // 3. Return payment status and transaction ID

    console.log(`[PAYMENT] [${requestId}] Processing payment (placeholder mode)...`);

    // Simulate payment processing
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const paymentResult = {
      success: true,
      transactionId: transactionId,
      amount: amount,
      currency: currency,
      status: "completed",
      message: "Payment processed successfully (placeholder)"
    };

    const duration = Date.now() - startTime;
    console.log(`[PAYMENT] [${requestId}] Payment Process Success:`, {
      transactionId: transactionId,
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


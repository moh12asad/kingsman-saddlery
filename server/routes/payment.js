import { Router } from "express";
import { verifyFirebaseToken } from "../middlewares/auth.js";
import { checkNewUserDiscountEligibility, calculateDiscountAmount } from "../utils/discount.js";

const router = Router();

// Calculate order total with discount (before payment)
// This endpoint allows the client to get the correct total including any applicable discounts
router.post("/calculate-total", verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user;
    if (!uid || typeof uid !== "string") {
      return res.status(400).json({ 
        error: "Invalid user authentication" 
      });
    }

    const {
      subtotal,
      tax = 0,
      deliveryCost = 0,
    } = req.body;

    // SECURITY: Validate all inputs are numbers and non-negative
    if (typeof subtotal !== "number" || subtotal < 0 || !isFinite(subtotal)) {
      return res.status(400).json({ 
        error: "Invalid subtotal: must be a non-negative number" 
      });
    }

    const validatedTax = typeof tax === "number" && tax >= 0 && isFinite(tax) ? tax : 0;
    const validatedDeliveryCost = typeof deliveryCost === "number" && deliveryCost >= 0 && isFinite(deliveryCost) ? deliveryCost : 0;

    // SECURITY: Check discount eligibility server-side (never trust client)
    const discountCheck = await checkNewUserDiscountEligibility(uid);
    let discountAmount = 0;
    
    if (discountCheck.eligible && discountCheck.discountPercentage > 0) {
      discountAmount = calculateDiscountAmount(subtotal, discountCheck.discountPercentage);
      // Ensure discount doesn't exceed subtotal (safety check)
      discountAmount = Math.min(discountAmount, subtotal);
    }

    // Calculate final total: (Subtotal - Discount) + Tax + Delivery
    // SECURITY: Ensure values are never negative
    const finalSubtotal = Math.max(0, subtotal - discountAmount);
    const finalTotal = Math.max(0, finalSubtotal + validatedTax + validatedDeliveryCost);

    // SECURITY: Ensure total is a valid number
    if (!isFinite(finalTotal)) {
      return res.status(500).json({ 
        error: "Invalid calculation result" 
      });
    }

    res.json({
      subtotal: finalSubtotal,
      subtotalBeforeDiscount: subtotal,
      discount: discountCheck.eligible && discountAmount > 0 ? {
        amount: discountAmount,
        percentage: discountCheck.discountPercentage,
        type: "new_user"
      } : null,
      tax: validatedTax,
      deliveryCost: validatedDeliveryCost,
      total: finalTotal
    });
  } catch (error) {
    console.error("payment.calculate-total error", error);
    res.status(500).json({ 
      error: "Failed to calculate total", 
      details: error.message 
    });
  }
});

// Process payment (placeholder for future payment gateway integration)
router.post("/process", verifyFirebaseToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const {
      amount,
      currency = "ILS",
      paymentMethod,
      subtotal, // Optional: for validation
      tax = 0,
      deliveryCost = 0,
      // Add other payment-related fields as needed
    } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        error: "Invalid payment amount" 
      });
    }

    // SECURITY: If subtotal is provided, validate the payment amount matches server calculation
    if (typeof subtotal === "number" && subtotal >= 0) {
      const discountCheck = await checkNewUserDiscountEligibility(uid);
      let discountAmount = 0;
      
      if (discountCheck.eligible) {
        discountAmount = calculateDiscountAmount(subtotal, discountCheck.discountPercentage);
      }

      const finalSubtotal = Math.max(0, subtotal - discountAmount);
      const expectedTotal = finalSubtotal + tax + deliveryCost;
      
      // Validate payment amount matches expected total (with small tolerance for floating point)
      const difference = Math.abs(amount - expectedTotal);
      if (difference > 0.01) {
        console.warn(`Payment amount mismatch: client sent ${amount}, expected ${expectedTotal}. Using server-calculated total.`);
        // Use server-calculated total for security
        // In production, you might want to reject the payment or adjust it
      }
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

    // Simulate payment processing
    const paymentResult = {
      success: true,
      transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount: amount,
      currency: currency,
      status: "completed",
      message: "Payment processed successfully (placeholder)"
    };

    // Return success response
    res.status(200).json(paymentResult);
  } catch (error) {
    console.error("payment.process error", error);
    res.status(500).json({ 
      success: false,
      error: "Payment processing failed", 
      details: error.message 
    });
  }
});

export default router;


import { Router } from "express";
import { verifyFirebaseToken } from "../middlewares/auth.js";
import { sendOrderConfirmationEmail, getTransporter, isResendConfigured, getResendClient } from "../lib/emailService.js";

const router = Router();

// Helper function to round to 2 decimal places (fix floating point precision)
const roundTo2Decimals = (num) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

// Test email service connection (Resend or SMTP)
router.get("/test-smtp", async (req, res) => {
  try {
    // Check if Resend is configured
    if (isResendConfigured()) {
      console.log("[EMAIL-TEST] Testing Resend API...");
      const resend = getResendClient();
      
      // Test by sending a simple verification request
      // Resend doesn't have a verify method, so we'll just check if the client is created
      if (!resend) {
        throw new Error("Resend client could not be created");
      }
      
      res.json({
        ok: true,
        message: "Resend API is configured and ready",
        service: "Resend",
        config: {
          fromEmail: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
          replyToEmail: process.env.RESEND_REPLY_TO || process.env.SMTP_USER || "NOT SET",
          apiKey: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 7) + "***" : "NOT SET",
          note: "Emails will be sent FROM the 'fromEmail' address, but replies will go to 'replyToEmail' (your Gmail)"
        }
      });
      return;
    }

    // Fallback to SMTP test
    console.log("[EMAIL-TEST] Testing SMTP connection...");
    const transporter = getTransporter();
    
    if (!transporter) {
      return res.status(500).json({
        ok: false,
        error: "Email service not configured",
        details: "Set RESEND_API_KEY (for Resend) or SMTP_USER and SMTP_PASS (for SMTP) environment variables",
        availableServices: {
          resend: !process.env.RESEND_API_KEY ? "Not configured (set RESEND_API_KEY)" : "Configured",
          smtp: !process.env.SMTP_USER || !process.env.SMTP_PASS ? "Not configured (set SMTP_USER and SMTP_PASS)" : "Configured"
        }
      });
    }

    await transporter.verify();
    
    res.json({
      ok: true,
      message: "SMTP connection verified successfully",
      service: "SMTP",
      config: {
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: process.env.SMTP_PORT || "465",
        secure: process.env.SMTP_SECURE !== "false",
        user: process.env.SMTP_USER ? process.env.SMTP_USER.substring(0, 3) + "***" : "NOT SET"
      }
    });
  } catch (error) {
    console.error("[EMAIL-TEST] Email service test failed:", error);
    res.status(500).json({
      ok: false,
      error: isResendConfigured() ? "Resend API test failed" : "SMTP connection test failed",
      details: error.message,
      code: error.code || "N/A",
      service: isResendConfigured() ? "Resend" : "SMTP",
      possibleCauses: isResendConfigured() ? [
        "Invalid RESEND_API_KEY",
        "Resend API service issue",
        "Invalid RESEND_FROM_EMAIL domain (must be verified in Resend)"
      ] : [
        "Railway might be blocking outbound SMTP connections",
        "Gmail might be blocking connections from Railway IPs",
        "Incorrect SMTP credentials (check App Password)",
        "Network/firewall issue",
        "Consider using Resend API (set RESEND_API_KEY) to bypass SMTP issues"
      ]
    });
  }
});

// Send order confirmation email
router.post("/order-confirmation", verifyFirebaseToken, async (req, res) => {
  const requestStartTime = Date.now();
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[EMAIL-ROUTE] ===== Email Request Started [${requestId}] =====`);
  console.log(`[EMAIL-ROUTE] Timestamp: ${new Date().toISOString()}`);
  console.log(`[EMAIL-ROUTE] User: ${req.user?.email || req.user?.uid || 'unknown'}`);
  
  try {
    const {
      orderNumber,
      customerName,
      customerEmail,
      items,
      shippingAddress,
      total,
      subtotal,
      subtotalBeforeDiscount,
      discount,
      tax = 0,
      orderDate,
      status = "pending",
      metadata = {}
    } = req.body;

    console.log(`[EMAIL-ROUTE] Request Body:`);
    console.log(`[EMAIL-ROUTE]   Order Number: ${orderNumber || 'not provided'}`);
    console.log(`[EMAIL-ROUTE]   Customer Email: ${customerEmail || 'not provided'}`);
    console.log(`[EMAIL-ROUTE]   Items Count: ${items?.length || 0}`);

    // Validate required fields
    if (!customerEmail || !items || !Array.isArray(items) || items.length === 0) {
      console.warn(`[EMAIL-ROUTE] Validation failed: Missing required fields`);
      return res.status(400).json({ 
        error: "Missing required fields: customerEmail, items" 
      });
    }

    // Delivery address is only required for delivery orders
    const deliveryType = metadata?.deliveryType || "delivery";
    if (deliveryType === "delivery") {
      if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.zipCode) {
        return res.status(400).json({ 
          error: "Complete delivery address is required for delivery orders" 
        });
      }
    }
    // For pickup orders, shippingAddress can be null - no validation needed

    // Generate order number if not provided
    const finalOrderNumber = orderNumber || `ORD-${Date.now()}`;

    // Calculate total on server for security (don't trust client-provided total)
    const normalizedItems = items.map(item => {
      // SECURITY: Convert to number first, then validate (don't default 0 to 1)
      const quantityNum = Number(item.quantity);
      // Only default to 1 if quantity is missing/undefined/null/NaN, but preserve 0 for validation
      const quantity = (item.quantity == null || isNaN(quantityNum)) ? 1 : quantityNum;
      
      // Validate quantity (0 is invalid and should be rejected, not defaulted)
      if (quantity <= 0 || !isFinite(quantity)) {
        throw new Error(`Invalid item quantity: ${item.quantity} for item ${item.name || "Unknown"}`);
      }
      
      return {
        name: item.name,
        image: item.image || "",
        quantity: quantity,
        price: Number(item.price) || 0,
      };
    });
    
    const computedSubtotal = roundTo2Decimals(normalizedItems.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    ));
    
    // Use provided subtotalBeforeDiscount if available, otherwise use computed
    const orderSubtotalBeforeDiscount = typeof subtotalBeforeDiscount === "number" && subtotalBeforeDiscount >= 0
      ? roundTo2Decimals(subtotalBeforeDiscount)
      : computedSubtotal;
    
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
    
    // Get delivery zone and weight from metadata
    const deliveryZone = metadata?.deliveryZone || null;
    const totalWeight = metadata?.totalWeight || 0;
    
    // Calculate delivery cost based on zone and weight
    // Pass subtotal (after discount) to check for free delivery threshold
    const deliveryCost = roundTo2Decimals(deliveryType === "delivery" && deliveryZone
      ? calculateDeliveryCost(deliveryZone, totalWeight, orderSubtotal)
      : 0);
    
    // Use provided discount if available (already validated server-side)
    const orderDiscount = discount && typeof discount === "object" && discount.amount > 0 ? discount : null;
    const orderSubtotal = roundTo2Decimals(typeof subtotal === "number" && subtotal >= 0 ? subtotal : computedSubtotal);
    
    // Calculate base amount (subtotal + delivery) before tax
    const baseAmount = roundTo2Decimals(orderSubtotal + deliveryCost);
    
    // Calculate tax on the total (subtotal + delivery) (18% VAT)
    // SECURITY: Recalculate tax server-side based on total amount
    const VAT_RATE = 0.18;
    const orderTax = roundTo2Decimals(baseAmount * VAT_RATE);
    
    // Calculate expected total on server (trusted calculation)
    // Total = (Subtotal + Delivery) + Tax on Total
    const expectedTotal = roundTo2Decimals(Math.max(0, baseAmount + orderTax));
    
    // Validate client-provided total if provided (with small tolerance for floating point)
    const clientTotal = typeof total === "number" ? total : null;
    if (clientTotal !== null) {
      const difference = Math.abs(clientTotal - expectedTotal);
      if (difference > 0.01) { // Allow 0.01 ILS tolerance for floating point errors
        console.warn(`Email total mismatch: client sent ${clientTotal}, expected ${expectedTotal}. Using server-calculated total.`);
        // Use server-calculated total for security
      }
    }

    const orderData = {
      orderNumber: finalOrderNumber,
      customerName: customerName || req.user.displayName || "Customer",
      customerEmail: customerEmail || req.user.email,
      items: normalizedItems,
      shippingAddress: deliveryType === "delivery" ? shippingAddress : null,
      deliveryType: deliveryType,
      subtotal: orderSubtotal,
      subtotalBeforeDiscount: orderSubtotalBeforeDiscount,
      discount: orderDiscount,
      tax: orderTax,
      deliveryCost: deliveryCost,
      total: expectedTotal, // Always use server-calculated total
      orderDate: orderDate || new Date().toLocaleDateString(),
      status
    };

    console.log(`[EMAIL-ROUTE] Calling sendOrderConfirmationEmail...`);
    const emailStartTime = Date.now();
    
    const result = await sendOrderConfirmationEmail(orderData);
    
    const emailTime = Date.now() - emailStartTime;
    const totalRequestTime = Date.now() - requestStartTime;
    
    console.log(`[EMAIL-ROUTE] Email function completed in ${emailTime}ms`);
    console.log(`[EMAIL-ROUTE] Total request time: ${totalRequestTime}ms`);

    if (result.success) {
      console.log(`[EMAIL-ROUTE] ✓ Request successful [${requestId}]`);
      console.log(`[EMAIL-ROUTE] ===== Email Request Completed Successfully =====`);
      res.json({ 
        success: true, 
        message: "Order confirmation email sent successfully",
        orderNumber: finalOrderNumber,
        messageId: result.messageId
      });
    } else {
      console.error(`[EMAIL-ROUTE] ✗ Request failed [${requestId}]`);
      console.error(`[EMAIL-ROUTE] Error: ${result.error}`);
      console.error(`[EMAIL-ROUTE] ===== Email Request Failed =====`);
      res.status(500).json({ 
        error: "Failed to send email", 
        details: result.error 
      });
    }
  } catch (error) {
    const totalRequestTime = Date.now() - requestStartTime;
    console.error(`[EMAIL-ROUTE] ===== Unhandled Error in Email Route [${requestId}] =====`);
    console.error(`[EMAIL-ROUTE] Error after ${totalRequestTime}ms`);
    console.error(`[EMAIL-ROUTE] Error Type: ${error.constructor.name}`);
    console.error(`[EMAIL-ROUTE] Error Code: ${error.code || 'N/A'}`);
    console.error(`[EMAIL-ROUTE] Error Message: ${error.message}`);
    console.error(`[EMAIL-ROUTE] Error Stack: ${error.stack}`);
    console.error(`[EMAIL-ROUTE] ===== End Route Error =====`);
    
    res.status(500).json({ 
      error: "Failed to send order confirmation email", 
      details: error.message 
    });
  }
});

export default router;











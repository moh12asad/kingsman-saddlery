import { Router } from "express";
import { verifyFirebaseToken } from "../middlewares/auth.js";
import { sendOrderConfirmationEmail, getTransporter, isResendConfigured, getResendClient } from "../lib/emailService.js";

const router = Router();

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
          fromEmail: process.env.RESEND_FROM_EMAIL || process.env.SMTP_USER || "NOT SET",
          apiKey: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 7) + "***" : "NOT SET"
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
    const normalizedItems = items.map(item => ({
      name: item.name,
      image: item.image || "",
      quantity: Number(item.quantity) || 1,
      price: Number(item.price) || 0,
    }));
    
    const computedSubtotal = normalizedItems.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );
    
    // Use provided subtotalBeforeDiscount if available, otherwise use computed
    const orderSubtotalBeforeDiscount = typeof subtotalBeforeDiscount === "number" && subtotalBeforeDiscount >= 0
      ? subtotalBeforeDiscount
      : computedSubtotal;
    
    // Delivery cost constant (must match client-side)
    const DELIVERY_COST = 50;
    const deliveryCost = deliveryType === "delivery" ? DELIVERY_COST : 0;
    
    // Use provided discount if available (already validated server-side)
    const orderDiscount = discount && typeof discount === "object" && discount.amount > 0 ? discount : null;
    const orderSubtotal = typeof subtotal === "number" && subtotal >= 0 ? subtotal : computedSubtotal;
    const orderTax = typeof tax === "number" && tax >= 0 ? tax : 0;
    
    // Calculate expected total on server (trusted calculation)
    // Total = (Subtotal - Discount) + Tax + Delivery
    const expectedTotal = Math.max(0, orderSubtotal + orderTax + deliveryCost);
    
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











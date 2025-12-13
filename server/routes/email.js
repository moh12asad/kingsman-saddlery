import { Router } from "express";
import { verifyFirebaseToken } from "../middlewares/auth.js";
import { sendOrderConfirmationEmail } from "../lib/emailService.js";

const router = Router();

// Send order confirmation email
router.post("/order-confirmation", verifyFirebaseToken, async (req, res) => {
  try {
    const {
      orderNumber,
      customerName,
      customerEmail,
      items,
      shippingAddress,
      total,
      orderDate,
      status = "pending",
      metadata = {}
    } = req.body;

    // Validate required fields
    if (!customerEmail || !items || !Array.isArray(items) || items.length === 0) {
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
    
    // Delivery cost constant (must match client-side)
    const DELIVERY_COST = 50;
    const deliveryCost = deliveryType === "delivery" ? DELIVERY_COST : 0;
    
    // Calculate expected total on server (trusted calculation)
    const expectedTotal = computedSubtotal + deliveryCost;
    
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
      total: expectedTotal, // Always use server-calculated total
      orderDate: orderDate || new Date().toLocaleDateString(),
      status
    };

    const result = await sendOrderConfirmationEmail(orderData);

    if (result.success) {
      res.json({ 
        success: true, 
        message: "Order confirmation email sent successfully",
        orderNumber: finalOrderNumber,
        messageId: result.messageId
      });
    } else {
      res.status(500).json({ 
        error: "Failed to send email", 
        details: result.error 
      });
    }
  } catch (error) {
    console.error("Error in order confirmation email endpoint:", error);
    res.status(500).json({ 
      error: "Failed to send order confirmation email", 
      details: error.message 
    });
  }
});

export default router;











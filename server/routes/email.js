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
      status = "pending"
    } = req.body;

    // Validate required fields
    if (!customerEmail || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: "Missing required fields: customerEmail, items" 
      });
    }

    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.zipCode) {
      return res.status(400).json({ 
        error: "Complete shipping address is required" 
      });
    }

    // Generate order number if not provided
    const finalOrderNumber = orderNumber || `ORD-${Date.now()}`;

    const orderData = {
      orderNumber: finalOrderNumber,
      customerName: customerName || req.user.displayName || "Customer",
      customerEmail: customerEmail || req.user.email,
      items: items.map(item => ({
        name: item.name,
        image: item.image || "",
        quantity: item.quantity || 1,
        price: item.price || 0,
      })),
      shippingAddress,
      total: total || 0,
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







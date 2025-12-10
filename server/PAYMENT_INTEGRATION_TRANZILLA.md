# Tranzilla Payment Integration Guide

This guide will help you integrate Tranzilla payment gateway into your application.

## Overview

The payment endpoint is located at: `server/routes/payment.js`
The current implementation is a placeholder that always returns success. Follow these steps to integrate Tranzilla.

## Step 1: Install Tranzilla SDK

```bash
cd server
npm install tranzilla-sdk
# OR if using a different package name, check Tranzilla documentation
```

## Step 2: Get Tranzilla Credentials

1. Sign up for a Tranzilla merchant account
2. Get your credentials:
   - Terminal Number (TerminalID)
   - User Name
   - Password
   - Company Name (optional)

3. Add to your `.env` file:
```env
TRANZILLA_TERMINAL_ID=your_terminal_id
TRANZILLA_USERNAME=your_username
TRANZILLA_PASSWORD=your_password
TRANZILLA_COMPANY_NAME=your_company_name
TRANZILLA_ENVIRONMENT=sandbox  # or 'production'
```

## Step 3: Update payment.js

Replace the placeholder code in `server/routes/payment.js` with:

```javascript
import { Router } from "express";
import { verifyFirebaseToken } from "../middlewares/auth.js";
// Import Tranzilla SDK (adjust import based on actual SDK)
// import Tranzilla from "tranzilla-sdk";

const router = Router();

// Process payment with Tranzilla
router.post("/process", verifyFirebaseToken, async (req, res) => {
  try {
    const {
      amount,
      currency = "ILS",
      paymentMethod,
      cardNumber,
      cardExpiry,
      cardCVV,
      cardHolderName,
      // Add other payment fields as needed
    } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid payment amount" 
      });
    }

    // Initialize Tranzilla client
    const tranzilla = new Tranzilla({
      terminalId: process.env.TRANZILLA_TERMINAL_ID,
      username: process.env.TRANZILLA_USERNAME,
      password: process.env.TRANZILLA_PASSWORD,
      environment: process.env.TRANZILLA_ENVIRONMENT || "sandbox"
    });

    // Prepare payment request
    const paymentRequest = {
      Amount: amount,
      Currency: currency,
      CardNumber: cardNumber,
      CardExpiry: cardExpiry,
      CVV: cardCVV,
      CardHolderName: cardHolderName,
      // Add other required fields per Tranzilla API
    };

    // Process payment
    const paymentResponse = await tranzilla.processPayment(paymentRequest);

    // Check payment result
    if (paymentResponse.Success === true || paymentResponse.Status === "Approved") {
      // Payment successful
      res.status(200).json({
        success: true,
        transactionId: paymentResponse.TransactionId || paymentResponse.ReferenceNumber,
        amount: amount,
        currency: currency,
        status: "completed",
        message: "Payment processed successfully",
        tranzillaResponse: paymentResponse
      });
    } else {
      // Payment failed
      res.status(400).json({
        success: false,
        error: paymentResponse.ErrorMessage || paymentResponse.Message || "Payment processing failed",
        transactionId: paymentResponse.TransactionId || null,
        status: "failed",
        tranzillaResponse: paymentResponse
      });
    }
  } catch (error) {
    console.error("Tranzilla payment error:", error);
    res.status(500).json({ 
      success: false,
      error: "Payment processing failed", 
      details: error.message 
    });
  }
});

export default router;
```

## Step 4: Handle Payment Callbacks (Optional)

If Tranzilla supports webhooks/callbacks, create a callback endpoint:

```javascript
// In payment.js, add:
router.post("/callback", async (req, res) => {
  try {
    const callbackData = req.body;
    
    // Verify callback signature (if provided by Tranzilla)
    // Update order status in database based on callback
    
    // Find order by transaction ID
    const orderSnapshot = await db.collection("orders")
      .where("transactionId", "==", callbackData.TransactionId)
      .limit(1)
      .get();
    
    if (!orderSnapshot.empty) {
      const orderDoc = orderSnapshot.docs[0];
      await orderDoc.ref.update({
        status: callbackData.Status === "Approved" ? "paid" : "failed",
        paymentCallback: callbackData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Payment callback error:", error);
    res.status(500).json({ error: "Callback processing failed" });
  }
});
```

## Step 5: Update Frontend (if needed)

If you need to collect card details on the frontend, update `client/src/pages/OrderConfirmation.jsx`:

```javascript
// Add payment method fields to orderData
const orderData = {
  // ... existing fields
  paymentMethod: {
    type: "credit_card",
    cardNumber: cardNumber, // Make sure to handle securely
    // ... other card details
  }
};
```

## Step 6: Testing

1. **Sandbox Testing:**
   - Use Tranzilla sandbox/test credentials
   - Test with test card numbers provided by Tranzilla
   - Verify transactions appear in Tranzilla dashboard

2. **Test Cases:**
   - Successful payment
   - Declined card
   - Insufficient funds
   - Invalid card details
   - Network errors

## Step 7: Production Checklist

- [ ] Replace sandbox credentials with production credentials
- [ ] Set `TRANZILLA_ENVIRONMENT=production` in `.env`
- [ ] Test with real card (small amount)
- [ ] Set up webhook/callback URL in Tranzilla dashboard
- [ ] Enable SSL/HTTPS for production
- [ ] Review error handling and logging
- [ ] Set up monitoring/alerts for failed payments

## Important Notes

1. **Security:**
   - Never store full card numbers in your database
   - Use HTTPS for all payment requests
   - Follow PCI-DSS compliance guidelines
   - Consider using tokenization if Tranzilla supports it

2. **Error Handling:**
   - Always handle payment failures gracefully
   - Log all payment attempts for auditing
   - Notify users of payment status

3. **Documentation:**
   - Refer to official Tranzilla API documentation
   - Keep SDK version updated
   - Document any custom configurations

## Support

- Tranzilla Support: [Check Tranzilla website for support contact]
- API Documentation: [Tranzilla API docs URL]

## Current Implementation Status

✅ Payment endpoint structure ready
✅ Order creation after payment success
✅ Email confirmation after order creation
⏳ Tranzilla SDK integration (TODO)
⏳ Payment callback handling (TODO)
⏳ Frontend payment form (if needed)


# Max עסקים (Max Business) Payment Integration Guide

This guide will help you integrate Max Business payment gateway into your application.

## Overview

The payment endpoint is located at: `server/routes/payment.js`
The current implementation is a placeholder that always returns success. Follow these steps to integrate Max Business.

## Step 1: Install Max Business SDK

```bash
cd server
npm install max-business-sdk
# OR check Max Business documentation for the correct package name
# Common alternatives: @max/business-sdk, maxpay, etc.
```

## Step 2: Get Max Business Credentials

1. Sign up for a Max Business merchant account at: https://www.max.co.il/business
2. Get your credentials from Max Business dashboard:
   - Terminal Number (TerminalID)
   - API Key / Secret Key
   - Merchant ID
   - Store Number (if applicable)

3. Add to your `.env` file:
```env
MAX_BUSINESS_TERMINAL_ID=your_terminal_id
MAX_BUSINESS_API_KEY=your_api_key
MAX_BUSINESS_SECRET_KEY=your_secret_key
MAX_BUSINESS_MERCHANT_ID=your_merchant_id
MAX_BUSINESS_STORE_NUMBER=your_store_number
MAX_BUSINESS_ENVIRONMENT=sandbox  # or 'production'
```

## Step 3: Update payment.js

Replace the placeholder code in `server/routes/payment.js` with:

```javascript
import { Router } from "express";
import { verifyFirebaseToken } from "../middlewares/auth.js";
// Import Max Business SDK (adjust import based on actual SDK)
// import MaxBusiness from "max-business-sdk";
// OR
// import { MaxPay } from "@max/business-sdk";

const router = Router();

// Process payment with Max Business
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
      cardHolderID, // Israeli ID number (Teudat Zehut)
      // Add other payment fields as needed
    } = req.body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid payment amount" 
      });
    }

    // Initialize Max Business client
    const maxBusiness = new MaxBusiness({
      terminalId: process.env.MAX_BUSINESS_TERMINAL_ID,
      apiKey: process.env.MAX_BUSINESS_API_KEY,
      secretKey: process.env.MAX_BUSINESS_SECRET_KEY,
      merchantId: process.env.MAX_BUSINESS_MERCHANT_ID,
      storeNumber: process.env.MAX_BUSINESS_STORE_NUMBER,
      environment: process.env.MAX_BUSINESS_ENVIRONMENT || "sandbox"
    });

    // Prepare payment request
    const paymentRequest = {
      amount: amount,
      currency: currency,
      cardNumber: cardNumber,
      cardExpiry: cardExpiry, // Format: MMYY or MM/YY
      cvv: cardCVV,
      cardHolderName: cardHolderName,
      cardHolderID: cardHolderID, // Required for Israeli payments
      // Add other required fields per Max Business API
    };

    // Process payment
    const paymentResponse = await maxBusiness.processPayment(paymentRequest);

    // Check payment result
    if (paymentResponse.success === true || 
        paymentResponse.status === "approved" || 
        paymentResponse.resultCode === "000") {
      // Payment successful
      res.status(200).json({
        success: true,
        transactionId: paymentResponse.transactionId || 
                      paymentResponse.referenceNumber || 
                      paymentResponse.orderId,
        amount: amount,
        currency: currency,
        status: "completed",
        message: "Payment processed successfully",
        maxBusinessResponse: paymentResponse
      });
    } else {
      // Payment failed
      res.status(400).json({
        success: false,
        error: paymentResponse.errorMessage || 
               paymentResponse.message || 
               paymentResponse.resultMessage || 
               "Payment processing failed",
        transactionId: paymentResponse.transactionId || null,
        status: "failed",
        resultCode: paymentResponse.resultCode,
        maxBusinessResponse: paymentResponse
      });
    }
  } catch (error) {
    console.error("Max Business payment error:", error);
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

If Max Business supports webhooks/callbacks, create a callback endpoint:

```javascript
// In payment.js, add:
router.post("/callback", async (req, res) => {
  try {
    const callbackData = req.body;
    
    // Verify callback signature (if provided by Max Business)
    // Max Business usually sends a signature/hash for verification
    const isValid = maxBusiness.verifyCallback(callbackData);
    
    if (!isValid) {
      return res.status(401).json({ error: "Invalid callback signature" });
    }
    
    // Update order status in database based on callback
    const orderSnapshot = await db.collection("orders")
      .where("transactionId", "==", callbackData.transactionId || callbackData.orderId)
      .limit(1)
      .get();
    
    if (!orderSnapshot.empty) {
      const orderDoc = orderSnapshot.docs[0];
      const newStatus = (callbackData.status === "approved" || 
                        callbackData.resultCode === "000") ? "paid" : "failed";
      
      await orderDoc.ref.update({
        status: newStatus,
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
    cardHolderID: cardHolderID, // Israeli ID for Max Business
    // ... other card details
  }
};
```

## Step 6: Israeli-Specific Considerations

Max Business is an Israeli payment gateway, so consider:

1. **ID Number (Teudat Zehut):**
   - May require cardholder's Israeli ID number
   - Validate ID format (9 digits)

2. **Currency:**
   - Default currency is ILS (Israeli Shekel)
   - Ensure amount is in agorot (cents) or shekels based on API requirements

3. **Tax (Ma'am):**
   - May need to handle VAT separately
   - Check if Max Business handles tax or if you need to calculate it

4. **Hebrew Support:**
   - Ensure proper encoding for Hebrew text
   - Test with Hebrew customer names and addresses

## Step 7: Testing

1. **Sandbox Testing:**
   - Use Max Business sandbox/test credentials
   - Test with test card numbers provided by Max Business
   - Verify transactions appear in Max Business dashboard

2. **Test Cases:**
   - Successful payment
   - Declined card
   - Insufficient funds
   - Invalid card details
   - Invalid ID number
   - Network errors

## Step 8: Production Checklist

- [ ] Replace sandbox credentials with production credentials
- [ ] Set `MAX_BUSINESS_ENVIRONMENT=production` in `.env`
- [ ] Test with real card (small amount)
- [ ] Set up webhook/callback URL in Max Business dashboard
- [ ] Enable SSL/HTTPS for production
- [ ] Review error handling and logging
- [ ] Set up monitoring/alerts for failed payments
- [ ] Verify Hebrew text encoding
- [ ] Test ID number validation

## Important Notes

1. **Security:**
   - Never store full card numbers in your database
   - Use HTTPS for all payment requests
   - Follow PCI-DSS compliance guidelines
   - Consider using tokenization if Max Business supports it
   - Securely handle Israeli ID numbers (GDPR/Privacy considerations)

2. **Error Handling:**
   - Always handle payment failures gracefully
   - Log all payment attempts for auditing
   - Notify users of payment status
   - Handle Hebrew error messages properly

3. **Documentation:**
   - Refer to official Max Business API documentation
   - Keep SDK version updated
   - Document any custom configurations
   - Check for Hebrew documentation if available

## Support

- Max Business Support: https://www.max.co.il/business/contact
- API Documentation: [Check Max Business developer portal]
- Phone Support: [Check Max Business website for support number]

## Common Max Business Response Codes

- `000` - Approved
- `001` - Declined
- `002` - Insufficient funds
- `003` - Invalid card
- `004` - Expired card
- `005` - Invalid CVV
- `999` - System error

(Note: Actual codes may vary - check Max Business documentation)

## Current Implementation Status

✅ Payment endpoint structure ready
✅ Order creation after payment success
✅ Email confirmation after order creation
⏳ Max Business SDK integration (TODO)
⏳ Payment callback handling (TODO)
⏳ Frontend payment form (if needed)
⏳ ID number validation (TODO)


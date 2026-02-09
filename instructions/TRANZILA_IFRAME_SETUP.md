# Tranzila iFrame Payment Integration Setup Guide

This guide explains how to set up and configure the Tranzila iFrame payment integration.

## Overview

The integration uses Tranzila's iFrame method, which provides a secure payment experience where customers enter their payment details directly in an iframe hosted by Tranzila, without exposing sensitive card data to your server.

## Environment Variables

Add the following environment variables to your server `.env` file:

```env
# Tranzila Configuration - Direct iFrame Method (Simple + Secure)
TRANZILA_TERMINAL_NAME=your_terminal_name

# Frontend Base URL (for payment callbacks)
CLIENT_BASE_URL=https://yourdomain.com
# OR for local development:
# CLIENT_BASE_URL=http://localhost:5173
```

### Getting Your Tranzila Terminal Name

**Simple Setup** - You only need your Terminal Name:

1. **Get your Terminal Name**:
   - Log in to your Tranzila merchant dashboard
   - Find your **Terminal Name** (also called "Terminal ID" or "Terminal Number")
   - It's usually a short identifier like `abc123` or `terminal123`
   - This is what you'll use in the URL: `https://directng.tranzila.com/YOUR_TERMINAL_NAME/iframenew.php`

2. **Set environment variable**:
   ```env
   TRANZILA_TERMINAL_NAME=your_terminal_name_here
   ```

**That's it!** The integration is secure because:
- ✅ Payment URLs are generated server-side (never hardcoded)
- ✅ Each payment has a unique session ID for validation
- ✅ Payment verification happens on the server after completion
- ✅ Card data never touches your server (handled by Tranzila)

**Can't find your Terminal Name?**
- Check your welcome email from Tranzila
- Contact Tranzila support and ask for your "Terminal Name" or "Terminal ID"

## How It Works

### Payment Flow

1. **User clicks "Proceed to Payment"** on the order confirmation page
2. **Server creates a payment session** with order details
3. **Server requests iframe URL** from Tranzila API
4. **Frontend displays iframe** with Tranzila payment form
5. **User completes payment** in the iframe
6. **Tranzila redirects** to success/failure page with transaction parameters
7. **Server verifies payment** using 3-sided handshake
8. **Order is created** in database
9. **Confirmation email** is sent to customer

### API Endpoints

#### 1. Create Payment Session
**POST** `/api/payment/process`

Creates a payment session and returns a `paymentSessionId` that will be used to get the iframe URL.

**Request Body:**
```json
{
  "amount": 100.50,
  "currency": "ILS",
  "items": [...],
  "subtotal": 85.00,
  "tax": 15.30,
  "deliveryCost": 0,
  "deliveryZone": "telaviv_north",
  "totalWeight": 5.2
}
```

**Response:**
```json
{
  "success": true,
  "paymentSessionId": "PAY-SESSION-1234567890-abc123",
  "amount": 100.50,
  "currency": "ILS",
  "status": "pending"
}
```

#### 2. Get Iframe URL
**POST** `/api/payment/get-iframe-url`

Retrieves the Tranzila iframe URL for the payment session.

**Request Body:**
```json
{
  "paymentSessionId": "PAY-SESSION-1234567890-abc123",
  "amount": 100.50
}
```

**Response:**
```json
{
  "success": true,
  "iframeUrl": "https://secure5.tranzila.com/iframe/...",
  "paymentSessionId": "PAY-SESSION-1234567890-abc123"
}
```

#### 3. Verify Payment
**POST** `/api/payment/verify-payment`

Verifies the payment after Tranzila redirects back with transaction parameters.

**Request Body:**
```json
{
  "paymentSessionId": "PAY-SESSION-1234567890-abc123",
  "thtk": "transaction_token_from_tranzila",
  "index": "transaction_index_from_tranzila"
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "TXN-1234567890",
  "paymentSessionId": "PAY-SESSION-1234567890-abc123",
  "amount": 100.50,
  "currency": "ILS"
}
```

## Frontend Routes

The following routes are automatically set up:

- `/checkout` - Order confirmation page (shows payment iframe)
- `/payment/success` - Payment success callback page
- `/payment/failure` - Payment failure callback page

## Security Features

1. **Payment sessions are user-specific** - Each session is tied to the authenticated user
2. **Session expiration** - Payment sessions expire after 30 minutes
3. **Server-side validation** - All payment amounts are validated server-side
4. **3-sided handshake** - Payment verification uses Tranzila's secure verification endpoint
5. **No card data on server** - Card details never touch your server (handled by Tranzila iframe)

## Testing

### Sandbox/Test Mode

1. Use Tranzila's test/sandbox environment
2. Use test card numbers provided by Tranzila
3. Set `TRANZILA_HOST` to the sandbox URL if different

### Test Card Numbers

Contact Tranzila support for test card numbers and test scenarios.

## Troubleshooting

### Iframe Not Loading

1. Check that `TRANZILA_AID` is set correctly
2. Verify `CLIENT_BASE_URL` matches your frontend URL
3. Check browser console for CORS errors
4. Ensure Tranzila account has iFrame integration enabled

### Payment Verification Fails

1. Check that `thtk` and `index` parameters are being passed correctly
2. Verify `TRANZILA_AID` matches the account used for payment
3. Check server logs for detailed error messages
4. Ensure callback URLs are accessible (not blocked by firewall)

### Payment Session Not Found

1. Check that payment sessions are being created in Firestore
2. Verify session hasn't expired (30 minutes)
3. Ensure user is authenticated when creating/accessing sessions

## Production Checklist

- [ ] Replace sandbox credentials with production credentials
- [ ] Set `CLIENT_BASE_URL` to production domain
- [ ] Test with real card (small amount)
- [ ] Verify callback URLs are accessible from internet
- [ ] Enable SSL/HTTPS for production
- [ ] Review error handling and logging
- [ ] Set up monitoring/alerts for failed payments
- [ ] Test payment flow end-to-end

## Support

- Tranzila Support: Check Tranzila website for support contact
- API Documentation: https://docs.tranzila.com/docs/payments-billing/795m2yi7q4nmq-iframe-integration


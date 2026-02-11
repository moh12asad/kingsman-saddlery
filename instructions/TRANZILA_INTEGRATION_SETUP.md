# Tranzila Payment Integration Setup Guide

This guide explains how to configure and use the Tranzila payment gateway integration in the Kingsman Saddlery application.

## Overview

The application uses Tranzila's iframe-based payment integration. The payment form is embedded directly in the checkout page, providing a seamless payment experience.

## Integration Details

- **Payment Method**: Iframe Integration (DirectNG)
- **URL Format**: `https://directng.tranzila.com/{terminalname}/iframenew.php`
- **Component**: `client/src/components/TranzilaPayment.jsx`
- **Integration Point**: `client/src/pages/OrderConfirmation.jsx`

## Setup Instructions

### Step 1: Get Tranzila Credentials

1. Sign up for a Tranzila merchant account at [Tranzila](https://www.tranzila.com/)
2. Get your **Terminal Name** from your Tranzila dashboard
3. Note: The terminal name is used in the iframe URL

### Step 2: Configure Environment Variables

#### Frontend (Client) Environment Variables

Add the following to your frontend environment variables (Railway, Vercel, etc.):

```env
VITE_TRANZILA_TERMINAL_NAME=your_terminal_name_here
```

**Important Notes:**
- Replace `your_terminal_name_here` with your actual Tranzila terminal name
- The terminal name is used in the iframe URL: `https://directng.tranzila.com/{terminalname}/iframenew.php`
- For local development, add this to `client/.env.local`

#### Backend (Server) Environment Variables (Optional - for future API verification)

If you plan to implement server-side payment verification via Tranzila API:

```env
TRANZILA_API_KEY=your_api_key_here
TRANZILA_TERMINAL_ID=your_terminal_id_here
TRANZILA_USERNAME=your_username_here
TRANZILA_PASSWORD=your_password_here
```

**Note**: Currently, the integration uses iframe-based payment. Server-side API verification is optional and can be implemented later for additional security.

### Step 3: Local Development Setup

1. Create or update `client/.env.local`:
```env
VITE_TRANZILA_TERMINAL_NAME=your_terminal_name_here
```

2. Restart your development server after adding the environment variable.

### Step 4: Production Deployment

1. **Railway Deployment:**
   - Go to your Railway project → Frontend service → Variables tab
   - Add: `VITE_TRANZILA_TERMINAL_NAME=your_terminal_name_here`
   - Redeploy the service

2. **Vercel/Netlify Deployment:**
   - Go to your project settings → Environment Variables
   - Add: `VITE_TRANZILA_TERMINAL_NAME=your_terminal_name_here`
   - Redeploy the application

## How It Works

### Payment Flow

1. **User clicks "Proceed to Payment"** on the checkout page
2. **Tranzila iframe loads** with the payment form
3. **User completes payment** in the iframe
4. **Tranzila sends payment result** via postMessage API
5. **Payment component receives callback** and triggers order creation
6. **Order is created** in the database with transaction ID
7. **Confirmation email is sent** to the customer
8. **User is redirected** to order details page

### Component Structure

- **TranzilaPayment Component** (`client/src/components/TranzilaPayment.jsx`):
  - Handles iframe loading and communication
  - Listens for payment callbacks via postMessage
  - Displays payment status (loading, success, error, cancelled)

- **OrderConfirmation Page**:
  - Integrates TranzilaPayment component
  - Handles payment success callback
  - Creates order after successful payment
  - Manages payment flow state

### Payment Callback Handling

The component listens for messages from the Tranzila iframe:

```javascript
// Success callback
{
  type: "payment_success",
  transactionId: "TXN123456",
  status: "success"
}

// Failure callback
{
  type: "payment_failed",
  status: "failed",
  message: "Payment declined"
}
```

## Testing

### Test Mode

1. Use Tranzila's test/sandbox terminal name for testing
2. Test with Tranzila's test card numbers (provided by Tranzila)
3. Verify payment callbacks are received correctly
4. Check that orders are created with correct transaction IDs

### Production Testing

1. Use a small test transaction first
2. Verify transaction appears in Tranzila dashboard
3. Check order creation in your database
4. Verify email confirmation is sent

## Troubleshooting

### Iframe Not Loading

- **Check terminal name**: Verify `VITE_TRANZILA_TERMINAL_NAME` is set correctly
- **Check URL**: The iframe URL should be: `https://directng.tranzila.com/{your_terminal_name}/iframenew.php`
- **Check browser console**: Look for CORS or loading errors
- **Verify HTTPS**: Tranzila requires HTTPS in production

### Payment Callbacks Not Received

- **Check postMessage origin**: Verify Tranzila's domain is allowed
- **Check browser console**: Look for postMessage errors
- **Verify iframe sandbox attributes**: Ensure proper permissions are set

### Payment Succeeds But Order Not Created

- **Check server logs**: Look for payment verification errors
- **Check network tab**: Verify API calls to `/api/payment/process` succeed
- **Check authentication**: Ensure user token is valid

### 404 Error After Tranzila Redirect

If you get a 404 error when Tranzila redirects to `/payment/success` or `/payment/failed`:

**Problem**: Vite preview server doesn't handle SPA routing for direct redirects from external services.

**Solution**: The application uses an Express server for Railway deployment that handles SPA routing properly.

**What to do**:
1. Ensure `client/server.js` exists (created automatically)
2. Ensure `express` is in `client/package.json` dependencies
3. Ensure `client/railway.json` uses `"startCommand": "npm start"`
4. Redeploy your frontend service on Railway

The Express server will serve `index.html` for all routes, allowing React Router to handle routing on the client side.

## Security Considerations

1. **HTTPS Required**: Always use HTTPS in production for secure payment processing
2. **Origin Verification**: Consider verifying postMessage origin (currently commented out for flexibility)
3. **Server Verification**: Implement server-side payment verification when API credentials are available
4. **Transaction Logging**: All payment attempts are logged on the server for auditing

## Future Enhancements

1. **Server-Side Verification**: Implement Tranzila API verification for additional security
2. **Webhook Support**: Add webhook endpoint for Tranzila payment callbacks
3. **Payment Retry**: Implement retry logic for failed payments
4. **Payment History**: Store detailed payment information for admin review

## Support

- **Tranzila Documentation**: [Tranzila Docs](https://docs.tranzila.com/)
- **Tranzila Support**: Contact Tranzila support for account-specific issues
- **Application Issues**: Check server logs and browser console for debugging

## Related Files

- `client/src/components/TranzilaPayment.jsx` - Payment component
- `client/src/pages/OrderConfirmation.jsx` - Checkout page integration
- `client/src/pages/PaymentSuccess.jsx` - Payment success page
- `client/src/pages/PaymentFailed.jsx` - Payment failed page
- `server/routes/payment.js` - Payment processing endpoint
- `client/src/styles/tranzila-payment.css` - Payment component styles
- `client/src/styles/payment-result.css` - Success/failed page styles
- `client/src/locales/en/translation.json` - Payment translations
- `client/server.js` - Express server for SPA routing (Railway deployment)


# Payment System Documentation

## Overview

The payment system is a secure, server-side validated e-commerce payment flow that handles order creation, discount calculation, and payment processing. All financial calculations are performed server-side to prevent manipulation and ensure data integrity.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Payment Flow](#payment-flow)
3. [Discount System](#discount-system)
4. [Security Measures](#security-measures)
5. [API Endpoints](#api-endpoints)
6. [Error Handling](#error-handling)
7. [Data Flow Diagrams](#data-flow-diagrams)

---

## Architecture Overview

The payment system follows a **server-authoritative** architecture where:

- **Client**: Displays prices, collects user input, sends requests
- **Server**: Validates all data, calculates totals, processes payments, creates orders

### Key Principles

1. **Never trust client-provided prices** - All product prices are fetched from the database
2. **Server-side discount calculation** - Discount eligibility is checked server-side
3. **Payment amount validation** - Payment amounts are validated against server calculations
4. **Atomic operations** - Order creation only happens after successful payment validation

---

## Payment Flow

### Step-by-Step Process

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. User adds items to cart
       │
       │ 2. Navigate to Order Confirmation page
       │
       │ 3. Calculate total with discount
       ▼
┌─────────────────────────────────────┐
│ POST /api/payment/calculate-total   │
│ - Validates user authentication     │
│ - Checks discount eligibility       │
│ - Calculates final total            │
└──────────────┬──────────────────────┘
               │
               │ Returns: { subtotal, discount, total, ... }
               │
       ┌───────┴───────┐
       │               │
       │ 4. Display total to user
       │ 5. User confirms and proceeds
       │
       │ 6. Process payment
       ▼
┌─────────────────────────────────────┐
│ POST /api/payment/process           │
│ - Validates payment amount          │
│ - Checks discount eligibility       │
│ - Validates amount matches total    │
│ - Returns transaction ID            │
└──────────────┬──────────────────────┘
               │
               │ Returns: { success, transactionId, ... }
               │
       ┌───────┴───────┐
       │               │
       │ 7. Create order in database
       ▼
┌─────────────────────────────────────┐
│ POST /api/orders/create              │
│ - Validates product prices           │
│ - Applies discount                   │
│ - Creates order document             │
└──────────────┬──────────────────────┘
               │
               │ Returns: { id, message }
               │
       ┌───────┴───────┐
       │               │
       │ 8. Send confirmation email
       ▼
┌─────────────────────────────────────┐
│ POST /api/email/order-confirmation  │
│ - Generates email template          │
│ - Sends to customer                │
└─────────────────────────────────────┘
```

### Detailed Flow

#### 1. Cart to Order Confirmation

When a user navigates to the order confirmation page:

1. **Client** (`OrderConfirmation.jsx`):
   - Loads user profile data
   - Fetches cart items
   - Calls `/api/payment/calculate-total` to get the correct total with discount
   - Displays order summary with discount breakdown

2. **Server** (`/api/payment/calculate-total`):
   - Validates user authentication
   - Validates input (subtotal, tax, deliveryCost)
   - Checks discount eligibility (server-side)
   - Calculates discount amount
   - Returns final total with breakdown

#### 2. Payment Processing

When user clicks "Proceed to Payment":

1. **Client**:
   - Validates discount calculation is complete
   - Prevents payment if calculation failed or is in progress
   - Sends payment request with calculated total

2. **Server** (`/api/payment/process`):
   - Validates payment amount > 0
   - If subtotal provided, recalculates expected total with discount
   - **Rejects payment if amount doesn't match** (within 0.01 ILS tolerance)
   - Returns transaction ID (placeholder for future payment gateway integration)

#### 3. Order Creation

After successful payment:

1. **Client**:
   - Sends order data including items, addresses, payment details

2. **Server** (`/api/orders/create`):
   - **Validates product prices against database** (CRITICAL SECURITY)
   - Fetches actual product prices from Firestore
   - Uses database prices (not client-provided prices)
   - Recalculates subtotal from validated prices
   - Checks discount eligibility again (server-side)
   - Applies discount
   - Calculates final total
   - Creates order document in Firestore
   - Returns order ID

#### 4. Email Confirmation

1. **Client**:
   - Sends email request with order details

2. **Server** (`/api/email/order-confirmation`):
   - Validates order data
   - Generates HTML and plain text email templates
   - Includes discount breakdown in email
   - Sends email via SMTP

---

## Discount System

### New User Discount

**Eligibility**: Users who created their account within the last 3 months  
**Discount**: 5% off order subtotal  
**Duration**: First 3 months from account creation

### How It Works

#### 1. Eligibility Check (`server/utils/discount.js`)

```javascript
checkNewUserDiscountEligibility(userId)
```

**Process**:
1. Fetches user document from Firestore
2. Extracts `createdAt` timestamp
3. Parses timestamp (handles multiple formats)
4. Calculates months since account creation
5. Returns eligibility status

**Timestamp Parsing**:
- Handles Firestore Timestamp objects (`.toDate()`)
- Handles serialized timestamps (`_seconds`, `seconds`)
- Handles ISO strings
- Handles Date objects
- Validates parsed dates

#### 2. Discount Calculation

```javascript
calculateDiscountAmount(subtotal, discountPercentage)
```

**Process**:
1. Validates inputs (numbers, non-negative, finite)
2. Calculates: `subtotal × percentage / 100`
3. Rounds to 2 decimal places
4. Ensures discount never exceeds subtotal
5. Returns discount amount

#### 3. Application

Discount is applied in this order:
1. Calculate subtotal from items (using database prices)
2. Apply discount to subtotal
3. Add tax (currently 0)
4. Add delivery cost (50 ILS for delivery, 0 for pickup)
5. Final total = (Subtotal - Discount) + Tax + Delivery

### Example Calculation

```
Items:
  - Product A: 100 ILS × 2 = 200 ILS
  - Product B: 50 ILS × 1 = 50 ILS
Subtotal: 250 ILS

Discount (5%): 250 × 0.05 = 12.50 ILS
Subtotal after discount: 250 - 12.50 = 237.50 ILS

Tax: 0 ILS
Delivery: 50 ILS (if delivery)

Total: 237.50 + 0 + 50 = 287.50 ILS
```

---

## Security Measures

### 1. Product Price Validation (CRITICAL)

**Location**: `server/routes/orders.admin.js`

**Implementation**:
- Fetches all product prices from Firestore database
- Compares client-provided prices with database prices
- **Always uses database prices** (source of truth)
- Rejects orders with invalid product IDs
- Logs price mismatches for security monitoring

**Why**: Prevents users from manipulating prices (e.g., changing $100 product to $1)

### 2. Payment Amount Validation

**Location**: `server/routes/payment.js`

**Implementation**:
- Recalculates expected total server-side
- Compares payment amount with expected total
- **Rejects payment if mismatch > 0.01 ILS**
- Returns clear error message

**Why**: Prevents payment with incorrect amounts

### 3. Server-Side Discount Calculation

**Location**: `server/utils/discount.js`, `server/routes/payment.js`, `server/routes/orders.admin.js`

**Implementation**:
- Discount eligibility checked server-side
- Discount amount calculated server-side
- Client never sends discount percentage or amount
- Server validates user creation date from database

**Why**: Prevents discount manipulation

### 4. Input Validation

**All endpoints validate**:
- Type checking (numbers, strings, arrays)
- Range validation (non-negative, finite)
- Required fields
- Format validation (email, phone, etc.)

### 5. Race Condition Prevention

**Location**: `client/src/pages/OrderConfirmation.jsx`

**Implementation**:
- Uses request tracking with refs
- Each discount calculation gets unique request ID
- Stale responses are ignored
- Payment blocked until calculation completes

**Why**: Prevents incorrect totals from race conditions

---

## API Endpoints

### 1. Calculate Total with Discount

**Endpoint**: `POST /api/payment/calculate-total`

**Authentication**: Required (Firebase token)

**Request Body**:
```json
{
  "subtotal": 250.00,
  "tax": 0,
  "deliveryCost": 50
}
```

**Response** (Success - 200):
```json
{
  "subtotal": 237.50,
  "subtotalBeforeDiscount": 250.00,
  "discount": {
    "amount": 12.50,
    "percentage": 5,
    "type": "new_user"
  },
  "tax": 0,
  "deliveryCost": 50,
  "total": 287.50
}
```

**Response** (No Discount - 200):
```json
{
  "subtotal": 250.00,
  "subtotalBeforeDiscount": 250.00,
  "discount": null,
  "tax": 0,
  "deliveryCost": 50,
  "total": 300.00
}
```

**Error Responses**:
- `400`: Invalid input (subtotal not a number, negative, etc.)
- `401`: Authentication required
- `500`: Server error

---

### 2. Process Payment

**Endpoint**: `POST /api/payment/process`

**Authentication**: Required (Firebase token)

**Request Body**:
```json
{
  "amount": 287.50,
  "currency": "ILS",
  "paymentMethod": "credit_card",
  "subtotal": 250.00,
  "tax": 0,
  "deliveryCost": 50
}
```

**Response** (Success - 200):
```json
{
  "success": true,
  "transactionId": "TXN-1234567890-abc123",
  "amount": 287.50,
  "currency": "ILS",
  "status": "completed",
  "message": "Payment processed successfully (placeholder)"
}
```

**Error Responses**:
- `400`: Invalid payment amount or amount mismatch
- `401`: Authentication required
- `500`: Payment processing failed

**Amount Mismatch Error** (400):
```json
{
  "success": false,
  "error": "Payment amount mismatch",
  "details": "Payment amount (280.00 ILS) does not match calculated total (287.50 ILS). Please refresh and try again.",
  "expectedTotal": 287.50
}
```

---

### 3. Create Order

**Endpoint**: `POST /api/orders/create`

**Authentication**: Required (Firebase token)

**Request Body**:
```json
{
  "items": [
    {
      "id": "product123",
      "productId": "product123",
      "name": "Product Name",
      "image": "https://...",
      "quantity": 2,
      "price": 100.00
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Tel Aviv",
    "zipCode": "12345",
    "country": "Israel"
  },
  "phone": "0501234567",
  "subtotal": 250.00,
  "tax": 0,
  "total": 287.50,
  "transactionId": "TXN-1234567890-abc123",
  "metadata": {
    "deliveryType": "delivery",
    "paymentMethod": "credit_card"
  }
}
```

**Response** (Success - 201):
```json
{
  "id": "order123",
  "message": "Order created successfully"
}
```

**Security Validations**:
1. Fetches product prices from database
2. Validates prices match database (within 0.01 ILS tolerance)
3. Uses database prices (not client prices)
4. Validates quantities (positive, finite)
5. Rejects invalid product IDs
6. Checks discount eligibility server-side
7. Calculates total server-side

**Error Responses**:
- `400`: Invalid items, invalid prices, product not found, etc.
- `401`: Authentication required
- `500`: Order creation failed

---

### 4. Send Order Confirmation Email

**Endpoint**: `POST /api/email/order-confirmation`

**Authentication**: Required (Firebase token)

**Request Body**:
```json
{
  "orderNumber": "ORD-1234567890",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "items": [...],
  "shippingAddress": {...},
  "total": 287.50,
  "subtotal": 237.50,
  "subtotalBeforeDiscount": 250.00,
  "discount": {
    "amount": 12.50,
    "percentage": 5,
    "type": "new_user"
  },
  "tax": 0,
  "deliveryCost": 50,
  "metadata": {
    "deliveryType": "delivery"
  }
}
```

**Response** (Success - 200):
```json
{
  "success": true,
  "message": "Order confirmation email sent successfully"
}
```

---

## Error Handling

### Client-Side Error Handling

**OrderConfirmation.jsx**:
- Blocks payment if discount calculation is in progress
- Blocks payment if discount calculation failed
- Blocks payment if total is null
- Shows clear error messages to user
- Prevents race conditions with request tracking

### Server-Side Error Handling

**All endpoints**:
- Validate inputs before processing
- Return specific error messages
- Log security issues (price mismatches, payment mismatches)
- Default to secure behavior (no discount on error)

### Common Error Scenarios

#### 1. Discount Calculation Failed
- **Client**: Shows error, blocks payment
- **Server**: Returns error, client retries

#### 2. Payment Amount Mismatch
- **Server**: Rejects payment with 400 error
- **Client**: Shows error, user must refresh and retry

#### 3. Product Price Mismatch
- **Server**: Uses database price, logs warning
- **Order**: Created with correct price

#### 4. Invalid Product ID
- **Server**: Returns 400 error
- **Order**: Not created

#### 5. Network Errors
- **Client**: Shows error, allows retry
- **Server**: Logs error, returns 500

---

## Data Flow Diagrams

### Discount Calculation Flow

```
User Action (Change delivery type)
    │
    ▼
Client: calculateTotalWithDiscount()
    │
    ├─ Generate unique request ID
    ├─ Set calculatingDiscount = true
    │
    ▼
POST /api/payment/calculate-total
    │
    ├─ Validate authentication
    ├─ Validate inputs
    │
    ▼
checkNewUserDiscountEligibility(uid)
    │
    ├─ Fetch user from Firestore
    ├─ Parse createdAt timestamp
    ├─ Calculate months since creation
    ├─ Check if < 3 months
    │
    ▼
calculateDiscountAmount(subtotal, 5%)
    │
    ├─ Validate inputs
    ├─ Calculate: subtotal × 0.05
    ├─ Round to 2 decimals
    │
    ▼
Return: { subtotal, discount, total }
    │
    ▼
Client: Check if still current request
    │
    ├─ If yes: Update state
    ├─ If no: Ignore (stale response)
```

### Order Creation Flow

```
User: Proceed to Payment
    │
    ▼
Client: Validate discount calculation complete
    │
    ├─ If not ready: Block payment
    ├─ If ready: Continue
    │
    ▼
POST /api/payment/process
    │
    ├─ Validate amount
    ├─ Recalculate expected total
    ├─ Compare with payment amount
    │
    ├─ If mismatch: Reject (400)
    ├─ If match: Return transaction ID
    │
    ▼
POST /api/orders/create
    │
    ├─ Fetch product prices from database
    │
    ├─ For each item:
    │   ├─ Validate product exists
    │   ├─ Compare client price vs database price
    │   ├─ Use database price (source of truth)
    │   └─ Log mismatch if any
    │
    ├─ Calculate subtotal from database prices
    ├─ Check discount eligibility
    ├─ Apply discount
    ├─ Calculate total
    │
    ▼
Create order in Firestore
    │
    ▼
POST /api/email/order-confirmation
    │
    ├─ Generate email template
    ├─ Include discount breakdown
    ├─ Send email
```

---

## Configuration

### Constants

**Discount Configuration** (`server/utils/discount.js`):
```javascript
NEW_USER_DISCOUNT = {
  PERCENTAGE: 5,        // 5% discount
  DURATION_MONTHS: 3   // Valid for first 3 months
}
```

**Delivery Cost** (`server/routes/orders.admin.js`, `server/routes/email.js`):
```javascript
DELIVERY_COST = 50  // 50 ILS for delivery, 0 for pickup
```

### Environment Variables

- `SMTP_USER`: Email account for sending order confirmations
- `SMTP_PASS`: Email account password
- `SMTP_HOST`: SMTP server hostname
- `SMTP_PORT`: SMTP server port

---

## Testing Scenarios

### 1. New User Discount
- Create account
- Add items to cart
- Verify 5% discount applied
- Complete order
- Verify discount in order and email

### 2. Price Manipulation Attempt
- Try to send order with manipulated prices
- Verify server uses database prices
- Verify order created with correct prices

### 3. Payment Amount Mismatch
- Try to pay with incorrect amount
- Verify payment is rejected
- Verify clear error message

### 4. Race Condition
- Rapidly change delivery type
- Verify only latest calculation is used
- Verify no stale data overwrites

### 5. Discount Expiration
- Create account
- Wait 3+ months
- Verify discount no longer applied

---

## Future Enhancements

### Payment Gateway Integration

Currently, payment processing is a placeholder. Future integration with:
- **Tranzilla**: Israeli payment gateway
- **Max Business (Max עסקים)**: Alternative Israeli payment gateway

**Integration Guides**:
- `server/PAYMENT_INTEGRATION_TRANZILLA.md`
- `server/PAYMENT_INTEGRATION_MAX_BUSINESS.md`

### Additional Discount Types

- Promo codes
- Seasonal discounts
- Volume discounts
- Loyalty program discounts

### Enhanced Security

- Rate limiting on payment endpoints
- Fraud detection
- Payment retry logic
- Refund processing

---

## Troubleshooting

### Discount Not Applied

1. Check user account creation date
2. Verify user is within 3 months
3. Check server logs for eligibility check
4. Verify `createdAt` field exists in user document

### Payment Rejected

1. Check payment amount matches calculated total
2. Verify discount calculation completed
3. Check for network errors
4. Review server logs for mismatch details

### Order Creation Failed

1. Verify product IDs are valid
2. Check product prices in database
3. Verify quantities are positive
4. Review server logs for specific errors

### Email Not Sent

1. Verify SMTP credentials
2. Check email address is valid
3. Review server logs for SMTP errors
4. Verify email service is configured

---

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Review this documentation
3. Check API endpoint responses
4. Verify database data integrity

---

**Last Updated**: 2024
**Version**: 1.0


# Coupon Consistency Fix - Server-Side

## The Problem

The server was calculating different totals in two different endpoints:

1. **`/api/payment/calculate-total`**: 
   - Checks coupon code first
   - If coupon exists → uses coupon discount
   - If no coupon → uses new user discount
   - **Result: 2.6 ILS** (with 90% coupon)

2. **`/api/payment/process`**: 
   - **DID NOT check for coupon code**
   - Always used new user discount (5%)
   - **Result: 24.66 ILS** (with 5% new user discount)

**Result:** Amount mismatch! Client sends 2.6, server expects 24.66.

## Root Cause

The `/api/payment/process` endpoint was missing coupon code handling. It only checked for new user discount, so even when a coupon was applied in the first calculation, the payment verification would use a different discount.

## The Fix

### Server-Side (`server/routes/payment.js`)

1. **Extract coupon code from request:**
   ```javascript
   const { couponCode = null, ... } = req.body;
   ```

2. **Check coupon code first (before new user discount):**
   ```javascript
   if (couponCode && typeof couponCode === "string" && couponCode.trim() !== "") {
     // Validate and apply coupon discount
   } else {
     // Check new user discount
   }
   ```

This matches the exact same logic as `/api/payment/calculate-total`, ensuring both endpoints use the same discount.

### Client-Side (`client/src/pages/OrderConfirmation.jsx`)

1. **Send coupon code to payment verification:**
   ```javascript
   body: JSON.stringify({
     items: itemsForVerification,
     couponCode: appliedCoupon ? appliedCoupon.code : null, // CRITICAL
     // ... other fields
   })
   ```

2. **Enhanced logging:**
   - Logs coupon code being used
   - Logs discount information
   - Warns if totals differ

## What This Fixes

**Before:**
- Client calculates with coupon → 2.6 ILS
- Server verifies without coupon → 24.66 ILS
- ❌ Amount mismatch → Payment rejected

**After:**
- Client calculates with coupon → 2.6 ILS
- Client sends coupon code to server
- Server verifies with same coupon → 2.6 ILS
- ✅ Amount matches → Payment succeeds

## Consistency Guarantee

Both endpoints now:
1. ✅ Check coupon code first (if provided)
2. ✅ Fall back to new user discount (if no coupon)
3. ✅ Use same discount calculation logic
4. ✅ Use same subtotal calculation (from database prices)

This ensures the totals will always match!


# Server Payment Endpoint Tests

## Overview

These tests verify that the payment endpoints (`/api/payment/calculate-total` and `/api/payment/process`) use identical discount logic, ensuring coupon consistency and preventing payment amount mismatches.

## Running Tests

### Install Dependencies

First, install the test dependencies:

```bash
cd server
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with UI

```bash
npm run test:ui
```

## Test File

### `payment.couponConsistency.test.js`

Comprehensive integration tests covering:

✅ **Coupon Code Consistency**
- Both endpoints apply the same coupon discount
- Both endpoints apply the same new user discount when no coupon
- Coupon takes precedence over new user discount in both endpoints

✅ **Amount Matching**
- Amounts match when coupon is applied consistently
- Mismatch is detected when coupon is missing in one endpoint

✅ **Coupon Code Validation**
- Empty string coupon codes are handled correctly
- Whitespace-only coupon codes are handled correctly
- Coupon codes are trimmed before validation

✅ **Discount Calculation Accuracy**
- 90% coupon discount is calculated correctly
- 5% new user discount is calculated correctly

## What These Tests Verify

### The Fix

The tests verify that both `/api/payment/calculate-total` and `/api/payment/process` endpoints:

1. **Check coupon code first** (before new user discount)
2. **Use the same discount logic** in both endpoints
3. **Apply discounts consistently** to prevent amount mismatches

### Before the Fix

- `/api/payment/calculate-total` checked coupon code first ✅
- `/api/payment/process` checked new user discount first ❌
- This caused payment amount mismatches when a coupon was used

### After the Fix

- Both endpoints check coupon code first ✅
- Both endpoints use identical discount logic ✅
- Payment amounts match between calculation and verification ✅

## Test Structure

The tests use:
- **Vitest** for the test framework
- **Supertest** for HTTP endpoint testing
- **Mocked dependencies** for Firebase Admin, Firestore, and authentication

## Expected Results

All tests should pass, confirming:
- ✅ Coupon codes are applied consistently
- ✅ New user discounts are applied consistently
- ✅ Amounts match between endpoints
- ✅ Discount precedence rules are followed


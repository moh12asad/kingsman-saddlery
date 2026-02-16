# Payment Flow Test Suite

## Overview

This test suite validates all critical fixes for the payment flow, ensuring:
1. Payment amount mismatch prevention
2. Failed order logging in all scenarios
3. Comprehensive error handling
4. Amount validation

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Tests with UI
```bash
npm run test:ui
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npm test OrderConfirmation.test.js
npm test paymentFlowValidation.test.js
```

## Test Files

### `OrderConfirmation.test.js`
Comprehensive integration tests for the payment flow:
- Payment amount validation
- Payment amount mismatch prevention
- Failed order logging scenarios
- Network error handling
- JSON parsing error handling
- Complete payment flow validation

### `paymentFlowValidation.test.js`
Unit tests for validation logic:
- Amount validation functions
- Total recalculation logic
- Server-verified amount logic
- Failed order payload creation
- Error handling scenarios

## Test Coverage

The tests cover:

✅ **Amount Validation**
- Null, zero, negative amounts
- NaN and Infinity values
- Too low (< 1 ILS) and too high (> 100,000 ILS) amounts
- Valid amounts

✅ **Payment Amount Mismatch Prevention**
- Total recalculation before payment
- Server-verified amount usage
- Stale value detection

✅ **Failed Order Logging**
- Payment verification failures
- Order creation failures
- Network errors
- JSON parsing errors
- Missing transaction IDs

✅ **Error Handling**
- Network request failures
- Invalid JSON responses
- Server errors (400, 500, etc.)
- Unexpected errors

✅ **Complete Flow**
- Successful payment flow
- Payment verification failure flow
- Order creation failure flow

## Expected Results

All tests should pass, confirming:
1. ✅ Amount validation prevents invalid payments
2. ✅ Failed orders are logged in all failure scenarios
3. ✅ Errors are handled gracefully
4. ✅ Payment flow works correctly with valid data

## Debugging Failed Tests

If a test fails:
1. Check the error message for specific failure point
2. Verify the mock data matches expected format
3. Check that fetch mocks are set up correctly
4. Ensure all async operations are awaited

## Adding New Tests

When adding new features or fixes:
1. Add test cases to the appropriate test file
2. Follow the existing test structure
3. Use descriptive test names
4. Mock external dependencies (fetch, APIs)
5. Test both success and failure scenarios


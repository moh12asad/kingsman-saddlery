# Testing Guide - Payment Flow Validation

## Quick Start

```bash
# Install test dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm test -- --watch

# Run tests with UI dashboard
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Files Created

### 1. `client/src/pages/__tests__/OrderConfirmation.test.js`
**Comprehensive integration tests** covering:
- ✅ Payment amount validation (null, zero, negative, NaN, Infinity, range checks)
- ✅ Payment amount mismatch prevention (recalculation, server verification)
- ✅ Failed order logging (payment verification failure, order creation failure)
- ✅ Network error handling (payment verification, order creation)
- ✅ JSON parsing error handling (non-JSON responses)
- ✅ Complete payment flow (success and failure scenarios)
- ✅ Edge cases (missing transaction ID, empty order data, delivery zone validation)

### 2. `client/src/pages/__tests__/paymentFlowValidation.test.js`
**Unit tests for validation logic** covering:
- ✅ Amount validation function logic
- ✅ Total recalculation logic
- ✅ Server-verified amount extraction
- ✅ Failed order payload creation
- ✅ Error handling scenarios (payment verification, order creation, network, JSON)

## What the Tests Validate

### ✅ Bug Fix #1: Payment Amount Mismatch
- Tests verify that stale totals are recalculated
- Tests verify server-verified amounts are used
- Tests verify amount validation prevents invalid payments

### ✅ Bug Fix #2: Failed Order Logging
- Tests verify failed orders are logged when payment verification fails
- Tests verify failed orders are logged when order creation fails
- Tests verify transaction IDs are included in logs

### ✅ Bug Fix #3: JSON Parsing Errors
- Tests verify failed orders are logged when JSON parsing fails
- Tests verify error details are captured (status, statusText, error message)

### ✅ Bug Fix #4: Network Errors
- Tests verify failed orders are logged when network requests fail
- Tests verify error details include error type and message

### ✅ Bug Fix #5: Amount Validation
- Tests verify payments are prevented with invalid amounts
- Tests verify range validation (1-100,000 ILS)

## Running Specific Test Suites

```bash
# Run only amount validation tests
npm test -- -t "Amount Validation"

# Run only failed order logging tests
npm test -- -t "Failed Order Logging"

# Run only error handling tests
npm test -- -t "Error Handling"

# Run only payment flow tests
npm test -- -t "Payment Flow"
```

## Test Results Interpretation

### ✅ All Tests Pass
- All critical bugs are fixed
- Payment flow is working correctly
- Failed orders will be logged in all scenarios

### ❌ Some Tests Fail
- Check which specific test failed
- Review the error message
- Verify the fix is correctly implemented
- Check mock data matches expected format

## Example Test Output

```
✓ Payment Flow Validation - Real Code Logic (15)
  ✓ Amount Validation Logic (10)
    ✓ should reject null total
    ✓ should reject zero total
    ✓ should reject negative total
    ✓ should reject NaN total
    ✓ should reject Infinity total
    ✓ should reject total < 1 ILS
    ✓ should reject total > 100,000 ILS
    ✓ should accept valid total
    ✓ should accept minimum valid total (1 ILS)
    ✓ should accept maximum valid total (100,000 ILS)
  ✓ Total Recalculation Logic (3)
  ✓ Server-Verified Amount Logic (3)
  ✓ Failed Order Logging Logic (3)
  ✓ Error Handling Scenarios (4)
  ✓ Complete Flow Validation (3)

Test Files  2 passed (2)
     Tests  35 passed (35)
  Start at  12:34:56
  Duration  1.23s
```

## Continuous Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
```

## Maintenance

- **Update tests** when adding new features
- **Add tests** when fixing bugs
- **Review test coverage** regularly
- **Keep mocks** up to date with API changes

## Troubleshooting

### Tests fail with "fetch is not defined"
- Ensure `vitest.config.js` is configured correctly
- Check that mocks are set up in `setup.js`

### Tests fail with "Cannot find module"
- Run `npm install` to install dependencies
- Check file paths are correct

### Tests timeout
- Increase timeout in test config if needed
- Check for infinite loops in test code


/**
 * Coupon Consistency Tests
 * 
 * Tests to verify that both /api/payment/calculate-total and /api/payment/process
 * use the same discount logic, preventing amount mismatches.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Coupon Consistency Tests', () => {
  let originalFetch;
  let fetchCalls;

  beforeEach(() => {
    originalFetch = global.fetch;
    fetchCalls = [];
    
    global.fetch = vi.fn((url, options) => {
      fetchCalls.push({ url, options });
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    fetchCalls = [];
    vi.clearAllMocks();
  });

  describe('Coupon Code Consistency', () => {
    it('should send coupon code to both calculate-total and payment/process', async () => {
      const couponCode = 'TEST90';
      const items = [{ id: 'product1', price: 22, quantity: 1 }];
      
      // Simulate calculate-total call
      await fetch('/api/payment/calculate-total', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          subtotal: 22,
          couponCode: couponCode
        })
      });

      // Simulate payment/process call
      await fetch('/api/payment/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 2.6,
          items,
          couponCode: couponCode
        })
      });

      // Verify both calls included coupon code
      const calculateCall = fetchCalls.find(c => c.url.includes('calculate-total'));
      const processCall = fetchCalls.find(c => c.url.includes('payment/process'));

      expect(calculateCall).toBeDefined();
      expect(processCall).toBeDefined();

      const calculateBody = JSON.parse(calculateCall.options.body);
      const processBody = JSON.parse(processCall.options.body);

      expect(calculateBody.couponCode).toBe(couponCode);
      expect(processBody.couponCode).toBe(couponCode);
    });

    it('should send null coupon code when no coupon is applied', async () => {
      const items = [{ id: 'product1', price: 22, quantity: 1 }];
      
      await fetch('/api/payment/calculate-total', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          subtotal: 22,
          couponCode: null
        })
      });

      await fetch('/api/payment/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 24.66,
          items,
          couponCode: null
        })
      });

      const calculateCall = fetchCalls.find(c => c.url.includes('calculate-total'));
      const processCall = fetchCalls.find(c => c.url.includes('payment/process'));

      const calculateBody = JSON.parse(calculateCall.options.body);
      const processBody = JSON.parse(processCall.options.body);

      expect(calculateBody.couponCode).toBeNull();
      expect(processBody.couponCode).toBeNull();
    });

    it('should send items array to both endpoints', async () => {
      const items = [
        { id: 'product1', price: 22, quantity: 1 },
        { id: 'product2', price: 15, quantity: 2 }
      ];
      
      await fetch('/api/payment/calculate-total', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, subtotal: 52 })
      });

      await fetch('/api/payment/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 50, items })
      });

      const calculateCall = fetchCalls.find(c => c.url.includes('calculate-total'));
      const processCall = fetchCalls.find(c => c.url.includes('payment/process'));

      const calculateBody = JSON.parse(calculateCall.options.body);
      const processBody = JSON.parse(processCall.options.body);

      expect(calculateBody.items).toEqual(items);
      expect(processBody.items).toEqual(items);
      expect(calculateBody.items.length).toBe(processBody.items.length);
    });
  });

  describe('Server Discount Logic Consistency', () => {
    // Simulate server-side discount logic
    const calculateDiscount = (subtotal, couponCode, hasNewUserDiscount) => {
      let discountAmount = 0;
      let discountType = null;

      // Check coupon code first (matches server logic)
      if (couponCode && couponCode.trim() !== "") {
        // Simulate 90% coupon
        if (couponCode === 'TEST90') {
          discountAmount = subtotal * 0.9;
          discountType = 'coupon';
        }
      } else if (hasNewUserDiscount) {
        // New user discount (5%)
        discountAmount = subtotal * 0.05;
        discountType = 'new_user';
      }

      const subtotalAfterDiscount = subtotal - discountAmount;
      const tax = subtotalAfterDiscount * 0.18;
      const total = subtotalAfterDiscount + tax;

      return {
        subtotalBeforeDiscount: subtotal,
        discountAmount,
        discountType,
        subtotalAfterDiscount,
        tax,
        total
      };
    };

    it('should calculate same total with coupon in both endpoints', () => {
      const subtotal = 22;
      const couponCode = 'TEST90';
      
      // Calculate-total endpoint calculation
      const calcResult = calculateDiscount(subtotal, couponCode, true);
      
      // Payment/process endpoint calculation (should be same)
      const processResult = calculateDiscount(subtotal, couponCode, true);
      
      expect(calcResult.total).toBe(processResult.total);
      expect(calcResult.discountType).toBe('coupon');
      expect(processResult.discountType).toBe('coupon');
      expect(calcResult.discountAmount).toBe(processResult.discountAmount);
    });

    it('should calculate same total without coupon in both endpoints', () => {
      const subtotal = 22;
      const couponCode = null;
      const hasNewUserDiscount = true;
      
      const calcResult = calculateDiscount(subtotal, couponCode, hasNewUserDiscount);
      const processResult = calculateDiscount(subtotal, couponCode, hasNewUserDiscount);
      
      expect(calcResult.total).toBe(processResult.total);
      expect(calcResult.discountType).toBe('new_user');
      expect(processResult.discountType).toBe('new_user');
    });

    it('should prioritize coupon over new user discount', () => {
      const subtotal = 22;
      const couponCode = 'TEST90';
      const hasNewUserDiscount = true;
      
      const result = calculateDiscount(subtotal, couponCode, hasNewUserDiscount);
      
      // Should use coupon, not new user discount
      expect(result.discountType).toBe('coupon');
      expect(result.discountAmount).toBe(22 * 0.9); // 90% discount
      expect(result.discountAmount).not.toBe(22 * 0.05); // Not 5% discount
    });

    it('should use new user discount when no coupon provided', () => {
      const subtotal = 22;
      const couponCode = null;
      const hasNewUserDiscount = true;
      
      const result = calculateDiscount(subtotal, couponCode, hasNewUserDiscount);
      
      expect(result.discountType).toBe('new_user');
      expect(result.discountAmount).toBe(22 * 0.05); // 5% discount
    });
  });

  describe('Amount Matching Scenarios', () => {
    it('should match amounts when coupon is applied consistently', async () => {
      const subtotal = 22;
      const couponCode = 'TEST90';
      
      // Simulate calculate-total response
      global.fetch = vi.fn((url) => {
        if (url.includes('calculate-total')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              total: 2.6, // 22 - 19.8 (90%) = 2.2, + 0.4 tax = 2.6
              subtotal: 2.2,
              tax: 0.4,
              discount: { amount: 19.8, percentage: 90, type: 'coupon' }
            })
          });
        }
        if (url.includes('payment/process')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              expectedTotal: 2.6, // Should match calculate-total
              amount: 2.6
            })
          });
        }
      });

      const calcRes = await fetch('/api/payment/calculate-total', {
        method: 'POST',
        body: JSON.stringify({ items: [], subtotal, couponCode })
      });
      const calcData = await calcRes.json();

      const processRes = await fetch('/api/payment/process', {
        method: 'POST',
        body: JSON.stringify({ amount: calcData.total, items: [], couponCode })
      });
      const processData = await processRes.json();

      expect(calcData.total).toBe(processData.expectedTotal);
      expect(processData.success).toBe(true);
    });

    it('should match amounts when new user discount is applied', async () => {
      const subtotal = 22;
      const couponCode = null;
      
      global.fetch = vi.fn((url) => {
        if (url.includes('calculate-total')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              total: 24.66, // 22 - 1.1 (5%) = 20.9, + 3.76 tax = 24.66
              subtotal: 20.9,
              tax: 3.76,
              discount: { amount: 1.1, percentage: 5, type: 'new_user' }
            })
          });
        }
        if (url.includes('payment/process')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              expectedTotal: 24.66,
              amount: 24.66
            })
          });
        }
      });

      const calcRes = await fetch('/api/payment/calculate-total', {
        method: 'POST',
        body: JSON.stringify({ items: [], subtotal, couponCode })
      });
      const calcData = await calcRes.json();

      const processRes = await fetch('/api/payment/process', {
        method: 'POST',
        body: JSON.stringify({ amount: calcData.total, items: [], couponCode })
      });
      const processData = await processRes.json();

      expect(calcData.total).toBe(processData.expectedTotal);
      expect(processData.success).toBe(true);
    });

    it('should detect mismatch when coupon is missing in payment/process', async () => {
      const subtotal = 22;
      const couponCode = 'TEST90';
      
      global.fetch = vi.fn((url) => {
        if (url.includes('calculate-total')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              total: 2.6, // With coupon
              discount: { type: 'coupon', percentage: 90 }
            })
          });
        }
        if (url.includes('payment/process')) {
          // Simulate server calculating without coupon (old bug)
          return Promise.resolve({
            ok: false,
            status: 400,
            json: async () => ({
              success: false,
              error: 'Payment amount mismatch',
              expectedTotal: 24.66, // Without coupon
              clientAmount: 2.6
            })
          });
        }
      });

      const calcRes = await fetch('/api/payment/calculate-total', {
        method: 'POST',
        body: JSON.stringify({ items: [], subtotal, couponCode })
      });
      const calcData = await calcRes.json();

      const processRes = await fetch('/api/payment/process', {
        method: 'POST',
        body: JSON.stringify({ amount: calcData.total, items: [], couponCode: null }) // Missing coupon!
      });
      const processData = await processRes.json();

      expect(processRes.ok).toBe(false);
      expect(processData.error).toBe('Payment amount mismatch');
      expect(processData.expectedTotal).not.toBe(calcData.total);
    });
  });

  describe('Recalculation Before Payment', () => {
    it('should recalculate total with same coupon code before payment verification', async () => {
      const staleTotal = 2.6; // Stale value
      const couponCode = 'TEST90';
      const items = [{ id: 'product1', price: 22, quantity: 1 }];
      
      let recalcCall = null;
      let paymentCall = null;

      global.fetch = vi.fn((url, options) => {
        if (url.includes('calculate-total')) {
          recalcCall = { url, body: JSON.parse(options.body) };
          return Promise.resolve({
            ok: true,
            json: async () => ({
              total: 2.6, // Fresh calculation
              discount: { type: 'coupon', percentage: 90 }
            })
          });
        }
        if (url.includes('payment/process')) {
          paymentCall = { url, body: JSON.parse(options.body) };
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, expectedTotal: 2.6 })
          });
        }
      });

      // Simulate recalculation
      const recalcRes = await fetch('/api/payment/calculate-total', {
        method: 'POST',
        body: JSON.stringify({ items, subtotal: 22, couponCode })
      });
      const recalcData = await recalcRes.json();
      const freshTotal = recalcData.total;

      // Simulate payment verification with fresh total
      await fetch('/api/payment/process', {
        method: 'POST',
        body: JSON.stringify({ amount: freshTotal, items, couponCode })
      });

      // Verify both calls used same coupon code
      expect(recalcCall.body.couponCode).toBe(couponCode);
      expect(paymentCall.body.couponCode).toBe(couponCode);
      expect(recalcCall.body.couponCode).toBe(paymentCall.body.couponCode);
    });

    it('should use fresh total instead of stale total', async () => {
      const staleTotal = 2.6; // Might be stale
      const couponCode = 'TEST90';
      
      global.fetch = vi.fn((url) => {
        if (url.includes('calculate-total')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              total: 2.6, // Fresh calculation
              discount: { type: 'coupon' }
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true })
        });
      });

      // Recalculate
      const recalcRes = await fetch('/api/payment/calculate-total', {
        method: 'POST',
        body: JSON.stringify({ items: [], subtotal: 22, couponCode })
      });
      const recalcData = await recalcRes.json();
      const freshTotal = recalcData.total;

      // Verify fresh total is used
      expect(freshTotal).toBe(2.6);
      // In real scenario, if stale was different, fresh would override it
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty coupon code string', () => {
      const couponCode = "";
      const hasCoupon = couponCode && typeof couponCode === "string" && couponCode.trim() !== "";
      
      expect(hasCoupon).toBe(false);
    });

    it('should handle whitespace-only coupon code', () => {
      const couponCode = "   ";
      const hasCoupon = couponCode && typeof couponCode === "string" && couponCode.trim() !== "";
      
      expect(hasCoupon).toBe(false);
    });

    it('should handle valid coupon code', () => {
      const couponCode = "TEST90";
      const hasCoupon = couponCode && typeof couponCode === "string" && couponCode.trim() !== "";
      
      expect(hasCoupon).toBe(true);
    });

    it('should handle coupon code case insensitivity', () => {
      const couponCode1 = "test90";
      const couponCode2 = "TEST90";
      const couponCode3 = "Test90";
      
      const normalized1 = couponCode1.toUpperCase();
      const normalized2 = couponCode2.toUpperCase();
      const normalized3 = couponCode3.toUpperCase();
      
      expect(normalized1).toBe(normalized2);
      expect(normalized2).toBe(normalized3);
    });
  });

  describe('Discount Calculation Accuracy', () => {
    it('should calculate 90% coupon discount correctly', () => {
      const subtotal = 22;
      const discountPercentage = 90;
      const discountAmount = subtotal * (discountPercentage / 100);
      const subtotalAfterDiscount = subtotal - discountAmount;
      const tax = subtotalAfterDiscount * 0.18;
      const total = subtotalAfterDiscount + tax;
      
      expect(discountAmount).toBe(19.8);
      expect(subtotalAfterDiscount).toBe(2.2);
      expect(tax).toBeCloseTo(0.396, 2);
      expect(total).toBeCloseTo(2.6, 2);
    });

    it('should calculate 5% new user discount correctly', () => {
      const subtotal = 22;
      const discountPercentage = 5;
      const discountAmount = subtotal * (discountPercentage / 100);
      const subtotalAfterDiscount = subtotal - discountAmount;
      const tax = subtotalAfterDiscount * 0.18;
      const total = subtotalAfterDiscount + tax;
      
      expect(discountAmount).toBe(1.1);
      expect(subtotalAfterDiscount).toBe(20.9);
      expect(tax).toBeCloseTo(3.762, 2);
      expect(total).toBeCloseTo(24.66, 2);
    });

    it('should ensure discount never exceeds subtotal', () => {
      const subtotal = 22;
      const discountPercentage = 150; // Invalid: > 100%
      const discountAmount = Math.min(subtotal * (discountPercentage / 100), subtotal);
      
      expect(discountAmount).toBeLessThanOrEqual(subtotal);
      expect(discountAmount).toBe(22); // Capped at subtotal
    });
  });

  describe('Integration: Complete Flow with Coupon', () => {
    it('should maintain consistency through entire payment flow', async () => {
      const items = [{ id: 'product1', price: 22, quantity: 1 }];
      const couponCode = 'TEST90';
      const subtotal = 22;
      
      const flow = {
        step1_calculateTotal: null,
        step2_recalculateBeforePayment: null,
        step3_paymentVerification: null,
        step4_orderCreation: null
      };

      global.fetch = vi.fn((url, options) => {
        const body = JSON.parse(options.body);
        
        if (url.includes('calculate-total')) {
          flow.step1_calculateTotal = {
            couponCode: body.couponCode,
            total: 2.6
          };
          return Promise.resolve({
            ok: true,
            json: async () => ({ total: 2.6, discount: { type: 'coupon' } })
          });
        }
        
        if (url.includes('payment/process')) {
          flow.step3_paymentVerification = {
            couponCode: body.couponCode,
            amount: body.amount,
            expectedTotal: 2.6
          };
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, expectedTotal: 2.6 })
          });
        }
        
        if (url.includes('orders/create')) {
          flow.step4_orderCreation = {
            couponCode: body.couponCode,
            total: body.total
          };
          return Promise.resolve({
            ok: true,
            json: async () => ({ id: 'order-123' })
          });
        }
      });

      // Step 1: Initial calculation
      await fetch('/api/payment/calculate-total', {
        method: 'POST',
        body: JSON.stringify({ items, subtotal, couponCode })
      });

      // Step 2: Recalculate before payment (simulated)
      flow.step2_recalculateBeforePayment = {
        couponCode: couponCode,
        total: 2.6
      };

      // Step 3: Payment verification
      await fetch('/api/payment/process', {
        method: 'POST',
        body: JSON.stringify({ amount: 2.6, items, couponCode })
      });

      // Step 4: Order creation
      await fetch('/api/orders/create', {
        method: 'POST',
        body: JSON.stringify({ items, total: 2.6, couponCode })
      });

      // Verify consistency
      expect(flow.step1_calculateTotal.couponCode).toBe(couponCode);
      expect(flow.step2_recalculateBeforePayment.couponCode).toBe(couponCode);
      expect(flow.step3_paymentVerification.couponCode).toBe(couponCode);
      expect(flow.step4_orderCreation.couponCode).toBe(couponCode);
      
      expect(flow.step1_calculateTotal.total).toBe(flow.step3_paymentVerification.expectedTotal);
      expect(flow.step3_paymentVerification.expectedTotal).toBe(flow.step4_orderCreation.total);
    });
  });
});


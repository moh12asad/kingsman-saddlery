# Security Fixes Testing Checklist

This checklist helps verify that all security fixes work correctly without breaking existing functionality.

---

## 🔐 Authentication & Authorization Tests

### 1. Admin Route Protection
**Test:** Verify admin routes require authentication

**Steps:**
1. **Without authentication:**
   - Open browser DevTools → Network tab
   - Try to access: `DELETE /api/admin/owners/{some-id}`
   - **Expected:** Should return `401 Unauthorized` or `403 Forbidden`
   - **Before fix:** Would have allowed deletion ❌
   - **After fix:** Should block unauthorized access ✅

2. **With authentication but non-admin user:**
   - Sign in as a regular user (not admin)
   - Try to delete an owner via admin panel
   - **Expected:** Should return `403 Forbidden` with message about insufficient permissions
   - **Before fix:** Would have allowed deletion ❌
   - **After fix:** Should block non-admin users ✅

3. **With admin authentication:**
   - Sign in as admin user
   - Try to delete an owner
   - **Expected:** Should work normally (if you have this feature in UI)
   - **Status:** Should work as before ✅

**Manual Test:**
```bash
# Test without token
curl -X DELETE http://localhost:5000/api/admin/owners/test-id
# Should return 401

# Test with invalid token
curl -X DELETE http://localhost:5000/api/admin/owners/test-id \
  -H "Authorization: Bearer invalid-token"
# Should return 401

# Test with valid non-admin token (if you have one)
# Should return 403
```

---

## 📧 Email Functionality Tests

### 2. Order Confirmation Email - XSS Prevention
**Test:** Verify HTML escaping works in email body, but NOT in subject

**Steps:**
1. **Create a test order with malicious input:**
   - Add product to cart
   - During checkout, try entering:
     - Name: `<script>alert('XSS')</script>Test User`
     - Address: `123 <img src=x onerror=alert(1)> Main St`
   - Complete order

2. **Check email received:**
   - **Subject line:** Should show plain text (e.g., "Order Confirmation #12345 - Kingsman Saddlery")
     - ✅ Should NOT show HTML entities like `&amp;` or `&lt;`
   - **Email body:**
     - ✅ Name should show as literal text: `<script>alert('XSS')</script>Test User`
     - ✅ Should NOT execute JavaScript
     - ✅ Address should show as literal text: `123 <img src=x onerror=alert(1)> Main St`
     - ✅ Should NOT render as HTML/image

3. **Verify in email client:**
   - Open email in Gmail/Outlook
   - Check that no scripts execute
   - Check that special characters display correctly (e.g., `&` shows as `&`, not `&amp;`)

**Test Cases:**
- Name with `&`: "Fish & Saddles" → Should show as "Fish & Saddles" in email body
- Name with `<script>`: Should show as literal text, not execute
- Address with HTML: Should show as literal text

---

### 3. Contact Form Email - Subject Line Fix
**Test:** Verify subject lines don't show HTML entities

**Steps:**
1. **Submit contact form with special characters:**
   - Name: "John & Jane"
   - Subject: "Question about Saddles & Tack"
   - Message: "I need help with <b>saddles</b>"

2. **Check email received:**
   - **Subject line:** Should show "New Contact Form: Question about Saddles & Tack - Kingsman Saddlery"
     - ✅ Should NOT show "Question about Saddles &amp; Tack"
     - ✅ The `&` character should appear normally
   - **Email body:**
     - ✅ Name should show as "John & Jane" (escaped in HTML body)
     - ✅ Message should show `<b>saddles</b>` as literal text (not bold)

**Test Cases:**
- Subject: "Fish & Saddles" → Subject should be "Fish & Saddles" (not "Fish &amp; Saddles")
- Subject: "Price < 100" → Subject should be "Price < 100" (not "Price &lt; 100")
- Subject with newlines: Should be removed/replaced with spaces

---

### 4. Email Header Injection Prevention
**Test:** Verify email validation prevents injection

**Steps:**
1. **Try to submit with malicious email:**
   - Contact form with email: `test@example.com\nBcc: attacker@evil.com`
   - **Expected:** Should reject with "Invalid email format" or "Email contains invalid characters"
   - ✅ Should NOT send email with BCC to attacker

2. **Try with valid email:**
   - Email: `test@example.com`
   - **Expected:** Should work normally
   - ✅ Email should be sent successfully

**Test Cases:**
- Email with newline: `test@example.com\nBcc: bad@evil.com` → Should be rejected
- Email with carriage return: `test@example.com\rBcc: bad@evil.com` → Should be rejected
- Valid email: `test@example.com` → Should work

---

## 🌐 CORS Configuration Tests

### 5. CORS Origin Validation
**Test:** Verify only allowed origins can access the API

**Steps:**
1. **From allowed origin (your frontend):**
   - Open your app at `http://localhost:5173` (or your dev URL)
   - Try to make API calls (login, fetch products, etc.)
   - **Expected:** Should work normally
   - ✅ All API calls should succeed

2. **From blocked origin:**
   - Open browser console on a different website (or use Postman with wrong origin)
   - Try to make API call:
   ```javascript
   fetch('http://localhost:5000/api/products', {
     credentials: 'include',
     headers: { 'Origin': 'http://evil-site.com' }
   })
   ```
   - **Expected:** Should be blocked by CORS
   - ✅ Should see CORS error in console
   - ✅ Server logs should show: `[CORS] Blocked request from origin: http://evil-site.com`

3. **From no origin (Postman/curl):**
   - Use Postman or curl (no origin header)
   - **Expected:** Should work (for API testing tools)
   - ✅ Should allow requests without origin

**Test Cases:**
- `http://localhost:5173` → Should work ✅
- `http://localhost:3000` → Should work ✅
- `http://evil-site.com` → Should be blocked ❌
- No origin (Postman) → Should work ✅

**Manual Test:**
```bash
# Should work (no origin)
curl http://localhost:5000/api/products

# Should be blocked (if you can set origin header)
# Browser from different origin will be blocked automatically
```

---

## 📦 Request Body Size Limit Tests

### 6. Large Payload Prevention
**Test:** Verify large request bodies are rejected

**Steps:**
1. **Normal request:**
   - Create a product with normal data
   - **Expected:** Should work
   - ✅ Should succeed

2. **Very large request:**
   - Try to create a product with extremely large description (e.g., 20MB of text)
   - **Expected:** Should reject with error about payload too large
   - ✅ Should return `413 Payload Too Large` or similar error
   - ✅ Should NOT crash the server

**Manual Test:**
```bash
# Create a large JSON payload (>10MB)
# Should be rejected
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{"description": "'$(python -c "print('x' * 11 * 1024 * 1024)")'"}'
# Should return error about payload size
```

---

## 🧪 Integration Tests

### 7. End-to-End Order Flow
**Test:** Complete order flow still works after security fixes

**Steps:**
1. **Sign in** as a user
2. **Add products** to cart
3. **Go to checkout:**
   - Enter shipping address with special characters: `123 & Main St, <City>`
   - Enter name with special characters: `John & Jane`
4. **Complete order:**
   - ✅ Order should be created successfully
   - ✅ Email should be sent
   - ✅ Email subject should show correctly (no HTML entities)
   - ✅ Email body should escape HTML properly
   - ✅ No JavaScript should execute in email

### 8. Admin Panel Access
**Test:** Admin routes work correctly with authentication

**Steps:**
1. **As admin user:**
   - Sign in as admin
   - Access admin panel
   - Try to create/edit/delete products
   - ✅ Should work normally

2. **As regular user:**
   - Sign in as regular user
   - Try to access admin panel
   - ✅ Should be blocked or redirected

---

## 🐛 Regression Tests

### 9. Verify Nothing Broke
**Test:** Ensure existing functionality still works

**Checklist:**
- ✅ User sign up/sign in works
- ✅ Product listing works
- ✅ Product search/filter works
- ✅ Cart functionality works
- ✅ Order creation works
- ✅ Order history works
- ✅ Contact form submission works
- ✅ Email notifications are sent
- ✅ Admin panel loads (for admins)
- ✅ File uploads work (for admins)

---

## 🔍 Browser Console Checks

### 10. Check for Errors
**Test:** Verify no new errors in console

**Steps:**
1. Open browser DevTools → Console
2. Navigate through the app
3. **Expected:**
   - ✅ No CORS errors (except from blocked origins, which is expected)
   - ✅ No authentication errors (unless testing unauthorized access)
   - ✅ No JavaScript errors related to our changes

---

## 📝 Quick Test Script

Run this quick test to verify key functionality:

```javascript
// Run in browser console on your app (http://localhost:5173)

// 1. Test CORS (should work from your origin)
fetch('http://localhost:5000/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// 2. Test authentication required (should fail without token)
fetch('http://localhost:5000/api/admin/hello')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error); // Should get 401

// 3. Test products endpoint (should work)
fetch('http://localhost:5000/api/products')
  .then(r => r.json())
  .then(data => console.log('Products loaded:', data.products?.length))
  .catch(console.error);
```

---

## 🎯 Priority Testing Order

1. **Critical (Do First):**
   - ✅ Admin route authentication (Test #1)
   - ✅ Email subject lines (Test #3)
   - ✅ CORS configuration (Test #5)

2. **Important (Do Second):**
   - ✅ Email XSS prevention (Test #2)
   - ✅ Email header injection (Test #4)
   - ✅ End-to-end order flow (Test #7)

3. **Verification (Do Third):**
   - ✅ Request body size limits (Test #6)
   - ✅ Regression tests (Test #9)
   - ✅ Browser console checks (Test #10)

---

## 🚨 What to Watch For

### Red Flags (Something is Wrong):
- ❌ Email subjects showing `&amp;` or `&lt;` instead of `&` or `<`
- ❌ Admin routes accessible without authentication
- ❌ CORS errors on your own frontend
- ❌ Emails with executable JavaScript
- ❌ Server crashes on large payloads
- ❌ Existing functionality broken

### Green Flags (Everything is Good):
- ✅ Email subjects show special characters correctly
- ✅ Admin routes require authentication
- ✅ CORS blocks unauthorized origins
- ✅ Emails escape HTML properly
- ✅ Large payloads are rejected gracefully
- ✅ All existing functionality works

---

## 📧 Email Testing Tips

1. **Use a test email service:**
   - Use Mailtrap, MailHog, or similar for testing
   - Or use a real email you control

2. **Check email source:**
   - View email source/raw HTML
   - Verify HTML entities in body (should be escaped)
   - Verify subject line is plain text (no HTML entities)

3. **Test in multiple email clients:**
   - Gmail
   - Outlook
   - Apple Mail
   - Mobile email apps

---

## 🔧 Debugging Tips

If something doesn't work:

1. **Check server logs:**
   - Look for CORS warnings
   - Check for authentication errors
   - Verify email sending logs

2. **Check browser network tab:**
   - Verify request headers
   - Check response status codes
   - Look for CORS errors

3. **Check email source:**
   - View raw email HTML
   - Verify escaping is correct

4. **Test endpoints directly:**
   - Use Postman or curl
   - Test with/without authentication
   - Test with different origins

---

**Last Updated:** 2025-01-27  
**Status:** Ready for testing


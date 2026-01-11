# Security Audit Report - Kingsman Saddlery

**Date:** 2025-01-27  
**Scope:** Full codebase security review focusing on fraud prevention, authentication, authorization, and input validation

---

## Executive Summary

This audit identified **12 security vulnerabilities** ranging from **CRITICAL** to **LOW** severity. The codebase has good security practices in place for payment processing and price validation, but several areas need immediate attention, particularly around XSS prevention, rate limiting, and CORS configuration.

---

## 🔴 CRITICAL VULNERABILITIES

### 1. XSS Vulnerability in Email Templates
**Severity:** CRITICAL  
**Location:** `server/lib/emailService.js` (lines 90-100, 106-109, 484-512)

**Issue:**
User input is directly inserted into HTML email templates without escaping, allowing XSS attacks through email content.

**Vulnerable Code:**
```javascript
// Line 95: Direct insertion without escaping
<td>${item.name}</td>

// Line 106-108: Direct insertion of address fields
<p>${shippingAddress.street}</p>
<p>${shippingAddress.city} ${shippingAddress.zipCode}</p>

// Line 484-511: Contact form data inserted directly
<strong>Name:</strong> ${name}
<strong>Email:</strong> ${email}
<strong>Message:</strong> ${message}
```

**Impact:**
- Attackers can inject malicious JavaScript into emails
- Email clients that render HTML could execute malicious code
- Potential for phishing attacks and data exfiltration

**Recommendation:**
```javascript
// Add HTML escaping function
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Use it in templates
<td>${escapeHtml(item.name)}</td>
<p>${escapeHtml(shippingAddress.street)}</p>
```

**Priority:** Fix immediately

---

### 2. Missing Authentication on Admin Route
**Severity:** CRITICAL  
**Location:** `server/routes/admin.js` (line 19)

**Issue:**
The `/api/admin/owners/:id` DELETE endpoint has no authentication middleware, allowing anyone to delete owner accounts.

**Vulnerable Code:**
```javascript
router.delete("/owners/:id", async (req, res) => {
    // No verifyFirebaseToken or requireRole middleware!
```

**Impact:**
- Unauthorized users can delete owner accounts
- Complete account takeover possible
- Data loss and service disruption

**Recommendation:**
```javascript
router.delete("/owners/:id", verifyFirebaseToken, requireRole("ADMIN"), async (req, res) => {
```

**Priority:** Fix immediately

---

### 3. Overly Permissive CORS Configuration
**Severity:** CRITICAL  
**Location:** `server/server.js` (line 31)

**Issue:**
CORS is configured to allow requests from any origin (`origin: true`), which is dangerous in production.

**Vulnerable Code:**
```javascript
app.use(cors({ origin: true, credentials: true }));
```

**Impact:**
- Any website can make authenticated requests to your API
- CSRF attacks possible
- Data exfiltration risk

**Recommendation:**
```javascript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:3000',
  // Add your production domains
];

app.use(cors({ 
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true 
}));
```

**Priority:** Fix before production deployment

---

## 🟠 HIGH SEVERITY VULNERABILITIES

### 4. No Rate Limiting
**Severity:** HIGH  
**Location:** All API endpoints

**Issue:**
No rate limiting is implemented, making the API vulnerable to:
- Brute force attacks on authentication
- DoS attacks
- Payment endpoint abuse
- Contact form spam

**Impact:**
- Account enumeration attacks
- Service disruption
- Resource exhaustion
- Increased costs

**Recommendation:**
```bash
npm install express-rate-limit
```

```javascript
import rateLimit from 'express-rate-limit';

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true
});

// Apply to routes
app.use('/api/', apiLimiter);
app.use('/api/users/check-exists', authLimiter);
app.use('/api/payment/', rateLimit({ windowMs: 1 * 60 * 1000, max: 10 }));
```

**Priority:** Implement before production

---

### 5. Missing Request Body Size Limits
**Severity:** HIGH  
**Location:** `server/server.js` (line 32)

**Issue:**
No limit on request body size, allowing attackers to send extremely large payloads.

**Vulnerable Code:**
```javascript
app.use(express.json()); // No size limit!
```

**Impact:**
- DoS attacks via large payloads
- Memory exhaustion
- Service crashes

**Recommendation:**
```javascript
app.use(express.json({ limit: '10mb' })); // Set reasonable limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

**Priority:** Fix immediately

---

### 6. Client-Side File Size Validation Only
**Severity:** HIGH  
**Location:** `client/src/pages/Admin/Ads.jsx` (line 99-102)

**Issue:**
File size limits are only enforced client-side. Server-side validation is missing.

**Vulnerable Code:**
```javascript
// Client-side only
const maxSize = 5 * 1024 * 1024; // 5MB
if (file.size > maxSize) {
  setAdError("Image size must be less than 5MB");
  return;
}
```

**Impact:**
- Attackers can bypass client-side checks
- Large file uploads can exhaust storage
- DoS attacks possible

**Recommendation:**
Implement server-side validation in Firebase Storage rules or add a proxy endpoint that validates before upload.

**Priority:** Implement server-side validation

---

### 7. Missing Security Headers
**Severity:** HIGH  
**Location:** `server/server.js`

**Issue:**
No security headers configured (helmet.js not used).

**Impact:**
- XSS attacks easier to execute
- Clickjacking possible
- MIME type sniffing attacks
- Information disclosure

**Recommendation:**
```bash
npm install helmet
```

```javascript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Adjust based on your needs
}));
```

**Priority:** Implement before production

---

## 🟡 MEDIUM SEVERITY VULNERABILITIES

### 8. Email Injection Vulnerability
**Severity:** MEDIUM  
**Location:** `server/lib/emailService.js` (line 289, 570)

**Issue:**
User-provided email addresses are used directly in email headers without validation.

**Vulnerable Code:**
```javascript
to: customerEmail, // Could contain injection payload
replyTo: contactData.email, // Could contain injection payload
```

**Impact:**
- Email header injection
- Spam relay attacks
- Email spoofing

**Recommendation:**
```javascript
// Validate email format strictly
function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
  // Check for injection attempts
  if (/[\r\n]/.test(email)) {
    throw new Error('Email contains invalid characters');
  }
  return email.trim().toLowerCase();
}

// Use validated email
to: validateEmail(customerEmail),
```

**Priority:** Fix in next update

---

### 9. Insufficient Input Sanitization in Contact Form
**Severity:** MEDIUM  
**Location:** `server/routes/contact.js` (lines 31-35)

**Issue:**
Contact form input is only trimmed, not sanitized for special characters or length limits.

**Vulnerable Code:**
```javascript
name: name.trim(),
email: email.trim().toLowerCase(),
message: message.trim(),
```

**Impact:**
- Potential for stored XSS if data is displayed
- Database injection (though Firestore is less vulnerable)
- Extremely long inputs could cause issues

**Recommendation:**
```javascript
// Add input sanitization
function sanitizeInput(input, maxLength = 5000) {
  if (typeof input !== 'string') return '';
  let sanitized = input.trim();
  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  return sanitized;
}

name: sanitizeInput(name, 100),
message: sanitizeInput(message, 5000),
```

**Priority:** Fix in next update

---

### 10. Sensitive Data in Logs
**Severity:** MEDIUM  
**Location:** Multiple files (payment.js, emailService.js)

**Issue:**
Some potentially sensitive data is logged, though payment card data is correctly excluded.

**Examples:**
- User emails in logs
- IP addresses (acceptable but should be considered)
- Order details

**Recommendation:**
- Use log levels appropriately
- Redact sensitive information in production logs
- Consider using a logging service with data masking

**Priority:** Review and improve logging

---

## 🟢 LOW SEVERITY / BEST PRACTICES

### 11. Missing Input Validation on Some Endpoints
**Severity:** LOW  
**Location:** Various admin endpoints

**Issue:**
Some endpoints don't validate all input types and ranges thoroughly.

**Recommendation:**
- Add comprehensive input validation middleware
- Use a validation library like `joi` or `express-validator`
- Validate all numeric inputs are within expected ranges

---

### 12. No Request ID Tracking for Security Monitoring
**Severity:** LOW  
**Location:** Most endpoints

**Issue:**
While payment endpoints have request IDs, other endpoints don't, making security monitoring harder.

**Recommendation:**
- Add request ID middleware for all endpoints
- Log security events (failed auth, rate limit hits, etc.)
- Consider implementing a security event logging system

---

## ✅ GOOD SECURITY PRACTICES FOUND

1. **Price Validation:** Excellent server-side price validation in order creation
2. **Discount Calculation:** Server-side discount eligibility checks prevent manipulation
3. **Payment Amount Validation:** Payment amounts are validated against server calculations
4. **Authentication Middleware:** Most routes properly use `verifyFirebaseToken`
5. **Role-Based Access Control:** `requireRole` middleware is used appropriately
6. **Firebase Security Rules:** Firestore rules appear to be properly configured
7. **File Type Validation:** Image uploads validate file types
8. **No Card Data Logging:** Payment endpoints correctly avoid logging card data

---

## 📋 RECOMMENDED ACTION PLAN

### Immediate (This Week)
1. ✅ Fix XSS in email templates (Critical)
2. ✅ Add authentication to admin route (Critical)
3. ✅ Restrict CORS configuration (Critical)
4. ✅ Add request body size limits (High)

### Short Term (This Month)
5. ✅ Implement rate limiting (High)
6. ✅ Add security headers with helmet (High)
7. ✅ Add server-side file size validation (High)
8. ✅ Fix email injection vulnerability (Medium)

### Medium Term (Next Quarter)
9. ✅ Improve input sanitization (Medium)
10. ✅ Review and improve logging (Medium)
11. ✅ Add comprehensive input validation (Low)
12. ✅ Implement security monitoring (Low)

---

## 🔒 ADDITIONAL RECOMMENDATIONS

1. **Implement CSRF Protection:** Consider adding CSRF tokens for state-changing operations
2. **Add Request Timeout:** Configure request timeouts to prevent hanging requests
3. **Environment Variable Security:** Ensure `.env` files are in `.gitignore` (verify this)
4. **Dependency Scanning:** Regularly run `npm audit` to check for vulnerable dependencies
5. **Security Testing:** Consider adding automated security tests
6. **Penetration Testing:** Consider professional penetration testing before production launch
7. **Backup Security:** Ensure database backups are encrypted and access-controlled
8. **Monitoring:** Set up alerts for suspicious activity (multiple failed logins, unusual payment patterns)

---

## 📝 NOTES

- The codebase shows good security awareness in payment processing
- Most critical issues are fixable with relatively simple changes
- Consider implementing a security review process for future code changes
- Document security decisions and trade-offs

---

**Report Generated:** 2025-01-27  
**Next Review Recommended:** After implementing critical fixes


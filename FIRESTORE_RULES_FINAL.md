# Firebase Firestore Security Rules - Final Version

## 📋 Ready to Use - Copy & Paste

This file contains the complete Firestore security rules with all validations. Simply copy the rules below and paste them into your Firebase Console.

## 🚀 Quick Start

1. **Go to**: [Firebase Console](https://console.firebase.google.com/)
2. **Select**: Your project (`kingsman-saddlery-dev`)
3. **Navigate to**: Firestore Database → **Rules** tab
4. **Copy** the rules below (everything between the code fences)
5. **Paste** into the rules editor
6. **Click**: "Publish"
7. **Wait**: 1-2 minutes for rules to propagate

---

## 📝 Complete Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================
    // Helper Functions
    // ============================================
    
    // Check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Check if user owns the resource (by userId)
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Validate email format
    function isValidEmail(email) {
      return email.matches('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$');
    }
    
    // Validate string length (min, max)
    function isValidStringLength(str, min, max) {
      return str is string && str.size() >= min && str.size() <= max;
    }
    
    // Validate phone number (basic validation)
    function isValidPhone(phone) {
      return phone is string && phone.size() <= 20;
    }
    
    // Validate positive number
    function isPositiveNumber(num) {
      return num is number && num >= 0;
    }
    
    // Validate array is not empty
    function isNonEmptyArray(arr) {
      return arr is list && arr.size() > 0;
    }
    
    // ============================================
    // Settings Collection
    // ============================================
    // Read: Public (anyone can read store info for Footer, ContactUs page, etc.)
    // Write: Deny all client writes (only backend API can write, with admin verification)
    match /settings/{document=**} {
      allow read: if true; // Public read access
      allow write: if false; // No direct client writes - all writes go through backend API
    }
    
    // ============================================
    // Contact Submissions Collection
    // ============================================
    // Read: Only backend (admin routes enforce this)
    // Write: Public create with validations (anyone can submit contact forms)
    match /contact_submissions/{submissionId} {
      // Only backend can read (admin routes)
      allow read: if false;
      
      // Anyone can create, but with validations
      allow create: if 
        // Required fields validation
        request.resource.data.keys().hasAll(['name', 'email', 'subject', 'message', 'status', 'createdAt']) &&
        // Name validation: non-empty string, 2-100 characters
        isValidStringLength(request.resource.data.name, 2, 100) &&
        // Email validation: valid format and non-empty
        isValidEmail(request.resource.data.email) &&
        isValidStringLength(request.resource.data.email, 5, 255) &&
        // Subject validation: non-empty string, 3-200 characters
        isValidStringLength(request.resource.data.subject, 3, 200) &&
        // Message validation: non-empty string, 10-5000 characters
        isValidStringLength(request.resource.data.message, 10, 5000) &&
        // Phone validation (optional): if provided, must be valid string
        (!('phone' in request.resource.data) || 
         request.resource.data.phone == null || 
         (request.resource.data.phone is string && isValidPhone(request.resource.data.phone))) &&
        // Status validation: must be "new" for new submissions
        request.resource.data.status is string &&
        request.resource.data.status == "new" &&
        // Timestamp validation: createdAt must be server timestamp
        request.resource.data.createdAt == request.time;
      
      // Only backend can update/delete
      allow update, delete: if false;
    }
    
    // ============================================
    // Users Collection
    // ============================================
    match /users/{userId} {
      // Users can only read their own data
      allow read: if isOwner(userId);
      
      // All writes go through backend API (backend validates role, active status, etc.)
      allow write: if false;
    }
    
    // ============================================
    // Products Collection
    // ============================================
    match /products/{productId} {
      // Public read access
      allow read: if true;
      
      // All writes go through backend API
      allow write: if false;
    }
    
    // ============================================
    // Categories Collection
    // ============================================
    match /categories/{categoryId} {
      // Public read access
      allow read: if true;
      
      // All writes go through backend API
      allow write: if false;
    }
    
    // ============================================
    // Orders Collection
    // ============================================
    match /orders/{orderId} {
      // Users can only read their own orders
      // Validate ownership by checking customerId or customerEmail
      allow read: if isAuthenticated() && resource != null && (
        // Check if order belongs to authenticated user by customerId
        ('customerId' in resource.data && 
         resource.data.customerId is string && 
         resource.data.customerId == request.auth.uid) ||
        // OR check by customerEmail (for flexibility)
        ('customerEmail' in resource.data && 
         resource.data.customerEmail is string && 
         resource.data.customerEmail == request.auth.token.email)
      );
      
      // All writes go through backend API (backend validates prices, items, totals, etc.)
      allow write: if false;
    }
    
    // ============================================
    // Brands Collection
    // ============================================
    match /brands/{brandId} {
      // Public read access
      allow read: if true;
      
      // All writes go through backend API
      allow write: if false;
    }
    
    // ============================================
    // Hero Slides Collection
    // ============================================
    match /hero-slides/{slideId} {
      // Public read access
      allow read: if true;
      
      // All writes go through backend API
      allow write: if false;
    }
    
    // ============================================
    // Ads Collection
    // ============================================
    match /ads/{adId} {
      // Public read access
      allow read: if true;
      
      // All writes go through backend API
      allow write: if false;
    }
    
    // ============================================
    // Default: Deny all other collections
    // ============================================
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 🔒 Security Features

### ✅ Contact Submissions Validations
- **Required fields**: name, email, subject, message, status, createdAt
- **Name**: 2-100 characters
- **Email**: Valid format, 5-255 characters
- **Subject**: 3-200 characters
- **Message**: 10-5000 characters
- **Phone**: Optional, max 20 characters
- **Status**: Must be "new" for new submissions
- **Timestamp**: Must be server timestamp

### ✅ Orders Ownership Validation
- Users can only read their own orders
- Checks both `customerId` and `customerEmail`
- Validates resource exists before checking
- Prevents unauthorized access

### ✅ Users Collection
- Users can only read their own data
- All writes go through backend API

### ✅ Public Collections
- Products, Categories, Brands, Hero Slides, Ads: Public read access
- Settings: Public read access (store info)

### ✅ Write Protection
- **All writes blocked** from client
- All writes go through backend API
- Backend uses Admin SDK (bypasses rules)

---

## 📊 Collections Covered

| Collection | Read Access | Write Access | Validations |
|------------|-------------|--------------|-------------|
| `settings` | Public | Backend only | None (read-only) |
| `contact_submissions` | Backend only | Public create (with validations) | Email, string lengths, required fields |
| `users` | Own data only | Backend only | Ownership check |
| `products` | Public | Backend only | None (read-only) |
| `categories` | Public | Backend only | None (read-only) |
| `orders` | Own orders only | Backend only | Ownership check |
| `brands` | Public | Backend only | None (read-only) |
| `hero-slides` | Public | Backend only | None (read-only) |
| `ads` | Public | Backend only | None (read-only) |

---

## 🧪 Testing Checklist

After applying the rules, test:

### Contact Form
- [ ] Valid submission works
- [ ] Missing required fields are rejected
- [ ] Invalid email format is rejected
- [ ] Too short/long strings are rejected
- [ ] Invalid status is rejected

### Orders
- [ ] Users can read their own orders
- [ ] Users cannot read other users' orders
- [ ] Unauthenticated users cannot read orders

### Public Access
- [ ] Products are publicly readable
- [ ] Categories are publicly readable
- [ ] Settings are publicly readable
- [ ] Brands are publicly readable

### User Data
- [ ] Users can read their own data
- [ ] Users cannot read other users' data

---

## ⚠️ Important Notes

1. **Backend Uses Admin SDK**: The backend uses Firebase Admin SDK which bypasses Firestore rules. This is intentional and necessary.

2. **Rules are First Line of Defense**: These rules prevent unauthorized direct client access. Backend API is the primary security enforcement.

3. **Propagation Time**: Rules may take 1-2 minutes to propagate after publishing.

4. **Testing**: Always test after applying rules to ensure everything works correctly.

---

## 🐛 Troubleshooting

### "Permission Denied" Errors
- Check if data passes all validations
- Verify field names match exactly (case-sensitive)
- Check string lengths are within limits
- Verify email format is correct
- Ensure required fields are present

### Contact Form Not Working
- Check all required fields are present
- Verify email format is valid
- Check string lengths are within limits
- Verify status is "new"
- Check createdAt is server timestamp

### Orders Not Accessible
- Verify user is authenticated
- Check order has `customerId` or `customerEmail` matching user
- Ensure resource exists

---

## ✅ Ready to Deploy

These rules are production-ready and include:
- ✅ All necessary validations
- ✅ Ownership checks
- ✅ Data structure validation
- ✅ Defense in depth security
- ✅ Clear documentation

**Just copy, paste, and publish!**


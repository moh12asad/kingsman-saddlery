# Firebase Firestore Security Rules

## Overview
This document provides the Firebase Firestore security rules needed for the application, including the new `settings` collection.

## Firestore Rules

Add the following rules to your Firebase Firestore rules in the Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Settings collection - Store information (working hours, contact details, location)
    // Read: Public (anyone can read store info for Footer, ContactUs page, etc.)
    // Write: Deny all client writes (only backend API can write, with admin verification)
    match /settings/{document=**} {
      allow read: if true; // Public read access
      allow write: if false; // No direct client writes - all writes go through backend API
    }
    
    // Contact submissions collection
    // Read: Only admins (enforced by backend)
    // Write: Public (anyone can submit contact forms)
    match /contact_submissions/{document=**} {
      allow read: if false; // Only backend can read (admin routes)
      allow create: if true; // Anyone can submit contact forms
      allow update, delete: if false; // Only backend can update/delete
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId; // Users can read their own data
      allow write: if false; // All writes go through backend API
    }
    
    // Products collection
    match /products/{productId} {
      allow read: if true; // Public read access
      allow write: if false; // All writes go through backend API
    }
    
    // Categories collection
    match /categories/{categoryId} {
      allow read: if true; // Public read access
      allow write: if false; // All writes go through backend API
    }
    
    // Orders collection
    match /orders/{orderId} {
      allow read: if request.auth != null; // Authenticated users can read their own orders
      allow write: if false; // All writes go through backend API
    }
    
    // Brands collection
    match /brands/{brandId} {
      allow read: if true; // Public read access
      allow write: if false; // All writes go through backend API
    }
    
    // Hero slides collection
    match /hero-slides/{slideId} {
      allow read: if true; // Public read access
      allow write: if false; // All writes go through backend API
    }
    
    // Ads collection
    match /ads/{adId} {
      allow read: if true; // Public read access
      allow write: if false; // All writes go through backend API
    }
    
    // Default: Deny all other collections
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## How to Apply

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `kingsman-saddlery-dev` (or your project name)
3. Navigate to **Firestore Database** → **Rules**
4. Replace the existing rules with the rules above
5. Click **Publish**

## Security Model

### Defense in Depth
This application uses a **multi-layer security approach**:

1. **Firestore Rules** (this file) - First line of defense
   - Prevents unauthorized direct client access
   - Blocks malicious attempts to read/write data directly

2. **Backend API Middleware** - Primary security enforcement
   - `verifyFirebaseToken` - Validates user authentication
   - `requireRole("ADMIN")` - Validates admin role from Firestore
   - All writes go through the backend API, not directly from client

3. **Client-side Checks** - User experience
   - `checkAdmin()` - Hides admin UI from non-admins
   - Prevents unnecessary API calls

### Settings Collection Security

- **Read Access**: Public
  - Store information (hours, contact details, location) needs to be publicly accessible
  - Used by Footer, ContactUs page, and email service
  - No sensitive data is stored here

- **Write Access**: Backend API only
  - All writes go through `/api/settings` endpoint
  - Backend enforces `requireRole("ADMIN")` middleware
  - Firestore rules deny direct client writes as an extra security layer

### Contact Submissions Collection Security

- **Read Access**: Backend only
  - Only admins can view contact submissions through the backend API
  - Firestore rules deny direct client reads

- **Create Access**: Public
  - Anyone can submit contact forms
  - Validation happens in the backend route

- **Update/Delete Access**: Backend only
  - Only admins can update/delete submissions through the backend API

## Important Notes

1. **No Direct Client Access**: The application does NOT access Firestore directly from the client. All database operations go through the backend API (`/api/*` routes).

2. **Role-Based Access**: Firestore rules cannot directly check custom roles stored in Firestore. Role verification happens at the backend API level using the `requireRole()` middleware.

3. **Service Account**: The backend uses a Firebase Admin SDK service account which bypasses Firestore rules. This is intentional and necessary for the backend to function.

4. **Testing**: After updating rules, test that:
   - Public pages (Footer, ContactUs) can still load store info
   - Contact form submissions work
   - Admin settings page can save (through backend API)
   - Direct Firestore access from client is blocked

## Troubleshooting

If you encounter permission errors:

1. **Check Firebase Console**: Ensure rules are published
2. **Check Backend Logs**: Look for Firestore permission errors
3. **Verify Service Account**: Ensure backend service account has proper permissions
4. **Test API Endpoints**: Use Postman or curl to test backend routes directly


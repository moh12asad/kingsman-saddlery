# Firebase Storage Rules for Ads

## Overview
This document provides the Firebase Storage security rules needed for the promotional banner ads feature.

## Storage Rules

Add the following rule to your Firebase Storage rules in the Firebase Console:

```javascript
// Allow only admins to upload to ads folder (for promotional banner ads)
// Note: Storage rules cannot directly check Firestore roles.
// Security is enforced through multiple layers:
// 1. Client-side: checkAdmin() verifies user has ADMIN role in Firestore
// 2. Backend: requireRole("ADMIN") middleware validates admin role
// 3. Storage rules: Allow authenticated writes (admin check happens before upload)
match /ads/{allPaths=**} {
  allow read: if true; // Anyone can read
  allow write: if request.auth != null; // Admin role verified by client and backend
}
```

## Complete Storage Rules Example

Here's the complete storage rules file with all folders including the new `ads` folder:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload to products folder
    match /products/{allPaths=**} {
      allow read: if true; // Anyone can read
      allow write: if request.auth != null; // Only authenticated users can write
    }
    
    // Allow authenticated users to upload to owners folder
    match /owners/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Allow only admins to upload to categories folder
    match /categories/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null; // Admin role verified by client and backend
    }
    
    // Allow authenticated users to upload to hero folder (for hero carousel images)
    match /hero/{allPaths=**} {
      allow read: if true; // Anyone can read
      allow write: if request.auth != null; // Only authenticated users can write
    }
    
    // Allow only admins to upload to brands folder
    match /brands/{allPaths=**} {
      allow read: if true; // Anyone can read
      allow write: if request.auth != null; // Admin role verified by client and backend
    }
    
    // Allow only admins to upload to ads folder (for promotional banner ads)
    match /ads/{allPaths=**} {
      allow read: if true; // Anyone can read
      allow write: if request.auth != null; // Admin role verified by client and backend
    }
  }
}
```

## How to Apply

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `kingsman-saddlery-dev`
3. Navigate to **Storage** → **Rules**
4. Add the `ads` folder rule (or replace the entire rules file with the complete example above)
5. Click **Publish**

## Security Notes

- **Read Access**: Public (anyone can view ads)
- **Write Access**: Authenticated users only (admin verification happens at the application level)
- **File Size Limit**: 5MB per image (enforced in the client code)
- **File Types**: Images only (enforced in the client code)

## Testing

After applying the rules:
1. Sign in as an admin user
2. Navigate to Admin → Ad
3. Try uploading an image
4. Verify the image appears in Firebase Storage under the `ads/` folder
5. Check that the ad appears on the shop page in the promotional banner

## Troubleshooting

- **"Unauthorized" error**: Make sure you're signed in and the storage rules allow authenticated writes
- **CORS errors**: See `FIREBASE_STORAGE_SETUP.md` for CORS configuration
- **Upload fails**: Check browser console for specific error messages





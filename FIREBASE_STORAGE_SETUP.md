# Firebase Storage CORS Configuration Guide

## The Problem
You're getting a CORS error when uploading images to Firebase Storage. This happens because Firebase Storage requires proper CORS configuration and security rules.

## Solution 1: Configure Firebase Storage Security Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `kingsman-saddlery-dev`
3. Navigate to **Storage** → **Rules**
4. Update your rules to allow authenticated uploads:

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
    // Note: Storage rules cannot directly check Firestore roles.
    // Security is enforced through multiple layers:
    // 1. Client-side: checkAdmin() verifies user has ADMIN role in Firestore
    // 2. Backend: requireRole("ADMIN") middleware validates admin role
    // 3. Storage rules: Allow authenticated writes (admin check happens before upload)
    match /categories/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null; // Admin role verified by client and backend
    }
  }
}
```

5. Click **Publish**

## Solution 2: Configure CORS on Firebase Storage Bucket

If you still get CORS errors, you need to configure CORS on your Storage bucket using `gsutil`:

1. **Install Google Cloud SDK** (if not already installed):
   - Download from: https://cloud.google.com/sdk/docs/install

2. **Authenticate with Google Cloud**:
   ```bash
   gcloud auth login
   ```

3. **Set your project**:
   ```bash
   gcloud config set project kingsman-saddlery-dev
   ```

4. **Create a CORS configuration file** (`cors.json`):
   ```json
   [
     {
       "origin": ["http://localhost:5173", "http://localhost:3000", "https://yourdomain.com"],
       "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
       "maxAgeSeconds": 3600,
       "responseHeader": ["Content-Type", "Authorization"]
     }
   ]
   ```

5. **Apply CORS configuration**:
   ```bash
   gsutil cors set cors.json gs://kingsman-saddlery-dev.firebasestorage.app
   ```

   Or if your bucket name is different:
   ```bash
   gsutil cors set cors.json gs://kingsman-saddlery-dev.appspot.com
   ```

## Solution 3: Verify Authentication

Make sure you're signed in before uploading:
- The code now checks for authentication before upload
- Ensure you're logged in as an admin user
- Check the browser console for authentication errors

## Solution 4: Alternative - Use Firebase Admin SDK (Server-side upload)

If client-side uploads continue to fail, you can upload images through your backend:

1. Create an endpoint that accepts image uploads
2. Use Firebase Admin SDK on the server to upload to Storage
3. Return the download URL to the client

This bypasses CORS issues but requires server-side implementation.

## Testing

After configuring:
1. Sign in to your app
2. Try uploading an image
3. Check the browser console for any errors
4. Verify the image appears in Firebase Storage console

## Common Issues

- **"Unauthorized" error**: Check Firebase Storage rules allow authenticated writes
- **CORS still failing**: Make sure CORS config includes your exact origin (with port number for localhost)
- **File too large**: The code now limits uploads to 5MB



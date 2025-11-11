# Firebase Storage Bucket Setup Guide

## The Problem
Your Firebase project's data location is set to a region that doesn't support no-cost Storage buckets. You need to create a Cloud Storage bucket manually.

## Solution: Create a Cloud Storage Bucket

### Option 1: Using Firebase Console (Easiest)

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select your project: `kingsman-saddlery-dev`

2. **Navigate to Storage**
   - Click on **Storage** in the left sidebar
   - If you see the error message, click **Get Started** or **Create bucket**

3. **Create the Bucket**
   - Click **Create bucket** or **Get started**
   - Choose a **location** (select a region close to your users):
     - **Recommended**: `us-central1` (Iowa) - supports free tier
     - **Alternative**: `us-east1` (South Carolina), `europe-west1` (Belgium)
   - **Storage class**: Choose `Standard` (default)
   - **Access control**: Choose **Firebase rules** (recommended)
   - Click **Create**

4. **Update Your Environment Variable**
   - The bucket name will be something like: `kingsman-saddlery-dev.appspot.com` or `kingsman-saddlery-dev.firebasestorage.app`
   - Update your `.env` file:
     ```
     VITE_FIREBASE_STORAGE_BUCKET=kingsman-saddlery-dev.appspot.com
     ```
   - Or if it's the new format:
     ```
     VITE_FIREBASE_STORAGE_BUCKET=kingsman-saddlery-dev.firebasestorage.app
     ```

### Option 2: Using Google Cloud Console

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project: `kingsman-saddlery-dev`

2. **Navigate to Cloud Storage**
   - Click on the hamburger menu (☰) → **Cloud Storage** → **Buckets**
   - Or go directly: https://console.cloud.google.com/storage/browser

3. **Create Bucket**
   - Click **Create bucket**
   - **Name**: `kingsman-saddlery-dev` (or your preferred name)
   - **Location type**: Choose **Region**
   - **Location**: Select a region (e.g., `us-central1`)
   - **Storage class**: `Standard`
   - **Access control**: Choose **Uniform** (for Firebase rules) or **Fine-grained**
   - Click **Create**

4. **Link to Firebase**
   - Go back to Firebase Console → Storage
   - The bucket should appear automatically
   - If not, you may need to enable the Firebase Storage API

### Option 3: Using gcloud CLI

1. **Install Google Cloud SDK** (if not installed)
   - Download from: https://cloud.google.com/sdk/docs/install

2. **Authenticate**
   ```bash
   gcloud auth login
   gcloud config set project kingsman-saddlery-dev
   ```

3. **Create the Bucket**
   ```bash
   gsutil mb -p kingsman-saddlery-dev -c STANDARD -l us-central1 gs://kingsman-saddlery-dev.appspot.com
   ```

4. **Enable Firebase Storage API**
   ```bash
   gcloud services enable firebasestorage.googleapis.com
   ```

## Configure Storage Rules

After creating the bucket, set up security rules:

1. **Go to Firebase Console** → **Storage** → **Rules**
2. **Update rules**:
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /products/{allPaths=**} {
         allow read: if true;
         allow write: if request.auth != null;
       }
       match /owners/{allPaths=**} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```
3. Click **Publish**

## Configure CORS (If Needed)

If you still get CORS errors after creating the bucket:

1. **Create `cors.json`**:
   ```json
   [
     {
       "origin": ["http://localhost:5173", "http://localhost:3000"],
       "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
       "maxAgeSeconds": 3600,
       "responseHeader": ["Content-Type", "Authorization"]
     }
   ]
   ```

2. **Apply CORS**:
   ```bash
   gsutil cors set cors.json gs://kingsman-saddlery-dev.appspot.com
   ```

## Verify Setup

1. **Check your `.env` file** has the correct bucket name:
   ```
   VITE_FIREBASE_STORAGE_BUCKET=kingsman-saddlery-dev.appspot.com
   ```

2. **Restart your dev server**:
   ```bash
   cd client
   npm run dev
   ```

3. **Test upload**:
   - Sign in to your app
   - Try uploading an image
   - Check Firebase Console → Storage to see if the file appears

## Common Bucket Names

- Old format: `project-id.appspot.com`
- New format: `project-id.firebasestorage.app`

Check your Firebase Console → Project Settings → General → Your apps → Storage bucket to see the exact name.

## Troubleshooting

- **"Bucket not found"**: Make sure the bucket name in `.env` matches exactly
- **"Permission denied"**: Check Storage rules allow authenticated writes
- **"CORS error"**: Configure CORS as shown above
- **"Region not supported"**: Choose a supported region like `us-central1`, `us-east1`, or `europe-west1`



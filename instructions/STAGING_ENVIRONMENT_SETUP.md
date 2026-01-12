# Complete Staging Environment Setup Guide - A to Z

This comprehensive guide will walk you through setting up a complete staging environment for testing before production launch. This includes Firebase, email service (Resend), Railway deployment, DNS configuration, and all environment variables.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Part 1: Firebase Staging Project Setup](#part-1-firebase-staging-project-setup)
4. [Part 2: Resend Staging Email Setup](#part-2-resend-staging-email-setup)
5. [Part 3: Railway Staging Deployment](#part-3-railway-staging-deployment)
6. [Part 4: DNS Configuration for Staging](#part-4-dns-configuration-for-staging)
7. [Part 5: Environment Variables Configuration](#part-5-environment-variables-configuration)
8. [Part 6: Testing & Verification](#part-6-testing--verification)
9. [Part 7: Production Preparation Checklist](#part-7-production-preparation-checklist)
10. [Troubleshooting](#troubleshooting)

---

## Overview

**What is Staging?**
- A complete copy of your production environment for testing
- Uses separate Firebase project, email domain, and deployment
- Allows you to test everything without affecting production data
- Perfect for final testing before launch

**What You'll Set Up:**
- ✅ Separate Firebase project (`kingsman-saddlery-staging`)
- ✅ Separate Resend account/domain for staging emails
- ✅ Separate Railway deployment (staging.railway.app)
- ✅ Staging domain (e.g., `staging.kingsmansaddlery.com`)
- ✅ All environment variables configured

---

## Prerequisites

Before starting, make sure you have:

- [ ] GoDaddy account with your domain
- [ ] Firebase account (Google account)
- [ ] Resend account (or create one)
- [ ] Railway account
- [ ] GitHub repository access
- [ ] 2-3 hours of time (DNS propagation can take time)

---

## Part 1: Firebase Staging Project Setup

### Step 1.1: Create New Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `kingsman-saddlery-staging`
   - ⚠️ **Important**: Use a clear name to distinguish from production
4. Click **"Continue"**
5. **Disable Google Analytics** (optional, for staging you don't need it)
   - Or enable it if you want staging analytics
6. Click **"Create project"**
7. Wait for project creation (30-60 seconds)
8. Click **"Continue"** when ready

### Step 1.2: Enable Required Firebase Services

#### Enable Authentication:

1. In Firebase Console, click **"Authentication"** in left sidebar
2. Click **"Get started"** if first time
3. Click **"Sign-in method"** tab
4. Enable **"Email/Password"**:
   - Click on **"Email/Password"**
   - Toggle **"Enable"** to ON
   - Click **"Save"**
5. Enable **"Google"** sign-in:
   - Click on **"Google"**
   - Toggle **"Enable"** to ON
   - Enter support email (your email)
   - Click **"Save"**

#### Enable Firestore Database:

1. Click **"Firestore Database"** in left sidebar
2. Click **"Create database"**
3. Select **"Start in test mode"** (for staging, you can use test mode)
   - ⚠️ **Note**: You'll set up security rules later
4. Choose a location (same as production if possible)
   - Example: `us-central1` or `europe-west1`
5. Click **"Enable"**
6. Wait for database creation (30-60 seconds)

#### Enable Storage:

1. Click **"Storage"** in left sidebar
2. Click **"Get started"**
3. Click **"Next"** (use default security rules for now)
4. Choose storage location (same as Firestore)
5. Click **"Done"**
6. Wait for storage creation (30-60 seconds)

### Step 1.3: Create Web App in Firebase

1. In Firebase Console, click the **gear icon** ⚙️ next to "Project Overview"
2. Click **"Project settings"**
3. Scroll to **"Your apps"** section
4. Click the **Web icon** (`</>`) to add a web app
5. Register app:
   - App nickname: `Kingsman Saddlery Staging`
   - ⚠️ **Don't check** "Also set up Firebase Hosting" (we're using Railway)
6. Click **"Register app"**
7. **Copy the Firebase config** - you'll need these values:
   ```javascript
   apiKey: "AIzaSy..."
   authDomain: "kingsman-saddlery-staging.firebaseapp.com"
   projectId: "kingsman-saddlery-staging"
   appId: "1:123456789:web:abc123..."
   messagingSenderId: "123456789"
   storageBucket: "kingsman-saddlery-staging.appspot.com"
   ```
8. Click **"Continue to console"**

### Step 1.4: Create Service Account for Backend

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Click **"Service accounts"** tab
3. Click **"Generate new private key"**
4. Click **"Generate key"** in the popup
5. **Download the JSON file** - this is your `firebase-service-account.json`
6. **Save it securely** - you'll need it for Railway
7. ⚠️ **Important**: Keep this file secure and never commit it to Git

### Step 1.5: Set Up Firestore Security Rules

1. In Firebase Console, go to **"Firestore Database"**
2. Click **"Rules"** tab
3. **Copy and paste the complete production-ready rules below:**
4. Click **"Publish"**
5. Wait 1-2 minutes for rules to propagate

**Complete Firestore Security Rules (Production-Ready):**

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

**Security Features:**
- ✅ Contact form submissions with full validations
- ✅ Users can only read their own data
- ✅ Orders ownership validation (by customerId or customerEmail)
- ✅ Public read access for products, categories, brands, hero slides, ads
- ✅ All writes blocked from client (backend API only)
- ✅ Helper functions for validation

### Step 1.6: Set Up Storage Security Rules

1. In Firebase Console, go to **"Storage"**
2. Click **"Rules"** tab
3. **Copy and paste the complete production-ready rules below:**
4. Click **"Publish"**

**Complete Storage Security Rules (Production-Ready):**

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
    
    // Allow authenticated users to upload to hero folder (for hero carousel images)
    match /hero/{allPaths=**} {
      allow read: if true; // Anyone can read
      allow write: if request.auth != null; // Only authenticated users can write
    }
    
    // Allow only admins to upload to brands folder
    // Note: Storage rules cannot directly check Firestore roles.
    // Security is enforced through multiple layers:
    // 1. Client-side: checkAdmin() verifies user has ADMIN role in Firestore
    // 2. Backend: requireRole("ADMIN") middleware validates admin role
    // 3. Storage rules: Allow authenticated writes (admin check happens before upload)
    match /brands/{allPaths=**} {
      allow read: if true; // Anyone can read
      allow write: if request.auth != null; // Admin role verified by client and backend
    }
    
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
  }
}
```

**Security Features:**
- ✅ Public read access for all folders
- ✅ Authenticated write access (admin checks happen in client/backend)
- ✅ Organized by folder structure (products, categories, brands, hero, ads, owners)
- ✅ Multi-layer security (client validation + backend validation + storage rules)

**Note:** These are the complete production-ready rules. For more details, see:
- Firestore Rules: `instructions/FIRESTORE_RULES_FINAL.md`
- Storage Rules: `instructions/FIREBASE_STORAGE_SETUP.md`

### Step 1.7: Add Authorized Domains

1. In Firebase Console, go to **"Authentication"**
2. Click **"Settings"** tab
3. Scroll to **"Authorized domains"**
4. Click **"Add domain"**
5. Add your staging domain:
   - `staging.kingsmansaddlery.com` (or your staging domain)
   - `staging.railway.app` (Railway default domain)
6. Click **"Add"**

### Step 1.8: Copy Data from Production (Optional)

If you want to test with production-like data:

1. Go to your **production Firebase project**
2. Export data using Firebase Console or CLI
3. Import into staging project

**Or manually:**
- Use Firebase Console to copy collections
- Or use a migration script

---

## Part 2: Resend Staging Email Setup

### Step 2.1: Create Resend Account (If New)

1. Go to [Resend.com](https://resend.com)
2. Click **"Sign Up"** or **"Get Started"**
3. Sign up with your email
4. Verify your email address
5. Complete onboarding

### Step 2.2: Create Staging API Key

1. In Resend Dashboard, go to **"API Keys"** in left sidebar
2. Click **"Create API Key"**
3. Name it: `Kingsman Saddlery Staging`
4. Select permissions: **"Sending access"** (full access for staging)
5. Click **"Add"**
6. **Copy the API key** (starts with `re_...`)
   - ⚠️ **Important**: Save this securely - you won't see it again!
7. Store it in a secure place (password manager, notes app)

### Step 2.3: Add Staging Domain to Resend

#### Option A: Use a Subdomain (Recommended)

1. In Resend Dashboard, go to **"Domains"**
2. Click **"Add Domain"**
3. Enter your staging subdomain: `staging.kingsmansaddlery.com`
   - ⚠️ **Don't include** `www` or `http://`
   - Just: `staging.kingsmansaddlery.com`
4. Click **"Add"**

#### Option B: Use Separate Domain (Alternative)

If you have a separate domain for staging:
1. Add that domain instead
2. Example: `kingsman-staging.com`

### Step 2.4: Get DNS Records from Resend

After adding your domain, Resend will show you **3 DNS records**:

1. **TXT Record for Domain Verification**
   - Name: `@` (or `staging` if using subdomain)
   - Value: `resend-verification=abc123...` (long string)
   - Purpose: Verifies you own the domain

2. **SPF Record (TXT)**
   - Name: `@` (or `staging`)
   - Value: `v=spf1 include:resend.com ~all`
   - Purpose: Authorizes Resend to send emails

3. **DKIM Record (TXT)**
   - Name: `resend._domainkey` (or `resend._domainkey.staging`)
   - Value: Long DKIM key string
   - Purpose: Email authentication for deliverability

**Copy all three records** - you'll add them to GoDaddy in Part 4.

### Step 2.5: Choose Staging Email Address

Once your domain is verified, you can use:
- `noreply@staging.kingsmansaddlery.com`
- `test@staging.kingsmansaddlery.com`
- `staging@staging.kingsmansaddlery.com`

**Note**: You don't need to create these email addresses - Resend handles sending.

---

## Part 3: Railway Staging Deployment

### Step 3.1: Create Staging Project in Railway

1. Go to [Railway.app](https://railway.app)
2. Log in to your account
3. Click **"New Project"**
4. Name it: `Kingsman Saddlery Staging`
5. Select **"Deploy from GitHub repo"**
6. Choose your repository
7. Click **"Deploy Now"**

### Step 3.2: Create Backend Service (Staging)

1. In your Railway staging project, you'll see one service
2. Click on it (or create new service if needed)
3. Rename it to **"backend-staging"** (optional, for clarity)
4. Go to **"Settings"** tab
5. Set **"Root Directory"** to: `server`
6. Set **"Start Command"** to: `npm start` (or check your package.json)
7. Set **"Build Command"** to: `npm install` (or leave empty if not needed)

### Step 3.3: Create Frontend Service (Staging)

1. In Railway staging project, click **"+ New"**
2. Select **"GitHub Repo"**
3. Choose the same repository
4. Rename to **"frontend-staging"** (optional)
5. Go to **"Settings"** tab
6. Set **"Root Directory"** to: `client`
7. Set **"Start Command"** to: `npm run preview` (for Vite)
8. Set **"Build Command"** to: `npm run build`

### Step 3.4: Configure Railway Build Settings

#### Backend Service:
- **Nixpacks Plan**: Node.js (auto-detected)
- **Node Version**: 18 or 20 (check your package.json)

#### Frontend Service:
- **Nixpacks Plan**: Node.js (auto-detected)
- **Node Version**: 18 or 20

### Step 3.5: Get Railway URLs

1. After deployment, Railway will generate URLs:
   - Backend: `https://backend-staging-production.up.railway.app`
   - Frontend: `https://frontend-staging-production.up.railway.app`
2. **Copy these URLs** - you'll need them for environment variables
3. Note: These are temporary - you'll add custom domain later

---

## Part 4: DNS Configuration for Staging

### Step 4.1: Access GoDaddy DNS Settings

1. Go to [GoDaddy.com](https://www.godaddy.com)
2. Log in to your account
3. Click on your name → **"My Products"**
4. Find your domain (`kingsmansaddlery.com`)
5. Click **"DNS"** (or three dots → **"Manage DNS"**)

### Step 4.2: Add Railway DNS Records for Staging

#### For Frontend (Staging Subdomain):

1. In GoDaddy DNS, scroll to **"Records"** section
2. Click **"Add"** button
3. Configure CNAME record:
   - **Type**: Select **"CNAME"**
   - **Name**: Enter `staging` (for staging.kingsmansaddlery.com)
   - **Value**: Enter your Railway frontend domain
     - Example: `frontend-staging-production.up.railway.app`
   - **TTL**: Leave default (600 seconds)
4. Click **"Save"**

#### For Backend (Optional - if you want custom domain):

If you want `api-staging.kingsmansaddlery.com`:

1. Click **"Add"** again
2. Configure:
   - **Type**: **"CNAME"**
   - **Name**: `api-staging`
   - **Value**: Your Railway backend domain
   - **TTL**: Default
3. Click **"Save"**

### Step 4.3: Add Resend DNS Records for Staging

You need to add **3 TXT records** from Resend (from Step 2.4):

#### Record 1: Domain Verification

1. Click **"Add"** in GoDaddy DNS
2. Configure:
   - **Type**: Select **"TXT"**
   - **Name**: Enter `staging` (for staging subdomain)
     - ⚠️ **Important**: If Resend shows `@`, use `staging` instead
   - **Value**: Paste the domain verification string from Resend
   - **TTL**: Default
3. Click **"Save"**

#### Record 2: SPF Record

1. Click **"Add"**
2. Configure:
   - **Type**: **"TXT"**
   - **Name**: `staging`
   - **Value**: `v=spf1 include:resend.com ~all`
   - **TTL**: Default
3. Click **"Save"**

#### Record 3: DKIM Record

1. Click **"Add"**
2. Configure:
   - **Type**: **"TXT"**
   - **Name**: `resend._domainkey.staging` (or exactly as Resend shows)
     - ⚠️ **Important**: Match exactly what Resend provides
   - **Value**: Paste the DKIM key from Resend
   - **TTL**: Default
3. Click **"Save"**

### Step 4.4: Wait for DNS Propagation

- DNS changes take **15 minutes to 48 hours**
- Usually takes **30-60 minutes**
- You can check status:
  - Railway Dashboard → Domains (for Railway)
  - Resend Dashboard → Domains (for Resend)
  - Use [whatsmydns.net](https://www.whatsmydns.net) to check globally

### Step 4.5: Add Custom Domain in Railway

#### For Frontend:

1. Go to Railway Dashboard → Your staging project
2. Click on **frontend-staging** service
3. Go to **"Settings"** tab
4. Scroll to **"Domains"** section
5. Click **"Add Domain"**
6. Enter: `staging.kingsmansaddlery.com`
7. Railway will verify DNS
8. Wait for status to show **"Active"** ✅

#### For Backend (Optional):

1. Click on **backend-staging** service
2. Go to **"Settings"** → **"Domains"**
3. Click **"Add Domain"**
4. Enter: `api-staging.kingsmansaddlery.com` (if you set up DNS)
5. Wait for verification

---

## Part 5: Environment Variables Configuration

### Step 5.1: Backend Environment Variables (Railway)

Go to Railway → Your staging project → **backend-staging** → **"Variables"** tab

#### Firebase Configuration:

Add these variables (from Step 1.3 and 1.4):

```env
# Firebase Service Account (from Step 1.4)
FIREBASE_PROJECT_ID=kingsman-saddlery-staging
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@kingsman-saddlery-staging.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDWyryiQryKwXgf\n...\n-----END PRIVATE KEY-----\n
```

**How to get these values:**
1. Open the `firebase-service-account.json` file you downloaded in Step 1.4
2. `FIREBASE_PROJECT_ID` = value of `project_id`
3. `FIREBASE_CLIENT_EMAIL` = value of `client_email`
4. `FIREBASE_PRIVATE_KEY` = entire value of `private_key` (keep all `\n` characters)

#### Email Configuration (Resend):

```env
# Resend API (from Step 2.2)
RESEND_API_KEY=re_your_staging_api_key_here
RESEND_FROM_EMAIL=noreply@staging.kingsmansaddlery.com
RESEND_REPLY_TO=moh12asad10@gmail.com
```

**Replace:**
- `re_your_staging_api_key_here` with your staging API key from Step 2.2
- `staging.kingsmansaddlery.com` with your actual staging domain
- `moh12asad10@gmail.com` with your email (for receiving replies)

#### Server Configuration:

```env
# Server
PORT=5000
NODE_ENV=staging
ALLOWED_ORIGINS=https://staging.kingsmansaddlery.com,https://frontend-staging-production.up.railway.app
```

**Note**: Add both your custom domain and Railway domain to ALLOWED_ORIGINS

### Step 5.2: Frontend Environment Variables (Railway)

Go to Railway → Your staging project → **frontend-staging** → **"Variables"** tab

#### Firebase Configuration (from Step 1.3):

```env
# Firebase Web App Config
VITE_FIREBASE_API_KEY=AIzaSyApFMY1z4dAIXzG...
VITE_FIREBASE_AUTH_DOMAIN=kingsman-saddlery-staging.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=kingsman-saddlery-staging
VITE_FIREBASE_APP_ID=1:123456789:web:abc123...
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_STORAGE_BUCKET=kingsman-saddlery-staging.appspot.com
```

**Get these from:**
- Firebase Console → Project Settings → General → Your apps → Web app config

#### API Configuration:

```env
# Backend API URL
VITE_API_BASE_URL=https://api-staging.kingsmansaddlery.com
```

**Or if you didn't set up custom backend domain:**
```env
VITE_API_BASE_URL=https://backend-staging-production.up.railway.app
```

#### Admin Configuration:

```env
# Admin emails (comma-separated)
VITE_ADMIN_EMAILS=moh12asad10@gmail.com
```

### Step 5.3: Verify All Variables Are Set

**Backend Checklist:**
- [ ] `FIREBASE_PROJECT_ID`
- [ ] `FIREBASE_CLIENT_EMAIL`
- [ ] `FIREBASE_PRIVATE_KEY`
- [ ] `RESEND_API_KEY`
- [ ] `RESEND_FROM_EMAIL`
- [ ] `RESEND_REPLY_TO`
- [ ] `PORT`
- [ ] `NODE_ENV`
- [ ] `ALLOWED_ORIGINS`

**Frontend Checklist:**
- [ ] `VITE_FIREBASE_API_KEY`
- [ ] `VITE_FIREBASE_AUTH_DOMAIN`
- [ ] `VITE_FIREBASE_PROJECT_ID`
- [ ] `VITE_FIREBASE_APP_ID`
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `VITE_FIREBASE_STORAGE_BUCKET`
- [ ] `VITE_API_BASE_URL`
- [ ] `VITE_ADMIN_EMAILS`

### Step 5.4: Redeploy Services

After adding all environment variables:

1. Railway will automatically redeploy
2. Or manually trigger: Go to service → **"Deployments"** → **"Redeploy"**
3. Wait for deployment to complete
4. Check logs for any errors

---

## Part 6: Testing & Verification

### Step 6.1: Test Firebase Connection

1. Visit your staging backend URL:
   ```
   https://api-staging.kingsmansaddlery.com/api/test-firestore
   ```
   Or Railway URL:
   ```
   https://backend-staging-production.up.railway.app/api/test-firestore
   ```

2. You should see:
   ```json
   {
     "ok": true,
     "message": "Service account can access Firestore",
     "serviceAccountEmail": "firebase-adminsdk-...@kingsman-saddlery-staging.iam.gserviceaccount.com"
   }
   ```

3. If you see an error, check:
   - Firebase environment variables are correct
   - Service account has proper IAM permissions (see Step 1.4)

### Step 6.2: Test Email Service

1. Visit your staging backend:
   ```
   https://api-staging.kingsmansaddlery.com/api/email/test-smtp
   ```

2. You should see:
   ```json
   {
     "ok": true,
     "service": "Resend",
     "config": {
       "fromEmail": "noreply@staging.kingsmansaddlery.com",
       "replyToEmail": "moh12asad10@gmail.com"
     }
   }
   ```

3. If you see an error:
   - Check Resend domain is verified (Resend Dashboard → Domains)
   - Verify `RESEND_API_KEY` is correct
   - Check `RESEND_FROM_EMAIL` matches verified domain

### Step 6.3: Test Frontend Access

1. Visit your staging frontend:
   ```
   https://staging.kingsmansaddlery.com
   ```

2. Verify:
   - [ ] Page loads without errors
   - [ ] Products load (if you have data)
   - [ ] No console errors
   - [ ] Firebase connection works

### Step 6.4: Test Authentication

1. Go to staging frontend
2. Click **"Sign In"**
3. Try **Google Sign-In**:
   - Should redirect to Google
   - After sign-in, should redirect back
   - Should see your profile

4. If it fails:
   - Check Firebase Authorized Domains (Step 1.7)
   - Verify `VITE_FIREBASE_*` variables are correct
   - Check browser console for errors

### Step 6.5: Test Order Email

1. In staging frontend, place a test order
2. Complete checkout (use test payment if available)
3. Check your email inbox
4. Verify:
   - [ ] Email is received
   - [ ] Email is from `noreply@staging.kingsmansaddlery.com`
   - [ ] Email content is correct
   - [ ] Logo displays correctly

### Step 6.6: Test Admin Panel

1. Sign in with admin email (from `VITE_ADMIN_EMAILS`)
2. Go to `/admin` route
3. Verify:
   - [ ] Admin panel loads
   - [ ] You can access admin features
   - [ ] No unauthorized access errors

### Step 6.7: Test File Uploads

1. In admin panel, try uploading a product image
2. Verify:
   - [ ] Upload succeeds
   - [ ] Image appears in Firebase Storage
   - [ ] Image displays in frontend

---

## Part 7: Production Preparation Checklist

Before launching production, verify staging works perfectly:

### Firebase Checklist:
- [ ] Staging Firebase project is separate from production
- [ ] All services enabled (Auth, Firestore, Storage)
- [ ] Security rules are appropriate
- [ ] Authorized domains include staging domain
- [ ] Service account has proper permissions

### Email Checklist:
- [ ] Resend staging domain is verified
- [ ] Test emails are sending successfully
- [ ] Email templates look correct
- [ ] Reply-to address is correct

### Railway Checklist:
- [ ] Both services (frontend & backend) are deployed
- [ ] Custom domains are active
- [ ] All environment variables are set
- [ ] Deployments are successful
- [ ] No errors in logs

### DNS Checklist:
- [ ] Staging subdomain points to Railway
- [ ] Resend DNS records are added
- [ ] DNS propagation is complete
- [ ] Domains are verified in Railway and Resend

### Testing Checklist:
- [ ] Frontend loads correctly
- [ ] Authentication works
- [ ] Products display correctly
- [ ] Cart functionality works
- [ ] Checkout process works
- [ ] Order emails are sent
- [ ] Admin panel is accessible
- [ ] File uploads work

### Documentation Checklist:
- [ ] All credentials are saved securely
- [ ] Environment variables are documented
- [ ] DNS records are documented
- [ ] URLs are saved

---

## Troubleshooting

### Problem: Firebase Connection Fails

**Symptoms:**
- `api/test-firestore` returns error
- "UNAUTHENTICATED" error

**Solutions:**
1. Verify `FIREBASE_PROJECT_ID` matches your staging project
2. Check `FIREBASE_PRIVATE_KEY` has proper `\n` characters
3. Grant IAM permissions:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Select your staging Firebase project
   - Go to **IAM & Admin** → **IAM**
   - Find your service account email
   - Add role: **"Firebase Admin SDK Administrator Service Agent"**

### Problem: Email Not Sending

**Symptoms:**
- Test endpoint shows error
- Orders don't send emails

**Solutions:**
1. Check Resend domain verification:
   - Go to Resend Dashboard → Domains
   - Verify status is **"Verified"** ✅
2. Verify DNS records:
   - Use [MXToolbox](https://mxtoolbox.com) to check TXT records
   - Ensure all 3 records are present
3. Check `RESEND_API_KEY` is correct
4. Verify `RESEND_FROM_EMAIL` matches verified domain

### Problem: Frontend Can't Connect to Backend

**Symptoms:**
- API calls fail
- CORS errors in console

**Solutions:**
1. Check `VITE_API_BASE_URL` is correct
2. Verify `ALLOWED_ORIGINS` includes frontend URL
3. Check Railway logs for CORS errors
4. Ensure backend is deployed and running

### Problem: Authentication Fails

**Symptoms:**
- Google sign-in doesn't work
- Redirect errors

**Solutions:**
1. Check Firebase Authorized Domains:
   - Firebase Console → Authentication → Settings
   - Ensure staging domain is added
2. Verify `VITE_FIREBASE_*` variables are correct
3. Check browser console for specific errors
4. Ensure OAuth consent screen is configured in Google Cloud

### Problem: DNS Not Propagating

**Symptoms:**
- Domain doesn't resolve
- Railway/Resend shows "Pending"

**Solutions:**
1. Wait longer (can take up to 48 hours)
2. Check DNS records are correct:
   - Use [whatsmydns.net](https://www.whatsmydns.net)
   - Verify records match exactly
3. Clear DNS cache:
   - Windows: `ipconfig /flushdns`
   - Mac: `sudo dscacheutil -flushcache`
4. Try different DNS server (Google: 8.8.8.8)

### Problem: Railway Deployment Fails

**Symptoms:**
- Build errors
- Service won't start

**Solutions:**
1. Check Railway logs:
   - Go to service → **"Deployments"** → Click on failed deployment
2. Verify Root Directory is correct:
   - Backend: `server`
   - Frontend: `client`
3. Check build commands:
   - Backend: Usually just `npm install`
   - Frontend: `npm run build`
4. Verify Node version matches package.json
5. Check for missing dependencies

---

## Quick Reference: All URLs & Credentials

### Staging URLs:
- **Frontend**: `https://staging.kingsmansaddlery.com`
- **Backend**: `https://api-staging.kingsmansaddlery.com`
- **Railway Frontend**: `https://frontend-staging-production.up.railway.app`
- **Railway Backend**: `https://backend-staging-production.up.railway.app`

### Firebase:
- **Project ID**: `kingsman-saddlery-staging`
- **Console**: `https://console.firebase.google.com/project/kingsman-saddlery-staging`

### Resend:
- **Dashboard**: `https://resend.com/domains`
- **Staging Domain**: `staging.kingsmansaddlery.com`
- **From Email**: `noreply@staging.kingsmansaddlery.com`

### Railway:
- **Dashboard**: `https://railway.app/project/[your-project-id]`
- **Project Name**: `Kingsman Saddlery Staging`

---

## Next Steps After Staging Setup

1. ✅ **Test Everything**: Run through all features in staging
2. ✅ **Fix Any Issues**: Resolve bugs found in staging
3. ✅ **Document Differences**: Note any differences from production
4. ✅ **Prepare Production**: Use this guide as template for production setup
5. ✅ **Launch Production**: Follow same steps for production environment

---

## Support Resources

- **Firebase Docs**: [https://firebase.google.com/docs](https://firebase.google.com/docs)
- **Resend Docs**: [https://resend.com/docs](https://resend.com/docs)
- **Railway Docs**: [https://docs.railway.app](https://docs.railway.app)
- **GoDaddy DNS Help**: [https://www.godaddy.com/help](https://www.godaddy.com/help)
- **DNS Checker**: [https://mxtoolbox.com](https://mxtoolbox.com)

---

**Last Updated**: 2024
**Version**: 1.0
**Status**: Complete A-to-Z Guide

---

## 🎯 Summary

You've now set up a complete staging environment with:
- ✅ Separate Firebase project
- ✅ Separate Resend email domain
- ✅ Separate Railway deployment
- ✅ Custom staging domain
- ✅ All environment variables configured
- ✅ Full testing capabilities

**You're ready to test everything before production launch!** 🚀


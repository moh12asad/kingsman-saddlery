# Deployment Guide for Kingsman Saddlery

This guide covers multiple hosting options for your full-stack application.

## Project Structure
- **Frontend**: React + Vite (in `client/` folder)
- **Backend**: Express.js API (in `server/` folder)
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Auth**: Firebase Authentication

---

## 🚀 Recommended Option: Railway (Easiest Full-Stack)

Railway can host both your frontend and backend as separate services in the same project. This guide covers the complete setup process.

### Prerequisites
1. Create a [Railway account](https://railway.app) (free tier available)
2. Have your Firebase project credentials ready
3. Have your `firebase-service-account.json` file available (you'll extract values from it)

---

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"** (recommended) or **"Empty Project"**
4. If using GitHub, select your repository

---

### Step 2: Deploy Backend Service

#### 2.1 Create Backend Service

1. In your Railway project, you'll see one service (or click **"+ New"** → **"GitHub Repo"**)
2. If using GitHub, select the same repository
3. Rename the service to **"backend"** or **"server"** (optional, for clarity)

#### 2.2 Configure Root Directory

**This is critical for monorepo setups!**

1. Click on your backend service
2. Go to **Settings** tab
3. Scroll to **"Root Directory"**
4. Set it to: `server`
5. This tells Railway to treat the `server/` folder as the working directory

#### 2.3 Set Backend Environment Variables

Go to **Variables** tab and add these:

**Basic Variables:**
```
PORT=5000
NODE_ENV=production
```

**Firebase Service Account Variables:**

Instead of uploading the JSON file, set these three environment variables (extract from your `server/firebase-service-account.json`):

1. **FIREBASE_PROJECT_ID**
   - Value: Your project ID (e.g., `kingsman-saddlery-dev`)
   - From JSON: `project_id` field

2. **FIREBASE_CLIENT_EMAIL**
   - Value: Service account email (e.g., `firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com`)
   - From JSON: `client_email` field

3. **FIREBASE_PRIVATE_KEY**
   - Value: The entire private key from JSON file
   - From JSON: `private_key` field (line 5)
   - **Important:** Copy the entire value including:
     - `-----BEGIN PRIVATE KEY-----`
     - All the encoded characters
     - `-----END PRIVATE KEY-----`
     - Keep all `\n` characters as-is (they represent newlines)
   - Example format: `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDWyryiQryKwXgf\n...\n-----END PRIVATE KEY-----\n`

#### 2.4 Deploy Backend

- Railway will auto-detect Node.js and use your `server/railway.json` config
- Or manually trigger deployment from the **Deployments** tab
- Wait for deployment to complete

#### 2.5 Get Backend URL

1. Go to **Settings** → **Generate Domain** (or use the existing domain)
2. Copy the URL (e.g., `https://server-dev-xxxxx.up.railway.app`)
3. **Save this URL** - you'll need it for the frontend

#### 2.6 Grant Firebase IAM Permissions

**Critical step!** The service account needs Firestore permissions:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project (e.g., `kingsman-saddlery-dev`)
3. Navigate to **IAM & Admin** → **IAM**
4. Find your service account (the `client_email` from step 2.3)
5. Click the **pencil icon** (Edit)
6. Click **"+ ADD ANOTHER ROLE"**
7. Add role: **"Firebase Admin SDK Administrator Service Agent"**
8. Click **"SAVE"**
9. Wait 1-2 minutes for permissions to propagate

**Verify it worked:**
- Test: `https://your-backend-url.up.railway.app/api/test-firestore`
- Should return: `{"ok": true, "message": "Service account can access Firestore"}`

---

### Step 3: Deploy Frontend Service

#### 3.1 Create Frontend Service

1. In the same Railway project, click **"+ New"**
2. Select **"GitHub Repo"** (or **"Empty Service"**)
3. Select the same repository
4. Rename the service to **"frontend"** or **"client"** (optional)

#### 3.2 Configure Root Directory

1. Click on your frontend service
2. Go to **Settings** tab
3. Scroll to **"Root Directory"**
4. Set it to: `client`
5. This tells Railway to treat the `client/` folder as the working directory

#### 3.3 Set Frontend Environment Variables

Go to **Variables** tab and add:

```
VITE_API_BASE_URL=https://your-backend-url.up.railway.app
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

**Important Notes:**
- Replace `https://your-backend-url.up.railway.app` with your actual backend URL from Step 2.5
- **No trailing slash** on `VITE_API_BASE_URL`
- All Firebase values should match between frontend and backend (especially `VITE_FIREBASE_PROJECT_ID` must match `FIREBASE_PROJECT_ID`)
- Get Firebase values from: Firebase Console → Project Settings → General → Your apps

#### 3.4 Configure Vite for Railway

The `client/vite.config.js` should already have the preview configuration, but verify it includes:

```javascript
preview: {
  host: true,
  port: 5174,
  allowedHosts: true,  // Allows Railway's dynamic domains
}
```

#### 3.5 Deploy Frontend

- Railway will use your `client/railway.json` which:
  - Builds with: `npm install && npm run build`
  - Starts with: `npm start` (uses Express server for SPA routing)
- **Important**: The Express server (`client/server.js`) handles SPA routing, ensuring external redirects (like from Tranzila payment gateway) work correctly
- Wait for deployment to complete

#### 3.6 Get Frontend URL

1. Go to **Settings** → **Generate Domain**
2. Copy the URL (e.g., `https://client-dev-xxxxx.up.railway.app`)

#### 3.7 Add Frontend Domain to Firebase Authorized Domains

**Critical for authentication to work!**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Click **"Add domain"**
5. Add your Railway frontend domain (e.g., `client-dev-xxxxx.up.railway.app`)
6. Click **"Add"**

**Note:** If Railway generates a new domain after redeployment, add it again.

---

### Step 4: Verify Deployment

#### Test Backend:
- Health: `https://your-backend-url.up.railway.app/api/health`
- Products: `https://your-backend-url.up.railway.app/api/products`
- Firestore test: `https://your-backend-url.up.railway.app/api/test-firestore`

#### Test Frontend:
- Open your frontend URL in a browser
- Try signing in with Google
- Verify products load correctly

---

### Railway Project Structure

Your Railway project should look like this:

```
Railway Project: kingsman-saddlery
│
├── Service 1: "backend"
│   ├── Root Directory: server
│   ├── Environment Variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, PORT, NODE_ENV
│   ├── URL: https://server-xxxxx.up.railway.app
│   └── Uses: server/railway.json
│
└── Service 2: "frontend"
    ├── Root Directory: client
    ├── Environment Variables: VITE_API_BASE_URL, VITE_FIREBASE_*
    ├── URL: https://client-xxxxx.up.railway.app
    └── Uses: client/railway.json
```

---

### Common Issues & Troubleshooting

#### Issue: "Blocked request. This host is not allowed"
**Solution:** Add `allowedHosts: true` in `client/vite.config.js` preview section (already done)

#### Issue: "Service account lacks Firestore permissions"
**Solution:** 
1. Grant "Firebase Admin SDK Administrator Service Agent" role in Google Cloud Console IAM
2. Wait 1-2 minutes for propagation
3. Redeploy backend service

#### Issue: "Firebase ID token has incorrect 'aud' (audience) claim"
**Solution:** 
1. Ensure `FIREBASE_PROJECT_ID` (backend) matches `VITE_FIREBASE_PROJECT_ID` (frontend)
2. Both should be exactly: `kingsman-saddlery-dev` (or your project ID)
3. Redeploy both services after fixing

#### Issue: "Failed to parse private key"
**Solution:**
1. Copy the entire `private_key` value from JSON (including BEGIN/END markers)
2. Keep all `\n` characters as-is (don't convert to actual newlines)
3. Paste as one continuous line in Railway

#### Issue: Products not loading / API errors
**Solution:**
1. Verify `VITE_API_BASE_URL` is set correctly (no trailing slash)
2. Check backend is running: test `/api/health` endpoint
3. Check browser console for specific errors
4. Verify CORS is working (server already has `cors({ origin: true })`)

#### Issue: "Unauthorized domain" for Firebase Auth
**Solution:**
1. Add your Railway frontend domain to Firebase Console → Authentication → Settings → Authorized domains
2. If Railway generates a new domain, add it again

---

### Quick Checklist

**Backend:**
- [ ] Service created with Root Directory = `server`
- [ ] Environment variables set: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `PORT`, `NODE_ENV`
- [ ] Backend deployed and URL obtained
- [ ] IAM permissions granted in Google Cloud Console
- [ ] Test endpoint works: `/api/test-firestore`

**Frontend:**
- [ ] Service created with Root Directory = `client`
- [ ] Environment variables set: `VITE_API_BASE_URL` (pointing to backend), all `VITE_FIREBASE_*` variables
- [ ] `VITE_FIREBASE_PROJECT_ID` matches backend's `FIREBASE_PROJECT_ID`
- [ ] Frontend deployed and URL obtained
- [ ] Domain added to Firebase Authorized domains
- [ ] `vite.config.js` has `allowedHosts: true` in preview section

**Both:**
- [ ] Both services in the same Railway project
- [ ] Both using the same GitHub repository
- [ ] Both have correct Root Directory settings
- [ ] Project IDs match between frontend and backend

---

## 🌐 Option 2: Render (Free Tier Available)

### Backend on Render

1. Create a [Render account](https://render.com)
2. New → Web Service
3. Connect your GitHub repo
4. Settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Add environment variables:
   - `PORT=5000`
   - `NODE_ENV=production`
   - Upload `firebase-service-account.json` or set as env var
6. Deploy - Render will give you a URL like `https://your-app.onrender.com`

### Frontend on Render

1. New → Static Site
2. Connect your GitHub repo
3. Settings:
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add environment variables (same as Railway frontend)
5. Deploy

---

## ⚡ Option 3: Vercel (Frontend) + Railway/Render (Backend)

### Frontend on Vercel (Recommended for React apps)

1. Create a [Vercel account](https://vercel.com)
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add environment variables (same as above)
5. Deploy

Vercel provides:
- Automatic HTTPS
- Global CDN
- Free custom domains
- Automatic deployments on git push

### Backend
Deploy backend to Railway or Render (see options above).

---

## 🔥 Option 4: Firebase Hosting (Frontend)

Since you're already using Firebase, you can host the frontend there too.

### Setup

1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login:**
   ```bash
   firebase login
   ```

3. **Initialize Firebase Hosting:**
   ```bash
   cd client
   firebase init hosting
   ```
   - Select your Firebase project
   - Public directory: `dist`
   - Single-page app: Yes
   - Set up automatic builds: No (or Yes if using GitHub Actions)

4. **Build and deploy:**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

5. **Set environment variables:**
   - Firebase Hosting doesn't support runtime env vars
   - You'll need to use Firebase Functions or build-time replacement
   - Or use a `.env.production` file that gets bundled

### Backend
Deploy backend to Railway or Render.

---

## 📝 Environment Variables Setup

### Backend Environment Variables (Railway)

**Required for Railway deployment:**

```env
PORT=5000
NODE_ENV=production
FIREBASE_PROJECT_ID=kingsman-saddlery-dev
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@kingsman-saddlery-dev.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDWyryiQryKwXgf\n...\n-----END PRIVATE KEY-----\n
```

**How to get Firebase values:**
1. Open `server/firebase-service-account.json`
2. `FIREBASE_PROJECT_ID` = value of `project_id` field
3. `FIREBASE_CLIENT_EMAIL` = value of `client_email` field
4. `FIREBASE_PRIVATE_KEY` = entire value of `private_key` field (line 5, keep all `\n` characters)

**Note:** For local development, you can use the JSON file directly. For Railway, use environment variables.

### Frontend Environment Variables (Railway)

**Required for Railway deployment:**

```env
VITE_API_BASE_URL=https://your-backend-url.up.railway.app
VITE_FIREBASE_API_KEY=AIzaSyApFMY1z4dAIXzG...
VITE_FIREBASE_AUTH_DOMAIN=kingsman-saddlery-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=kingsman-saddlery-dev
VITE_FIREBASE_APP_ID=1:642994104577:web:0a15b4fb123c22c73f1300
VITE_FIREBASE_MESSAGING_SENDER_ID=642994104577
VITE_FIREBASE_STORAGE_BUCKET=kingsman-saddlery-dev.firebasestorage.app
```

**How to get Firebase values:**
1. Go to Firebase Console → Project Settings → General
2. Scroll to "Your apps" section
3. Copy values from the web app config
4. Or use the Firebase config object from your project

**Important:**
- `VITE_API_BASE_URL` must match your backend Railway URL (no trailing slash)
- `VITE_FIREBASE_PROJECT_ID` must exactly match `FIREBASE_PROJECT_ID` in backend
- All values are case-sensitive

---

## 🔧 Pre-Deployment Checklist

### Before Deploying to Railway

**Code Preparation:**
- [ ] Update all hardcoded `localhost` URLs to use `VITE_API_BASE_URL`
- [ ] Verify `client/vite.config.js` has `allowedHosts: true` in preview section
- [ ] Test the build locally: `npm run build` in client folder
- [ ] Test the server locally: `npm start` in server folder
- [ ] Ensure `server/railway.json` and `client/railway.json` exist

**Firebase Setup:**
- [ ] Have `server/firebase-service-account.json` file ready
- [ ] Note your Firebase project ID (must match in both frontend and backend)
- [ ] Get all Firebase config values from Firebase Console

**Railway Setup:**
- [ ] Create Railway account
- [ ] Create new project
- [ ] Have GitHub repository ready (or use Railway CLI)

**Post-Deployment:**
- [ ] Set all environment variables in Railway (see Step 2.3 and 3.3)
- [ ] Grant IAM permissions in Google Cloud Console (see Step 2.6)
- [ ] Add frontend domain to Firebase Authorized domains (see Step 3.7)
- [ ] Verify backend test endpoint works: `/api/test-firestore`
- [ ] Verify frontend can load products
- [ ] Test authentication (Google sign-in)

---

## 🎯 My Recommendation

**For easiest setup:** Use **Railway** for both frontend and backend
- One platform for everything
- Easy environment variable management
- Free tier available
- Automatic deployments

**For best performance:** Use **Vercel** (frontend) + **Railway** (backend)
- Vercel's CDN is excellent for React apps
- Railway is simple for Node.js backends
- Both have great free tiers

---

## 🆘 Troubleshooting

### CORS Issues
Your server already has `cors({ origin: true })` which should work, but if you have issues:
- Update CORS to allow your specific frontend domain
- Check that your frontend is using the correct API URL

### Environment Variables Not Working
- Make sure Vite variables start with `VITE_`
- Rebuild after changing env vars (Railway auto-rebuilds on variable changes)
- Check that variables are set in your hosting platform
- For Railway: Variables are case-sensitive, ensure exact spelling
- Verify `VITE_API_BASE_URL` has no trailing slash

### Firebase Service Account Issues

#### "Service account lacks Firestore permissions"
1. Go to [Google Cloud Console IAM](https://console.cloud.google.com/iam-admin/iam)
2. Find your service account (from `FIREBASE_CLIENT_EMAIL`)
3. Add role: **"Firebase Admin SDK Administrator Service Agent"**
4. Wait 1-2 minutes for propagation
5. Redeploy backend service

#### "Failed to parse private key"
- Copy entire `private_key` from JSON (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)
- Keep all `\n` characters as literal `\n` (don't convert to newlines)
- Paste as one continuous line in Railway
- Verify no extra spaces or quotes around the value

#### "Firebase ID token has incorrect 'aud' (audience) claim"
- **Root cause:** Project ID mismatch between frontend and backend
- **Fix:** Ensure `FIREBASE_PROJECT_ID` (backend) exactly matches `VITE_FIREBASE_PROJECT_ID` (frontend)
- Both should be: `kingsman-saddlery-dev` (or your exact project ID)
- Redeploy both services after fixing

#### "Unauthorized domain" for Firebase Authentication
- Go to Firebase Console → Authentication → Settings → Authorized domains
- Add your Railway frontend domain (e.g., `client-dev-xxxxx.up.railway.app`)
- If Railway generates a new domain after redeployment, add it again

### Railway-Specific Issues

#### "Cannot find package.json"
- Verify **Root Directory** is set correctly:
  - Backend: `server`
  - Frontend: `client`
- Check in Settings → Root Directory

#### "Blocked request. This host is not allowed" (Vite)
- Ensure `client/vite.config.js` has:
  ```javascript
  preview: {
    host: true,
    port: 5174,
    allowedHosts: true,
  }
  ```
- Redeploy frontend after updating config

#### Products API returns HTML instead of JSON
- Verify `VITE_API_BASE_URL` is set correctly
- Check it points to your backend URL (no trailing slash)
- Test backend directly: `https://your-backend-url.up.railway.app/api/products`
- Should return JSON, not HTML

---

## 📚 Additional Resources

- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)



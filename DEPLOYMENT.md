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

Railway can host both your frontend and backend in one place.

### Prerequisites
1. Create a [Railway account](https://railway.app) (free tier available)
2. Install Railway CLI: `npm i -g @railway/cli`
3. Or use the Railway web dashboard

### Backend Deployment (Server)

1. **Initialize Railway project:**
   ```bash
   cd server
   railway login
   railway init
   ```

2. **Set Environment Variables in Railway Dashboard:**
   - Go to your project → Variables tab
   - Add these variables:
     ```
     PORT=5000
     NODE_ENV=production
     ```
   - Upload your `firebase-service-account.json` file or set it as an environment variable
   - Add any other environment variables your server needs

3. **Deploy:**
   ```bash
   railway up
   ```
   Or connect your GitHub repo and Railway will auto-deploy on push.

4. **Get your backend URL:**
   - Railway will give you a URL like: `https://your-app-name.up.railway.app`
   - Copy this URL - you'll need it for the frontend

### Frontend Deployment (Client)

1. **Create a new Railway service for the frontend:**
   ```bash
   cd client
   railway init
   ```

2. **Set Environment Variables:**
   ```
   VITE_API_BASE_URL=https://your-backend-url.up.railway.app
   VITE_FIREBASE_API_KEY=your-firebase-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_APP_ID=your-app-id
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   ```

3. **Create `railway.json` in client folder:**
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS",
       "buildCommand": "npm install && npm run build"
     },
     "deploy": {
       "startCommand": "npm run preview",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

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

### Backend (.env in server/)
```env
PORT=5000
NODE_ENV=production
# Firebase Admin SDK credentials (or use service account JSON file)
```

### Frontend (.env.production in client/)
```env
VITE_API_BASE_URL=https://your-backend-url.com
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

---

## 🔧 Pre-Deployment Checklist

- [ ] Update all hardcoded `localhost` URLs to use `VITE_API_BASE_URL`
- [ ] Set up environment variables in your hosting platform
- [ ] Ensure Firebase service account has proper permissions
- [ ] Test the build locally: `npm run build` in client folder
- [ ] Test the server locally: `npm start` in server folder
- [ ] Update CORS settings if needed (your server already allows all origins)
- [ ] Add your production domain to Firebase authorized domains

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
- Rebuild after changing env vars
- Check that variables are set in your hosting platform

### Firebase Service Account Issues
- Ensure the service account JSON is uploaded or set as environment variable
- Check IAM permissions in Google Cloud Console
- Verify the service account email has "Firebase Admin SDK Administrator Service Agent" role

---

## 📚 Additional Resources

- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)



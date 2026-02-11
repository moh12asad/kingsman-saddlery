# Tranzila Payment - SPA Routing Fix for Railway

## Problem

When Tranzila redirects to `/payment/success` or `/payment/failed` after payment, you get a 404 error:
```
This page can't be found
No webpage was found for the web address: https://your-domain.up.railway.app/payment/failed
HTTP ERROR 404
```

However, when you manually navigate to these URLs, they work fine.

## Root Cause

Vite's preview server (`vite preview`) doesn't properly handle SPA (Single Page Application) routing for direct HTTP requests from external services. When Tranzila redirects, it makes a direct HTTP request to the server, and the server doesn't know to serve `index.html` for these routes.

## Solution

The application now uses an Express server that properly handles SPA routing by serving `index.html` for all routes, allowing React Router to handle routing on the client side.

## Files Created/Modified

### 1. `client/server.js` (NEW)
- Express server that serves static files and handles SPA routing
- Serves `index.html` for all routes (SPA fallback)

### 2. `client/package.json` (MODIFIED)
- Added `express` dependency
- Added `"start": "node server.js"` script

### 3. `client/railway.json` (MODIFIED)
- Changed `startCommand` from `npm run preview` to `npm start`

## What You Need to Do

### Step 1: Install Express Dependency

If you haven't already, install Express:

```bash
cd client
npm install express
```

Or verify it's in your `package.json`:
```json
{
  "dependencies": {
    "express": "^4.18.2",
    ...
  }
}
```

### Step 2: Verify Files Exist

Ensure these files exist and are correct:

1. **`client/server.js`** - Should exist and contain the Express server code
2. **`client/package.json`** - Should have `express` in dependencies and `"start": "node server.js"` in scripts
3. **`client/railway.json`** - Should have `"startCommand": "npm start"`

### Step 3: Commit and Push Changes

```bash
git add client/server.js client/package.json client/railway.json
git commit -m "Add Express server for SPA routing to fix Tranzila redirect 404 errors"
git push
```

### Step 4: Redeploy on Railway

1. Go to your Railway project dashboard
2. Find your frontend service
3. Railway will automatically detect the changes and redeploy
4. Wait for deployment to complete

### Step 5: Test the Fix

1. Go through a test payment flow
2. Complete or cancel a payment in Tranzila
3. Verify that you're redirected to `/payment/success` or `/payment/failed` without a 404 error

## How It Works

### Before (Vite Preview)
```
Tranzila redirects → Server receives /payment/failed → 404 (file not found)
```

### After (Express Server)
```
Tranzila redirects → Server receives /payment/failed → Serves index.html → React Router handles /payment/failed → PaymentFailed component renders
```

## Verification

After deployment, you can verify the server is working:

1. **Check Railway logs**: You should see "Server running on http://0.0.0.0:PORT"
2. **Test direct URL**: Navigate directly to `https://your-domain.up.railway.app/payment/failed` - should work
3. **Test redirect**: Complete a payment and verify redirect works

## Troubleshooting

### Still Getting 404 Errors

1. **Check Railway logs**: Ensure the Express server is starting
2. **Verify startCommand**: Check `client/railway.json` has `"startCommand": "npm start"`
3. **Check Express is installed**: Verify `express` is in `package.json` dependencies
4. **Redeploy**: Sometimes Railway needs a manual redeploy

### Server Not Starting

1. **Check logs**: Look for errors in Railway deployment logs
2. **Verify Node version**: Express requires Node.js 14+
3. **Check file paths**: Ensure `server.js` is in the `client/` directory

### Works Locally But Not on Railway

1. **Check build output**: Ensure `dist/` folder is created during build
2. **Verify static files**: Check that `dist/index.html` exists
3. **Check PORT environment variable**: Railway sets this automatically

## Alternative Solutions

If you prefer not to use Express, you can:

1. **Use a different hosting provider** that handles SPA routing natively (Vercel, Netlify)
2. **Configure Railway with a custom Nginx setup** (more complex)
3. **Use Railway's static site hosting** with proper rewrite rules (if available)

However, the Express server solution is the simplest and most reliable for Railway deployments.

## Related Documentation

- [Tranzila Integration Setup](./TRANZILA_INTEGRATION_SETUP.md)
- [Deployment Guide](./DEPLOYMENT.md)


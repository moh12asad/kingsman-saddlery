# Railway Deployment Troubleshooting Guide

## Issue: Changes Not Working After Push

If you've pushed changes but they're not working on Railway, follow these steps:

## Step 1: Check Railway Deployment Logs

1. Go to your Railway dashboard: https://railway.app
2. Click on your **frontend service**
3. Go to the **"Deployments"** tab
4. Click on the **latest deployment**
5. Check the **logs** for errors

### Common Errors to Look For:

#### Error: "Cannot find module 'express'"
**Solution**: `package-lock.json` is out of sync
```bash
cd client
npm install
git add client/package-lock.json
git commit -m "Update package-lock.json"
git push
```

#### Error: "Cannot find module './server.js'"
**Solution**: `server.js` not in the right location
- Ensure `server.js` is in the `client/` directory
- Check that it's committed to git

#### Error: "EADDRINUSE: address already in use"
**Solution**: Port conflict
- Railway sets `PORT` environment variable automatically
- The server should use `process.env.PORT || 5174`

#### Error: "index.html not found"
**Solution**: Build didn't complete
- Check that `npm run build` succeeded
- Verify `dist/` folder exists in build logs

## Step 2: Verify Railway Configuration

### Check Start Command

1. Go to Railway dashboard → Your frontend service → **Settings**
2. Scroll to **"Deploy"** section
3. Verify **"Start Command"** is: `npm start`
   - If it shows `npm run preview`, change it to `npm start`
   - Click **"Save"**
   - Railway will redeploy automatically

### Check Root Directory

1. In **Settings** → **"Root Directory"**
2. Should be: `client`
3. If it's wrong, change it and redeploy

### Check Build Command

1. In **Settings** → **"Build Command"**
2. Should be: `npm install && npm run build`
3. Or leave empty if using `railway.json`

## Step 3: Verify Files Are Committed

Check that all files are in git:

```bash
git status
```

You should see:
- `client/server.js` (new file)
- `client/package.json` (modified)
- `client/railway.json` (modified)
- `client/package-lock.json` (modified - if you ran npm install)

If any are missing:
```bash
git add client/server.js client/package.json client/railway.json client/package-lock.json
git commit -m "Add Express server for SPA routing"
git push
```

## Step 4: Check Railway Logs for Server Startup

After deployment, check the logs for:

✅ **Success indicators:**
```
Server running on http://0.0.0.0:PORT
Serving static files from: /path/to/dist
```

❌ **Error indicators:**
```
Error: Cannot find module 'express'
Error: Cannot find module './server.js'
Error: EADDRINUSE
index.html not found in dist directory
```

## Step 5: Manual Redeploy

If automatic deployment didn't work:

1. Go to Railway dashboard → Your frontend service
2. Click **"Deployments"** tab
3. Click **"Redeploy"** button (three dots menu)
4. Select **"Redeploy"**
5. Wait for deployment to complete

## Step 6: Test the Server

### Test 1: Check if server is running
1. Go to your Railway service → **"Logs"** tab
2. You should see: `Server running on http://0.0.0.0:PORT`
3. If you don't see this, the server didn't start

### Test 2: Test direct URL access
1. Navigate to: `https://your-domain.up.railway.app/payment/failed`
2. Should load the PaymentFailed page (not 404)
3. If 404, the server isn't handling SPA routing

### Test 3: Test static files
1. Navigate to: `https://your-domain.up.railway.app/` (home page)
2. Should load normally
3. Check browser console for any errors

## Step 7: Common Issues and Fixes

### Issue: "npm ci" fails with missing packages
**Cause**: `package-lock.json` out of sync
**Fix**:
```bash
cd client
npm install
git add client/package-lock.json
git commit -m "Update package-lock.json"
git push
```

### Issue: Server starts but still getting 404
**Cause**: Railway might be using cached start command
**Fix**:
1. Go to Railway → Settings → Deploy
2. Manually set Start Command to: `npm start`
3. Save and redeploy

### Issue: Build succeeds but server doesn't start
**Cause**: Missing `server.js` or wrong path
**Fix**:
1. Verify `client/server.js` exists
2. Check it's committed: `git ls-files client/server.js`
3. If missing, add and commit it

### Issue: "Cannot find module 'express'"
**Cause**: Express not in dependencies or lock file out of sync
**Fix**:
```bash
cd client
npm install express
git add client/package.json client/package-lock.json
git commit -m "Add Express dependency"
git push
```

### Issue: Works locally but not on Railway
**Cause**: Different Node version or environment
**Fix**:
1. Check Railway logs for Node version
2. Add `.nvmrc` file in `client/` directory:
   ```
   18
   ```
3. Commit and redeploy

## Step 8: Verify Railway.json is Being Used

Railway should automatically use `railway.json` if it exists. To verify:

1. Check Railway logs during build
2. Should see: `Using railway.json configuration`
3. If not, Railway might be using dashboard settings instead

**Override with dashboard settings:**
- Go to Settings → Deploy
- Manually set Start Command: `npm start`
- This overrides `railway.json`

## Step 9: Check for Multiple Services

If you have multiple frontend services:

1. Make sure you're checking the **correct service**
2. Verify the service name matches your production deployment
3. Check that the correct service is connected to your domain

## Step 10: Nuclear Option - Fresh Deploy

If nothing works:

1. **Backup your Railway configuration** (screenshot settings)
2. **Delete the service** (or create a new one)
3. **Create new service** from GitHub repo
4. **Set Root Directory**: `client`
5. **Set Start Command**: `npm start`
6. **Set Build Command**: `npm install && npm run build`
7. **Add environment variables** (copy from old service)
8. **Deploy**

## Quick Checklist

Before asking for help, verify:

- [ ] `client/server.js` exists and is committed
- [ ] `client/package.json` has `express` in dependencies
- [ ] `client/package.json` has `"start": "node server.js"` in scripts
- [ ] `client/railway.json` has `"startCommand": "npm start"`
- [ ] `client/package-lock.json` is updated (run `npm install` locally)
- [ ] All files are committed and pushed to git
- [ ] Railway Start Command is set to `npm start` (check Settings)
- [ ] Railway Root Directory is set to `client`
- [ ] Build logs show successful build
- [ ] Deployment logs show "Server running on http://0.0.0.0:PORT"

## Still Not Working?

If you've checked everything above:

1. **Share Railway logs** (screenshot or copy/paste)
2. **Share build logs** (screenshot or copy/paste)
3. **Verify git status** - run `git status` and share output
4. **Check Railway service settings** - screenshot the Deploy section

This will help identify the exact issue.


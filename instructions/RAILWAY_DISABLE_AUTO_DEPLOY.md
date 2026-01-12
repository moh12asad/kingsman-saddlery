# How to Disable Automatic Deployment on Railway

This guide shows you how to prevent Railway from automatically deploying when you push commits to your repository.

---

## Method 1: Disable Auto-Deploy in Railway Dashboard (Recommended)

This is the easiest way to disable automatic deployments.

### For a Single Service:

1. Go to [Railway Dashboard](https://railway.app)
2. Select your **project**
3. Click on the **service** you want to configure (e.g., `backend` or `frontend`)
4. Go to **"Settings"** tab
5. Scroll down to **"Source"** section
6. Find **"Auto Deploy"** toggle
7. **Turn OFF** the toggle (it should be gray/unchecked)
8. Click **"Save"** or changes save automatically

**Result:** Railway will no longer automatically deploy when you push commits. You'll need to manually trigger deployments.

### For Multiple Services:

Repeat the above steps for each service (backend, frontend, etc.) you want to disable auto-deploy for.

---

## Method 2: Use Branch-Based Deployments

Instead of disabling completely, you can configure Railway to only auto-deploy from specific branches (e.g., `main` or `production`).

### Configure Branch-Based Auto-Deploy:

1. Go to Railway Dashboard → Your Project → Your Service
2. Go to **"Settings"** tab
3. Scroll to **"Source"** section
4. Find **"Branch"** setting
5. Set it to a specific branch (e.g., `main`, `production`, `staging`)
6. **Keep "Auto Deploy" ON**

**Result:** Railway will only auto-deploy when you push to the specified branch. Pushes to other branches won't trigger deployments.

**Example:**
- Set branch to `main` → Only deploys from `main` branch
- Push to `develop` branch → No deployment
- Push to `main` branch → Automatic deployment

---

## Method 3: Use Railway CLI to Control Deployments

You can use Railway CLI to manually trigger deployments when needed.

### Install Railway CLI:

```bash
npm install -g @railway/cli
```

### Login:

```bash
railway login
```

### Link Your Project:

```bash
railway link
```

### Deploy Manually:

```bash
# Deploy current branch
railway up

# Deploy specific service
railway up --service backend
railway up --service frontend
```

**With auto-deploy disabled**, you can push commits freely, then manually deploy when ready using `railway up`.

---

## Method 4: Use GitHub Actions or Workflows

If you want more control, you can disable Railway's auto-deploy and use GitHub Actions to trigger deployments conditionally.

### Step 1: Disable Auto-Deploy in Railway
- Follow Method 1 above

### Step 2: Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Railway

on:
  push:
    branches:
      - main  # Only deploy from main branch
    paths:
      - 'server/**'  # Only deploy if server files change
      - 'client/**'  # Only deploy if client files change
  workflow_dispatch:  # Allow manual trigger

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Railway
        uses: bervProject/railway-deploy@v1.0.0
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: backend  # or frontend
```

**Result:** Deployments only happen when:
- You push to `main` branch
- AND files in `server/` or `client/` change
- OR you manually trigger the workflow

---

## Method 5: Use Railway Environments

Create separate environments (staging, production) and configure auto-deploy per environment.

### Create Staging Environment:

1. In Railway Dashboard → Your Project
2. Click **"Environments"** (or create new)
3. Create **"Staging"** environment
4. Configure services in staging environment
5. **Disable auto-deploy for staging**
6. **Keep auto-deploy ON for production**

**Result:**
- Staging: Manual deployments only (for testing)
- Production: Auto-deploy from `main` branch

---

## Quick Reference: When to Use Each Method

| Method | Best For | Complexity |
|--------|----------|------------|
| **Method 1** | Simple disable for all services | ⭐ Easy |
| **Method 2** | Deploy only from specific branch | ⭐ Easy |
| **Method 3** | Manual control via CLI | ⭐⭐ Medium |
| **Method 4** | Advanced conditional deployments | ⭐⭐⭐ Advanced |
| **Method 5** | Separate staging/production | ⭐⭐ Medium |

---

## How to Manually Deploy After Disabling Auto-Deploy

Once auto-deploy is disabled, you have several options:

### Option A: Railway Dashboard

1. Go to Railway Dashboard → Your Service
2. Go to **"Deployments"** tab
3. Click **"Redeploy"** button
4. Select the commit/branch to deploy
5. Click **"Deploy"**

### Option B: Railway CLI

```bash
railway up
```

### Option C: GitHub Integration

1. Go to Railway Dashboard → Your Service → Settings
2. Scroll to **"Source"** section
3. Click **"Deploy"** button
4. Select branch/commit
5. Click **"Deploy"**

---

## Re-Enable Auto-Deploy

To turn auto-deploy back on:

1. Go to Railway Dashboard → Your Service → Settings
2. Scroll to **"Source"** section
3. Turn **ON** the **"Auto Deploy"** toggle
4. Save

---

## Recommended Setup for Development

**For Active Development:**
- **Staging Environment**: Auto-deploy OFF (manual deployments for testing)
- **Production Environment**: Auto-deploy ON (only from `main` branch)

**For Stable Production:**
- **All Environments**: Auto-deploy ON (from specific branches only)

---

## Troubleshooting

### Problem: Auto-deploy still triggers after disabling

**Solution:**
- Check if you disabled it for the correct service
- Verify changes saved (refresh the page)
- Check if there are multiple services linked to the same repo

### Problem: Can't find Auto-Deploy toggle

**Solution:**
- Make sure you're in the **Settings** tab of the service
- Scroll down to **"Source"** section
- If using Railway's new UI, it might be under **"Deployments"** → **"Settings"**

### Problem: Want to deploy only on merge to main

**Solution:**
- Use Method 2 (Branch-based deployments)
- Set branch to `main`
- Keep auto-deploy ON
- Only merges to `main` will trigger deployments

---

## Summary

**To disable auto-deploy:**
1. Railway Dashboard → Service → Settings
2. Find **"Auto Deploy"** toggle
3. Turn it OFF
4. Save

**To manually deploy:**
- Use Railway Dashboard → Deployments → Redeploy
- Or use Railway CLI: `railway up`

**Best Practice:**
- Keep auto-deploy ON for production (from `main` branch only)
- Keep auto-deploy OFF for staging (manual deployments for testing)

---

**Last Updated**: 2024
**Version**: 1.0


# How to Add www.kingsmansaddlery.com to GoDaddy DNS

This guide will help you add the `www` subdomain so that `www.kingsmansaddlery.com` works correctly.

---

## Step 1: Get Your Railway Domain

1. Go to [Railway Dashboard](https://railway.app)
2. Select your project
3. Click on your **client service** (frontend)
4. Go to **Settings** → **Domains**
5. Look for your Railway domain (it will look like: `f6da841f.up.railway.app` or similar)
6. **Copy this domain** - you'll need it in the next step

**If you don't see a domain yet:**
- Click **"Generate Domain"** to create one
- Or if you already added `kingsmansaddlery.com`, Railway should show you the target domain

---

## Step 2: Check Current www Record in GoDaddy

1. Go to [GoDaddy.com](https://www.godaddy.com) and log in
2. Click on your name in the top right → **"My Products"**
3. Find your domain `kingsmansaddlery.com`
4. Click **"DNS"** (or click the three dots → **"Manage DNS"**)
5. Look for a record with:
   - **Type**: `CNAME`
   - **Name**: `www`

**What you might see:**
- ❌ **If it says**: `kingsmansaddlery.com.` → This is wrong! It points to itself and won't work.
- ✅ **If it says**: `f6da841f.up.railway.app` (or your Railway domain) → Already correct!
- ❌ **If there's no `www` record** → You need to add one

---

## Step 3: Add or Edit the www CNAME Record

### Option A: If www Record Already Exists (But Points to Wrong Value)

1. Find the `www` CNAME record in your DNS list
2. Click the **pencil icon (Edit)** next to it
3. Change the **Data/Value** field:
   - **Remove**: `kingsmansaddlery.com.` (or whatever wrong value is there)
   - **Enter**: Your Railway domain (e.g., `f6da841f.up.railway.app`)
   - ⚠️ **Important**: Don't include `https://` or trailing slashes - just the domain name
4. Click **Save**

### Option B: If www Record Doesn't Exist (Need to Add New One)

1. In GoDaddy DNS settings, scroll to **"Records"** section
2. Click the **"Add"** button
3. Configure the record:
   - **Type**: Select **"CNAME"**
   - **Name**: Enter `www` (just `www`, not `www.kingsmansaddlery.com`)
   - **Value/Data**: Enter your Railway domain (e.g., `f6da841f.up.railway.app`)
   - **TTL**: Leave default (usually 1 Hour or 600 seconds)
4. Click **Save**

---

## Step 4: Add www Domain in Railway

**Important**: You also need to tell Railway about the www subdomain!

1. Go back to [Railway Dashboard](https://railway.app)
2. Select your project
3. Click on your **client service** (frontend)
4. Go to **Settings** → **Domains**
5. Click **"Add Domain"** button
6. Enter: `www.kingsmansaddlery.com`
   - ⚠️ **Include the `www.` prefix** - enter the full subdomain
7. Click **Add** or **Save**

Railway will automatically detect the CNAME record you just added in GoDaddy.

---

## Step 5: Wait for DNS Propagation

- DNS changes take **15-60 minutes** to propagate globally
- Usually takes **30 minutes** for most locations
- You can check status in Railway Dashboard → Domains

**What to expect:**
- Railway will show the domain status as **"Pending"** initially
- After propagation, it will change to **"Active"** ✅
- SSL certificate will be automatically provisioned (takes additional 15-30 minutes)

---

## Step 6: Verify It's Working

### Check in Railway:
1. Go to Railway Dashboard → Domains
2. Look for `www.kingsmansaddlery.com`
3. Status should show **"Active"** ✅

### Test in Browser:
1. Wait at least 30 minutes after adding the record
2. Visit: `https://www.kingsmansaddlery.com`
3. Your website should load!

### Check DNS Propagation:
1. Visit: [whatsmydns.net](https://www.whatsmydns.net)
2. Enter: `www.kingsmansaddlery.com`
3. Select **CNAME** record type
4. Should show your Railway domain (e.g., `f6da841f.up.railway.app`)

---

## What Your DNS Should Look Like

After completing these steps, you should have:

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| **CNAME** | `www` | `f6da841f.up.railway.app` | www subdomain → Railway |

**Note**: You might also have an A record for `@` (root domain) pointing to Railway IP, which is separate and handles `kingsmansaddlery.com` (without www).

---

## Troubleshooting

### Problem: "Record data is invalid" when adding CNAME
**Solution**: 
- Make sure you're using a domain name (like `f6da841f.up.railway.app`), not an IP address
- Don't include `https://` or `http://`
- Don't include trailing slashes

### Problem: www.kingsmansaddlery.com still not working after 1 hour
**Solutions**:
- Double-check the CNAME value matches your Railway domain exactly
- Verify you added `www.kingsmansaddlery.com` in Railway Dashboard (not just the DNS record)
- Check DNS propagation at [whatsmydns.net](https://www.whatsmydns.net)
- Clear your browser cache and try again
- Try accessing in incognito/private mode

### Problem: Railway shows "Pending" status
**Solutions**:
- Wait longer (can take up to 60 minutes)
- Verify the CNAME record is correct in GoDaddy
- Make sure the record name is exactly `www` (not `www.` or `www.kingsmansaddlery.com`)

### Problem: SSL certificate not working for www
**Solutions**:
- Wait 15-30 minutes after domain becomes "Active" in Railway
- Railway automatically provisions SSL certificates - it just takes time
- Try accessing with `https://` (not `http://`)

---

## Quick Checklist

- [ ] Got Railway domain from Railway Dashboard
- [ ] Checked existing `www` CNAME record in GoDaddy
- [ ] Added or edited `www` CNAME record to point to Railway domain
- [ ] Added `www.kingsmansaddlery.com` in Railway Dashboard
- [ ] Waited 30-60 minutes for DNS propagation
- [ ] Verified domain shows "Active" in Railway
- [ ] Tested `https://www.kingsmansaddlery.com` in browser

---

**Last Updated**: 2024  
**Version**: 1.0


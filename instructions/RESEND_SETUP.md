# Resend Email Setup Guide

Complete guide for setting up Resend email service with domain verification and Railway deployment.

## Table of Contents
1. [Getting Started with Resend](#getting-started-with-resend)
2. [Setting Up Domain (Optional but Recommended)](#setting-up-domain-optional-but-recommended)
3. [Configuring Railway](#configuring-railway)
4. [Testing Your Setup](#testing-your-setup)
5. [Troubleshooting](#troubleshooting)

---

## Getting Started with Resend

### Step 1: Create Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Click **"Sign Up"** or **"Get Started"**
3. Sign up with your email address (you can use your Gmail: `moh12asad10@gmail.com`)
4. Verify your email address

### Step 2: Get Your API Key

1. After logging in, go to **API Keys** in the left sidebar
2. Click **"Create API Key"**
3. Give it a name (e.g., "Kingsman Saddlery Production")
4. Copy the API key (starts with `re_...`)
   - ⚠️ **Important**: Save this key securely - you won't be able to see it again!

### Step 3: Choose Your Setup Path

**Option A: Quick Start (No Domain)**
- Use Resend's test email: `onboarding@resend.dev`
- Works immediately, no domain needed
- Good for testing and development

**Option B: Professional Setup (With Domain)** ⭐ Recommended
- Use your own domain (e.g., `noreply@yourdomain.com`)
- More professional appearance
- Better email deliverability
- Requires domain verification (see next section)

---

## Setting Up Domain (Optional but Recommended)

### Step 1: Add Domain in Resend

1. In Resend Dashboard, go to **"Domains"** in the left sidebar
2. Click **"Add Domain"**
3. Enter your domain name (e.g., `kingsmansaddlery.com`)
   - ⚠️ **Don't include** `www` or `http://` - just the domain name
4. Click **"Add"**

### Step 2: Get DNS Records from Resend

After adding your domain, Resend will show you DNS records that need to be added. You'll typically see:

1. **TXT Record for Domain Verification**
   - Name: `@` or your domain
   - Value: A long verification string
   - Purpose: Verifies you own the domain

2. **SPF Record (TXT)**
   - Name: `@`
   - Value: `v=spf1 include:resend.com ~all`
   - Purpose: Authorizes Resend to send emails from your domain

3. **DKIM Record (TXT)**
   - Name: `resend._domainkey` (or similar)
   - Value: A long DKIM key
   - Purpose: Email authentication for better deliverability

### Step 3: Add DNS Records to Your Domain

The steps vary by domain registrar. Here are common ones:

#### If using Namecheap:
1. Go to [Namecheap](https://www.namecheap.com) and log in
2. Go to **Domain List** → Click **"Manage"** next to your domain
3. Go to **"Advanced DNS"** tab
4. Click **"Add New Record"** for each record Resend provided
5. Select **"TXT Record"** as the type
6. Enter the **Host** and **Value** from Resend
7. Click **"Save"** (green checkmark)

#### If using GoDaddy:
1. Go to [GoDaddy](https://www.godaddy.com) and log in
2. Go to **My Products** → Click **"DNS"** next to your domain
3. Scroll to **"Records"** section
4. Click **"Add"** for each record
5. Select **"TXT"** as the type
6. Enter the **Name** and **Value** from Resend
7. Click **"Save"**

#### If using Cloudflare:
1. Go to [Cloudflare](https://www.cloudflare.com) and log in
2. Select your domain
3. Go to **DNS** → **Records**
4. Click **"Add record"**
5. Select **"TXT"** as the type
6. Enter the **Name** and **Content** from Resend
7. Click **"Save"**

#### If using Google Domains:
1. Go to [Google Domains](https://domains.google.com) and log in
2. Click on your domain
3. Go to **DNS** tab
4. Scroll to **"Custom resource records"**
5. Click **"Manage custom records"**
6. Add each TXT record from Resend
7. Click **"Save"**

### Step 4: Wait for DNS Propagation

- DNS changes can take **5 minutes to 48 hours** to propagate
- Usually takes **15-60 minutes** in most cases
- You can check status in Resend Dashboard → Domains

### Step 5: Verify Domain in Resend

1. Go back to Resend Dashboard → **Domains**
2. You should see your domain with status **"Pending"** or **"Verifying"**
3. Once verified, status will change to **"Verified"** ✅
4. You can now send emails from any address on your domain!

### Step 6: Choose Your "From" Email Address

Once your domain is verified, you can use any email address on your domain:
- `noreply@yourdomain.com` (recommended for automated emails)
- `info@yourdomain.com`
- `orders@yourdomain.com`
- `support@yourdomain.com`
- Or any other address you prefer

**Note**: You don't need to create these email addresses anywhere - Resend handles the sending. You just need to verify the domain.

---

## Configuring Railway

### Step 1: Access Railway Environment Variables

1. Go to [Railway](https://railway.app) and log in
2. Select your project
3. Click on your **server service** (not the client)
4. Go to the **"Variables"** tab

### Step 2: Add Required Environment Variables

Add these environment variables one by one:

#### Required Variables:

**1. RESEND_API_KEY**
```
RESEND_API_KEY=re_your_actual_api_key_here
```
- Replace `re_your_actual_api_key_here` with your actual Resend API key
- This is the key you copied from Resend Dashboard → API Keys

**2. RESEND_REPLY_TO**
```
RESEND_REPLY_TO=moh12asad10@gmail.com
```
- This is where replies to your emails will go
- Use your Gmail address or any email you want to receive replies

#### Optional Variables:

**3. RESEND_FROM_EMAIL** (Choose one option)

**Option A: Using Your Domain** (Recommended if domain is verified)
```
RESEND_FROM_EMAIL=noreply@yourdomain.com
```
- Replace `yourdomain.com` with your actual domain
- Use this if you've verified your domain in Resend

**Option B: Using Test Email** (Quick start, no domain needed)
```
RESEND_FROM_EMAIL=onboarding@resend.dev
```
- Or simply don't set this variable - it defaults to `onboarding@resend.dev`
- Use this for testing or if you don't have a domain yet

### Step 3: Complete Railway Configuration Example

Here's a complete example of all variables you might set:

**If using your own domain:**
```
RESEND_API_KEY=re_abc123xyz789...
RESEND_FROM_EMAIL=noreply@kingsmansaddlery.com
RESEND_REPLY_TO=moh12asad10@gmail.com
```

**If using test email (no domain):**
```
RESEND_API_KEY=re_abc123xyz789...
RESEND_REPLY_TO=moh12asad10@gmail.com
```
(Don't set `RESEND_FROM_EMAIL` - it will default to `onboarding@resend.dev`)

### Step 4: Deploy/Redeploy

1. After adding all variables, Railway will automatically detect changes
2. Your service will automatically redeploy
3. Wait for deployment to complete (usually 1-3 minutes)
4. Check the deployment logs to ensure it's successful

---

## Testing Your Setup

### Method 1: Test Endpoint (Recommended)

1. After deployment, visit or call:
   ```
   GET https://your-railway-app.railway.app/api/email/test-smtp
   ```

2. You should see a response like:
   ```json
   {
     "ok": true,
     "message": "Resend API is configured and ready",
     "service": "Resend",
     "config": {
       "fromEmail": "noreply@yourdomain.com",
       "replyToEmail": "moh12asad10@gmail.com",
       "apiKey": "re_*****",
       "note": "Emails will be sent FROM the 'fromEmail' address, but replies will go to 'replyToEmail' (your Gmail)"
     }
   }
   ```

### Method 2: Test with Real Order

1. Go to your application
2. Place a test order
3. Complete the checkout process
4. Check if the order confirmation email is sent
5. Verify the email appears in the recipient's inbox

### Method 3: Check Railway Logs

1. Go to Railway Dashboard → Your Server Service
2. Click on **"Deployments"** or **"Logs"**
3. Look for log messages like:
   ```
   [EMAIL] Using Resend API to send email...
   [EMAIL] Resend From: noreply@yourdomain.com
   [EMAIL] Resend Reply-To: moh12asad10@gmail.com
   [EMAIL] ✓ Email sent successfully via Resend!
   ```

---

## Troubleshooting

### Problem: "Email service not configured" Error

**Solution:**
- Check that `RESEND_API_KEY` is set correctly in Railway
- Verify the API key starts with `re_`
- Make sure there are no extra spaces in the environment variable value

### Problem: "From email not configured" Error

**Solution:**
- If using domain: Set `RESEND_FROM_EMAIL` to your verified domain email
- If not using domain: Don't set `RESEND_FROM_EMAIL` (it will default to `onboarding@resend.dev`)
- Or explicitly set: `RESEND_FROM_EMAIL=onboarding@resend.dev`

### Problem: Domain Verification Failing

**Possible Causes:**
1. DNS records not added correctly
2. DNS propagation still in progress (wait up to 48 hours)
3. Wrong DNS record values

**Solution:**
- Double-check DNS records match exactly what Resend provided
- Verify records are saved in your domain registrar
- Use a DNS checker tool like [MXToolbox](https://mxtoolbox.com) to verify records are live
- Wait longer for DNS propagation (can take up to 48 hours)

### Problem: Emails Not Sending

**Check:**
1. Railway logs for error messages
2. Resend Dashboard → Logs for delivery status
3. Spam folder (sometimes emails go there initially)
4. That your domain is verified (if using custom domain)

### Problem: "Invalid API Key" Error

**Solution:**
- Verify you copied the entire API key (starts with `re_`)
- Check for extra spaces or characters
- Generate a new API key in Resend if needed
- Make sure you're using the correct environment variable name: `RESEND_API_KEY`

### Problem: Can't Send from Domain Email

**Solution:**
- Verify domain is fully verified in Resend (status should be "Verified" ✅)
- Make sure `RESEND_FROM_EMAIL` matches your verified domain
- Format: `noreply@yourdomain.com` (not `noreply@www.yourdomain.com`)

---

## Quick Reference

### Environment Variables Summary

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RESEND_API_KEY` | ✅ Yes | None | Your Resend API key (starts with `re_`) |
| `RESEND_REPLY_TO` | ✅ Yes | None | Email address where replies should go |
| `RESEND_FROM_EMAIL` | ⚠️ Optional | `onboarding@resend.dev` | Email address to send from (use your domain if verified) |

### Email Flow

**Without Domain (Test Mode):**
- **From**: `Kingsman Saddlery <onboarding@resend.dev>`
- **Reply-To**: `moh12asad10@gmail.com`
- **Status**: Works immediately ✅

**With Domain (Production Mode):**
- **From**: `Kingsman Saddlery <noreply@yourdomain.com>`
- **Reply-To**: `moh12asad10@gmail.com`
- **Status**: Requires domain verification ✅

---

## Next Steps

1. ✅ Set up Resend account and get API key
2. ✅ Add environment variables to Railway
3. ⚠️ (Optional) Verify your domain in Resend
4. ✅ Test email sending
5. ✅ Monitor email delivery in Resend Dashboard

## Support

- **Resend Documentation**: [https://resend.com/docs](https://resend.com/docs)
- **Resend Support**: Check Resend Dashboard for support options
- **Railway Documentation**: [https://docs.railway.app](https://docs.railway.app)

---

**Last Updated**: 2024
**Version**: 1.0


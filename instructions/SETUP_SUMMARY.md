# Complete Setup Summary: GoDaddy Domain → Railway + Resend

This document summarizes everything we did to set up your domain `moh12asad.com` with Railway (website hosting) and Resend (email service).

---

## What We Accomplished

✅ Connected your GoDaddy domain to Railway for website hosting  
✅ Set up Resend email service to bypass Railway's SMTP port blocking  
✅ Configured DNS records correctly in GoDaddy  
✅ Fixed CNAME/A record issues for root domain  
✅ Set up www subdomain for better compatibility  

---

## Part 1: Email Service Setup (Resend)

### Problem We Solved
- Railway blocks SMTP ports (587, 465), preventing direct email sending via Gmail SMTP
- Solution: Use Resend API instead of SMTP

### Steps Completed

1. **Installed Resend Package**
   - Added `resend` package to `server/package.json`
   - Ran `npm install` in server directory

2. **Updated Email Service Code**
   - Modified `server/lib/emailService.js` to support Resend API
   - Auto-detects Resend when `RESEND_API_KEY` is set
   - Falls back to SMTP if Resend is not configured
   - Supports both domain emails and test email (`onboarding@resend.dev`)

3. **Updated Email Routes**
   - Modified `server/routes/email.js` to test Resend configuration
   - Added support for testing both Resend and SMTP

4. **Railway Environment Variables Added**
   ```
   RESEND_API_KEY=re_your_api_key_here
   RESEND_REPLY_TO=moh12asad10@gmail.com
   RESEND_FROM_EMAIL=onboarding@resend.dev (or your domain email when verified)
   ```

### How It Works Now
- **Order confirmation emails**: Sent via Resend API
- **Contact form emails**: Sent via Resend API
- **From address**: `onboarding@resend.dev` (or your domain email when verified)
- **Reply-to**: `moh12asad10@gmail.com` (your Gmail for receiving replies)
- **No SMTP port blocking issues**: Resend uses HTTPS API, not SMTP ports

---

## Part 2: Domain Setup (GoDaddy → Railway)

### Problem We Solved
- GoDaddy doesn't allow CNAME records for root domain (`@`)
- Railway initially requested CNAME, but we needed A record for root domain
- Had to set up both root domain and www subdomain

### Steps Completed

1. **Added Domain in Railway**
   - Went to Railway Dashboard → Client Service → Networking
   - Added custom domain: `moh12asad.com`
   - Railway provided target: `f6da841f.up.railway.app`

2. **Configured DNS Records in GoDaddy**

   **For Root Domain (`moh12asad.com`):**
   - **Type**: `A` (not CNAME - GoDaddy doesn't allow CNAME for `@`)
   - **Name**: `@`
   - **Value**: `66.33.22.80` (IP address of Railway domain)
   - **TTL**: 1/2 Hour
   
   **For www Subdomain (`www.moh12asad.com`):**
   - **Type**: `CNAME`
   - **Name**: `www`
   - **Value**: `f6da841f.up.railway.app`
   - **TTL**: 1 Hour

3. **Removed Conflicting Records**
   - Deleted GoDaddy's "WebsiteBuilder Site" A record that was conflicting
   - Kept only the Railway A record

4. **Added www Domain in Railway**
   - Added `www.moh12asad.com` as a second custom domain in Railway
   - Railway detected the CNAME record quickly

### Final DNS Configuration in GoDaddy

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| A | `@` | `66.33.22.80` | Root domain → Railway |
| CNAME | `www` | `f6da841f.up.railway.app` | www subdomain → Railway |

### SSL Certificate
- Railway automatically provisions SSL certificates for custom domains
- Takes 15-60 minutes after DNS is detected
- Both `https://moh12asad.com` and `https://www.moh12asad.com` work with SSL

---

## Part 3: Resend Domain Setup (For Email)

### Status: Ready to Set Up (Optional)

To send emails from your domain (e.g., `noreply@moh12asad.com`) instead of `onboarding@resend.dev`:

### Steps to Complete (When Ready)

1. **Add Domain in Resend**
   - Go to Resend Dashboard → Domains
   - Add domain: `moh12asad.com`

2. **Get DNS Records from Resend**
   - Resend will provide 3 TXT records:
     - Domain verification TXT record
     - SPF record: `v=spf1 include:resend.com ~all`
     - DKIM record (with name like `resend._domainkey`)

3. **Add TXT Records in GoDaddy**
   - Add all 3 TXT records to your GoDaddy DNS
   - Wait for domain verification (15-60 minutes)

4. **Update Railway Environment Variable**
   ```
   RESEND_FROM_EMAIL=noreply@moh12asad.com
   ```

### Current Email Setup (Working Now)
- **From**: `Kingsman Saddlery <onboarding@resend.dev>`
- **Reply-To**: `moh12asad10@gmail.com`
- **Status**: ✅ Working perfectly

---

## Files Modified

### Code Changes
1. **`server/package.json`**
   - Added `"resend": "^3.2.0"` dependency

2. **`server/lib/emailService.js`**
   - Added Resend API support
   - Auto-detection of Resend vs SMTP
   - Support for domain emails and test emails
   - Reply-to configuration

3. **`server/routes/email.js`**
   - Updated test endpoint to support Resend
   - Better error messages

### Documentation Created
1. **`instructions/RESEND_SETUP.md`**
   - Complete Resend setup guide
   - Domain verification instructions
   - Railway configuration

2. **`instructions/GODADDY_RAILWAY_RESEND_SETUP.md`**
   - Complete GoDaddy → Railway → Resend guide
   - DNS configuration steps
   - Troubleshooting

3. **`instructions/SETUP_SUMMARY.md`** (this file)
   - Summary of everything we did

---

## Current Working Configuration

### Website
- ✅ `https://moh12asad.com` - Working (via A record)
- ✅ `https://www.moh12asad.com` - Working (via CNAME)
- ✅ SSL certificates active
- ✅ Hosted on Railway

### Email Service
- ✅ Resend API configured
- ✅ Emails sending successfully
- ✅ From: `onboarding@resend.dev`
- ✅ Reply-to: `moh12asad10@gmail.com`
- ✅ No SMTP port blocking issues

### DNS Records (GoDaddy)
- ✅ A record: `@` → `66.33.22.80`
- ✅ CNAME record: `www` → `f6da841f.up.railway.app`

---

## Key Learnings

1. **GoDaddy Limitations**
   - Cannot use CNAME for root domain (`@`)
   - Must use A record with IP address for root domain
   - CNAME works fine for subdomains like `www`

2. **Railway Domain Setup**
   - Railway prefers CNAME records
   - But works with A records (just takes longer to detect)
   - Automatically provisions SSL certificates
   - Supports both root and www subdomains

3. **Resend Email Service**
   - Bypasses Railway's SMTP port blocking
   - Uses HTTPS API instead of SMTP
   - Can use test email immediately
   - Can verify domain for custom email addresses

4. **DNS Propagation**
   - Usually takes 15-60 minutes
   - Can take up to 72 hours in worst case
   - Use DNS checkers to verify propagation

---

## Troubleshooting We Encountered

### Issue 1: "Record data is invalid" Error
**Problem**: Trying to use CNAME for root domain in GoDaddy  
**Solution**: Used A record with IP address instead

### Issue 2: "WebsiteBuilder Site" Conflict
**Problem**: GoDaddy's default A record was conflicting  
**Solution**: Deleted the WebsiteBuilder record, kept only Railway A record

### Issue 3: Railway Not Detecting DNS
**Problem**: Railway was looking for CNAME, we had A record  
**Solution**: Set up www subdomain with CNAME, Railway detected it quickly

### Issue 4: SSL Certificate Not Ready
**Problem**: "Not Secure" warning in browser  
**Solution**: Waited for Railway to automatically provision SSL (15-60 minutes)

---

## Next Steps (Optional)

### To Use Your Domain for Email (Instead of onboarding@resend.dev)

1. Add domain in Resend Dashboard
2. Add 3 TXT records to GoDaddy DNS
3. Wait for verification
4. Update `RESEND_FROM_EMAIL` in Railway to `noreply@moh12asad.com`

### To Add More Subdomains

If you want to add more subdomains (e.g., `api.moh12asad.com`):
1. Add CNAME record in GoDaddy: `api` → `f6da841f.up.railway.app`
2. Add custom domain in Railway: `api.moh12asad.com`

---

## Quick Reference

### Railway Environment Variables
```
RESEND_API_KEY=re_your_key_here
RESEND_REPLY_TO=moh12asad10@gmail.com
RESEND_FROM_EMAIL=onboarding@resend.dev (or noreply@moh12asad.com when domain verified)
```

### GoDaddy DNS Records
```
A     @    66.33.22.80
CNAME www  f6da841f.up.railway.app
```

### Test Endpoints
- Website: `https://moh12asad.com` or `https://www.moh12asad.com`
- Email Test: `https://your-railway-backend.railway.app/api/email/test-smtp`

---

## Support Resources

- **Railway Docs**: [https://docs.railway.app](https://docs.railway.app)
- **Resend Docs**: [https://resend.com/docs](https://resend.com/docs)
- **GoDaddy Help**: [https://www.godaddy.com/help](https://www.godaddy.com/help)
- **DNS Checker**: [https://www.whatsmydns.net](https://www.whatsmydns.net)

---

**Date Completed**: 2024  
**Domain**: `moh12asad.com`  
**Status**: ✅ Fully Operational


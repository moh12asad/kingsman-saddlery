# Complete Guide: GoDaddy Domain → Railway (Website) + Resend (Email)

This guide will help you:
1. ✅ Connect your GoDaddy domain to Railway (for your website)
2. ✅ Set up your domain in Resend (for sending emails)
3. ✅ Configure all DNS records correctly

---

## Prerequisites

- ✅ GoDaddy domain (e.g., `kingsmansaddlery.com`)
- ✅ Railway account with deployed app
- ✅ Resend account with API key

---

## Part 1: Connect Domain to Railway (Website)

### Step 1: Get Railway Domain Information

1. Go to [Railway Dashboard](https://railway.app)
2. Select your project
3. Click on your **client service** (frontend)
4. Go to **"Settings"** tab
5. Scroll to **"Domains"** section
6. Click **"Generate Domain"** or note your Railway domain (e.g., `your-app.up.railway.app`)

### Step 2: Add Custom Domain in Railway

1. In the **"Domains"** section, click **"Add Domain"**
2. Enter your domain (e.g., `kingsmansaddlery.com`)
3. Railway will show you DNS records to add:
   - **CNAME Record** pointing to your Railway domain
   - Or **A Record** with an IP address

**Note the values Railway gives you** - you'll need them in the next step!

### Step 3: Configure DNS in GoDaddy

1. Go to [GoDaddy.com](https://www.godaddy.com) and log in
2. Click on your name in the top right → **"My Products"**
3. Find your domain and click **"DNS"** (or the three dots → **"Manage DNS"**)

### Step 4: Add DNS Records for Railway

**⚠️ IMPORTANT**: GoDaddy does NOT allow CNAME records for the root domain (`@`). You have two options:

#### Option A: Use A Records (Recommended for Root Domain)

If Railway provides an IP address:

1. In GoDaddy DNS settings, scroll to **"Records"** section
2. Click **"Add"** button
3. Configure:
   - **Type**: Select **"A"**
   - **Name**: Enter `@` (for root domain)
   - **Value**: Enter the IP address Railway provided
   - **TTL**: Leave default (600 seconds)
4. Click **"Save"**

**If Railway only gives you a CNAME target**, you need to:
1. Get the IP address of the Railway domain (e.g., `f6da841f.up.railway.app`)
2. Use a tool like [whatsmydns.net](https://www.whatsmydns.net) or run `nslookup f6da841f.up.railway.app` to get the IP
3. Use that IP address in the A record

#### Option B: Use CNAME for www Subdomain Only

If Railway only provides a CNAME:

1. For **www subdomain** (this works):
   - **Type**: Select **"CNAME"**
   - **Name**: Enter `www` (NOT `@`)
   - **Value**: Enter the Railway domain (e.g., `f6da841f.up.railway.app`)
   - **TTL**: Leave default
   - Click **"Save"**

2. For **root domain** (`@`), you have two options:
   
   **Option 2a: Use A Record with IP** (Best)
   - Get the IP address of `f6da841f.up.railway.app` using `nslookup` or online tools
   - Add an A record: `@` → IP address
   
   **Option 2b: Redirect www to root** (Alternative)
   - Some users set up a redirect from root to www in GoDaddy
   - Go to GoDaddy → Domain Settings → Forwarding
   - Forward `yourdomain.com` to `www.yourdomain.com`

#### Option C: Contact Railway Support

If Railway only provides CNAME and you need root domain support:
- Contact Railway support to get the IP address for your domain
- Or ask if they can provide A record values instead

### Step 5: Wait for DNS Propagation

- DNS changes take **15 minutes to 48 hours** to propagate
- Usually takes **30-60 minutes**
- You can check status in Railway Dashboard → Domains

### Step 6: Verify Domain in Railway

1. Go back to Railway Dashboard
2. Check the domain status - it should show **"Active"** ✅ when ready
3. Your website should be accessible at `https://yourdomain.com`

---

## Part 2: Set Up Domain in Resend (Email)

### Step 1: Add Domain in Resend

1. Go to [Resend Dashboard](https://resend.com)
2. Log in to your account
3. Click **"Domains"** in the left sidebar
4. Click **"Add Domain"**
5. Enter your domain (e.g., `kingsmansaddlery.com`)
   - ⚠️ **Don't include** `www` or `http://` - just the domain name
6. Click **"Add"**

### Step 2: Get DNS Records from Resend

After adding your domain, Resend will show you **3 DNS records** that need to be added:

1. **TXT Record for Domain Verification**
   - Name: `@`
   - Value: A long verification string (e.g., `resend-verification=abc123...`)

2. **SPF Record (TXT)**
   - Name: `@`
   - Value: `v=spf1 include:resend.com ~all`

3. **DKIM Record (TXT)**
   - Name: `resend._domainkey` (or similar)
   - Value: A long DKIM key string

**Copy all three records** - you'll add them to GoDaddy next!

### Step 3: Add Resend DNS Records in GoDaddy

1. Go back to GoDaddy DNS settings (same place as before)
2. Scroll to **"Records"** section

#### Add Domain Verification TXT Record:

1. Click **"Add"** button
2. Configure:
   - **Type**: Select **"TXT"**
   - **Name**: Enter `@`
   - **Value**: Paste the domain verification string from Resend
   - **TTL**: Leave default (600 seconds)
3. Click **"Save"**

#### Add SPF Record:

1. Click **"Add"** button
2. Configure:
   - **Type**: Select **"TXT"**
   - **Name**: Enter `@`
   - **Value**: Enter `v=spf1 include:resend.com ~all`
   - **TTL**: Leave default
3. Click **"Save"**

#### Add DKIM Record:

1. Click **"Add"** button
2. Configure:
   - **Type**: Select **"TXT"**
   - **Name**: Enter `resend._domainkey` (exactly as Resend shows)
   - **Value**: Paste the DKIM key from Resend
   - **TTL**: Leave default
3. Click **"Save"**

### Step 4: Wait for DNS Propagation

- Wait **15-60 minutes** for DNS records to propagate
- Resend will automatically check and verify your domain

### Step 5: Verify Domain in Resend

1. Go back to Resend Dashboard → **Domains**
2. You should see your domain with status **"Pending"** or **"Verifying"**
3. Once verified, status will change to **"Verified"** ✅
4. This may take up to 48 hours, but usually happens within 1 hour

### Step 6: Choose Your Email Address

Once verified, you can use any email address on your domain:
- `noreply@kingsmansaddlery.com` (recommended for automated emails)
- `info@kingsmansaddlery.com`
- `orders@kingsmansaddlery.com`
- `support@kingsmansaddlery.com`

**Note**: You don't need to create these email addresses anywhere - Resend handles the sending!

---

## Part 3: Update Railway Environment Variables

### Step 1: Access Railway Variables

1. Go to Railway Dashboard
2. Select your project
3. Click on your **server service** (backend)
4. Go to **"Variables"** tab

### Step 2: Add/Update Environment Variables

Make sure you have these variables set:

```
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM_EMAIL=noreply@kingsmansaddlery.com
RESEND_REPLY_TO=moh12asad10@gmail.com
```

**Replace:**
- `re_your_actual_api_key_here` with your actual Resend API key
- `kingsmansaddlery.com` with your actual domain
- `moh12asad10@gmail.com` with your Gmail (for receiving replies)

### Step 3: Redeploy

After updating variables, Railway will automatically redeploy. Wait for deployment to complete.

---

## Complete DNS Records Summary

After completing all steps, your GoDaddy DNS should have these records:

### For Railway (Website):
- **CNAME** `@` → `your-app.up.railway.app` (or A record with IP)
- **CNAME** `www` → `your-app.up.railway.app` (optional, for www subdomain)

### For Resend (Email):
- **TXT** `@` → Domain verification string from Resend
- **TXT** `@` → `v=spf1 include:resend.com ~all` (SPF record)
- **TXT** `resend._domainkey` → DKIM key from Resend

**Total: 5 DNS records** (2 for Railway, 3 for Resend)

---

## Testing Your Setup

### Test Website (Railway):

1. Wait 30-60 minutes after adding DNS records
2. Visit `https://yourdomain.com` in your browser
3. Your Railway app should load!

### Test Email (Resend):

1. After domain is verified in Resend, test the email endpoint:
   ```
   GET https://your-railway-app.railway.app/api/email/test-smtp
   ```

2. You should see:
   ```json
   {
     "ok": true,
     "service": "Resend",
     "config": {
       "fromEmail": "noreply@kingsmansaddlery.com",
       "replyToEmail": "moh12asad10@gmail.com"
     }
   }
   ```

3. Place a test order in your app and verify the email is sent from your domain!

---

## Troubleshooting

### Website Not Loading

**Problem**: Domain not pointing to Railway

**Solutions:**
- Check DNS records are saved correctly in GoDaddy
- Verify CNAME/A record points to correct Railway domain
- Wait longer for DNS propagation (up to 48 hours)
- Check Railway Dashboard → Domains for status
- Try accessing via `www.yourdomain.com` if root domain doesn't work

### Domain Not Verifying in Resend

**Problem**: Resend shows domain as "Pending" or "Failed"

**Solutions:**
- Double-check all 3 TXT records are added correctly in GoDaddy
- Verify record names match exactly (especially `resend._domainkey`)
- Check record values are copied correctly (no extra spaces)
- Wait longer for DNS propagation (can take up to 48 hours)
- Use [MXToolbox](https://mxtoolbox.com) to verify DNS records are live

### Emails Not Sending

**Problem**: Emails fail to send or go to spam

**Solutions:**
- Verify domain is fully verified in Resend (status: "Verified" ✅)
- Check `RESEND_FROM_EMAIL` matches your verified domain
- Check Railway logs for error messages
- Verify `RESEND_API_KEY` is set correctly
- Check spam folder - new domains sometimes go there initially

### DNS Records Not Saving in GoDaddy

**Problem**: Can't add DNS records

**Solutions:**
- Make sure you're in the correct DNS management section
- Check if you have any existing conflicting records (remove old ones)
- Try refreshing the page and adding again
- Contact GoDaddy support if issues persist

---

## Quick Checklist

### Railway Setup:
- [ ] Added custom domain in Railway
- [ ] Got DNS records from Railway
- [ ] Added CNAME/A record in GoDaddy
- [ ] Waited for DNS propagation
- [ ] Verified domain is active in Railway
- [ ] Website loads at `https://yourdomain.com`

### Resend Setup:
- [ ] Added domain in Resend Dashboard
- [ ] Got 3 DNS records from Resend
- [ ] Added all 3 TXT records in GoDaddy
- [ ] Waited for DNS propagation
- [ ] Domain verified in Resend (status: "Verified" ✅)
- [ ] Updated Railway environment variables
- [ ] Tested email sending

---

## Important Notes

1. **DNS Propagation**: Can take 15 minutes to 48 hours. Be patient!

2. **Record Limits**: GoDaddy allows multiple TXT records with the same name (`@`), so you can have both SPF and domain verification records.

3. **Email Addresses**: You don't need to create email accounts in GoDaddy. Resend handles all email sending - you just verify domain ownership.

4. **HTTPS**: Railway automatically provides SSL certificates for custom domains.

5. **www vs Root**: You can set up both `yourdomain.com` and `www.yourdomain.com` by adding separate CNAME records.

---

## Support Resources

- **GoDaddy DNS Help**: [https://www.godaddy.com/help](https://www.godaddy.com/help)
- **Railway Docs**: [https://docs.railway.app](https://docs.railway.app)
- **Resend Docs**: [https://resend.com/docs](https://resend.com/docs)
- **DNS Checker**: [https://mxtoolbox.com](https://mxtoolbox.com)

---

**Last Updated**: 2024
**Version**: 1.0


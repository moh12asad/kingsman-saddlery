# GoDaddy DNS: What to Keep vs What to Add for Railway

Based on your current DNS records, here's exactly what to keep and what to add.

---

## ✅ KEEP These Records (Don't Delete)

### 1. NS Records (Name Servers) - **REQUIRED**
```
Type: NS
Name: @
Data: ns05.domaincontrol.com.
      ns06.domaincontrol.com.
```
- **Status**: Shows "Can't delete" / "Can't edit" - that's correct!
- **Why**: These are essential for DNS to work. Never delete them.

### 2. SOA Record (Start of Authority) - **REQUIRED**
```
Type: SOA
Name: @
Data: Primary nameserver: ns05.domaincontrol.com.
```
- **Status**: Delete is greyed out - that's correct!
- **Why**: System record required for DNS. Don't touch it.

### 3. CNAME `_domainconnect` - **OPTIONAL (Can Keep)**
```
Type: CNAME
Name: _domainconnect
Data: _domainconnect.gd.domaincontrol.com.
```
- **Status**: Can delete/edit
- **Why**: GoDaddy internal record for domain management
- **Action**: You can keep it (won't interfere) or delete it (not needed for Railway)

### 4. TXT `_dmarc` - **KEEP (For Email Security)**
```
Type: TXT
Name: _dmarc
Data: v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;
```
- **Status**: Can delete/edit
- **Why**: Email security record (DMARC policy)
- **Action**: **KEEP IT** - This helps with email deliverability. You'll update it later when you set up Resend.

---

## 🔄 MODIFY This Record

### CNAME `www` - **CHANGE TO RAILWAY**
```
Current:
Type: CNAME
Name: www
Data: kingsmansaddlery.com.  ❌ (points to itself - won't work)

Change To:
Type: CNAME
Name: www
Data: your-railway-domain.up.railway.app  ✅ (your Railway domain)
```

**Steps:**
1. Click the **pencil icon (Edit)** next to the `www` CNAME record
2. Change the **Data** value from `kingsmansaddlery.com.` to your Railway domain
   - Example: `f6da841f.up.railway.app` (get this from Railway Dashboard)
3. Click **Save**

---

## ➕ ADD These Records for Railway

### 1. A Record for Root Domain (`@`) - **REQUIRED**

**This is the most important record!**

```
Type: A
Name: @
Data: [Railway IP Address]  (e.g., 66.33.22.80)
TTL: 1 Hour (or default)
```

**How to get Railway IP:**
1. Go to Railway Dashboard → Your project → Client service → Settings → Domains
2. Add your domain: `kingsmansaddlery.com`
3. Railway will show you either:
   - An **IP address** (use this directly)
   - A **CNAME target** (e.g., `f6da841f.up.railway.app`)
   
4. If Railway gives you a CNAME target:
   - Get the IP address by running: `nslookup f6da841f.up.railway.app`
   - Or use: [whatsmydns.net](https://www.whatsmydns.net)
   - Use that IP in the A record

**Steps to Add:**
1. Click **"Add"** button in GoDaddy DNS
2. Select **Type**: `A`
3. Enter **Name**: `@`
4. Enter **Data**: Railway IP address
5. Set **TTL**: 1 Hour (or default)
6. Click **Save**

---

## 📋 Summary: Your Final DNS Configuration

After making changes, your DNS should look like this:

### Records You'll Have:

| Type | Name | Data | Action |
|------|------|------|--------|
| **NS** | `@` | `ns05.domaincontrol.com.` | ✅ Keep (can't delete) |
| **NS** | `@` | `ns06.domaincontrol.com.` | ✅ Keep (can't delete) |
| **SOA** | `@` | `Primary nameserver: ns05...` | ✅ Keep (can't delete) |
| **A** | `@` | `[Railway IP]` | ➕ **ADD THIS** |
| **CNAME** | `www` | `[Railway domain].up.railway.app` | 🔄 **MODIFY THIS** |
| **CNAME** | `_domainconnect` | `_domainconnect.gd.domaincontrol.com.` | ✅ Keep (optional) |
| **TXT** | `_dmarc` | `v=DMARC1; p=quarantine;...` | ✅ Keep (for email) |

---

## 🎯 Step-by-Step Action Plan

### Step 1: Get Railway Domain Information
1. Go to [Railway Dashboard](https://railway.app)
2. Select your project
3. Click on your **client service** (frontend)
4. Go to **Settings** → **Domains**
5. Click **"Add Domain"** or **"Generate Domain"**
6. Add: `kingsmansaddlery.com`
7. Railway will show you:
   - Either an **IP address** (use for A record)
   - Or a **CNAME target** (get IP from it)

### Step 2: Modify the `www` CNAME Record
1. In GoDaddy DNS, find the `www` CNAME record
2. Click **Edit** (pencil icon)
3. Change **Data** from `kingsmansaddlery.com.` to your Railway domain
   - Example: `f6da841f.up.railway.app`
4. Click **Save**

### Step 3: Add A Record for Root Domain
1. Click **"Add"** button
2. Configure:
   - **Type**: `A`
   - **Name**: `@`
   - **Data**: Railway IP address
   - **TTL**: 1 Hour
3. Click **Save**

### Step 4: Add www Domain in Railway (Optional but Recommended)
1. Go back to Railway Dashboard
2. In the same Domains section
3. Click **"Add Domain"** again
4. Add: `www.kingsmansaddlery.com`
5. Railway will detect the CNAME record

### Step 5: Wait for DNS Propagation
- Wait **15-60 minutes** for changes to propagate
- Check status in Railway Dashboard → Domains
- Should show **"Active"** ✅ when ready

---

## ⚠️ Important Notes

1. **No A Record Currently**: Good news - you don't have a conflicting GoDaddy A record to remove! The default parking page A record is already gone.

2. **www CNAME Issue**: Your current `www` CNAME points to `kingsmansaddlery.com.` which creates a loop. You must change it to point to Railway.

3. **Root Domain A Record**: You MUST add an A record for `@` to make `kingsmansaddlery.com` work. GoDaddy doesn't allow CNAME for root domain, so A record is required.

4. **DMARC Record**: Keep the `_dmarc` TXT record. You'll update it later when you set up Resend for email, but for now it's fine to keep it.

5. **DNS Propagation**: After adding records, it takes 15-60 minutes for changes to take effect globally.

---

## 🧪 Testing After Setup

1. **Check DNS Propagation**:
   - Visit: [whatsmydns.net](https://www.whatsmydns.net)
   - Enter: `kingsmansaddlery.com`
   - Should show your Railway IP address

2. **Test Website**:
   - Visit: `https://kingsmansaddlery.com`
   - Visit: `https://www.kingsmansaddlery.com`
   - Both should load your Railway app

3. **Check Railway Status**:
   - Railway Dashboard → Domains
   - Should show both domains as **"Active"** ✅

---

## 🆘 Troubleshooting

### Problem: "Record data is invalid" when adding A record
**Solution**: Make sure you're using an IP address (numbers like `66.33.22.80`), not a domain name.

### Problem: Railway shows "Pending" status
**Solution**: 
- Wait longer (up to 60 minutes)
- Verify A record is correct in GoDaddy
- Check DNS propagation at [whatsmydns.net](https://www.whatsmydns.net)

### Problem: www subdomain not working
**Solution**: 
- Verify CNAME record points to Railway domain (not `kingsmansaddlery.com.`)
- Make sure you added `www.kingsmansaddlery.com` in Railway Dashboard

---

## 📝 Quick Checklist

- [ ] Got Railway domain/IP from Railway Dashboard
- [ ] Modified `www` CNAME to point to Railway
- [ ] Added A record for `@` with Railway IP
- [ ] Added `www.kingsmansaddlery.com` in Railway Dashboard
- [ ] Waited 15-60 minutes for propagation
- [ ] Verified domains show "Active" in Railway
- [ ] Tested `https://kingsmansaddlery.com` works
- [ ] Tested `https://www.kingsmansaddlery.com` works

---

**Last Updated**: 2024  
**Version**: 1.0



# How to Remove GoDaddy's Default Built-in Page

When you buy a domain from GoDaddy, they automatically set up a default parking page/website builder page. You need to remove this to point your domain to your own hosting (like Railway).

---

## What GoDaddy Sets Up By Default

When you first buy a domain, GoDaddy automatically creates:

1. **A Record for "WebsiteBuilder Site"** - This points your domain to GoDaddy's parking page
2. **Sometimes other default records** - Depending on what you purchased

These default records **conflict** with your custom hosting setup and need to be removed.

---

## Step-by-Step: What to Remove

### Step 1: Access GoDaddy DNS Settings

1. Go to [GoDaddy.com](https://www.godaddy.com) and log in
2. Click on your name in the top right → **"My Products"**
3. Find your domain (e.g., `kingsmansaddlery.com`)
4. Click **"DNS"** (or click the three dots → **"Manage DNS"**)

### Step 2: Identify Records to Remove

Look for these records in your DNS settings:

#### ❌ **REMOVE THIS:**
- **Type**: `A`
- **Name**: `@` (or blank/root domain)
- **Value**: Usually an IP address (like `192.0.2.1` or similar)
- **Notes/Description**: May say "WebsiteBuilder Site" or "Parked Domain" or "Default"

**This is the record that shows GoDaddy's default page!**

#### ✅ **KEEP THESE (if they exist):**
- **NS (Name Server) records** - These are required for DNS to work
- **SOA record** - System record, don't touch
- **Any MX records** - Only if you're using GoDaddy email (otherwise remove)

### Step 3: Delete the Default A Record

1. Find the A record with name `@` that points to GoDaddy's IP
2. Click the **three dots** (⋮) next to that record
3. Click **"Delete"** or **"Remove"**
4. Confirm the deletion

### Step 4: Verify It's Removed

After deleting, your DNS records should have:
- ✅ NS records (name servers) - **Keep these**
- ✅ SOA record - **Keep this**
- ❌ **NO A record for `@` pointing to GoDaddy** - **Good!**

---

## After Removing GoDaddy's Default Page

Once you've removed the default A record, you can:

1. **Add your Railway A record** (see `GODADDY_RAILWAY_RESEND_SETUP.md`)
2. **Add your Railway CNAME record** (for www subdomain)
3. **Add Resend TXT records** (for email, if needed)

---

## Common GoDaddy Default Records to Remove

### Record 1: WebsiteBuilder A Record
```
Type: A
Name: @
Value: 192.0.2.1 (or similar GoDaddy IP)
Notes: "WebsiteBuilder Site"
Action: ❌ DELETE
```

### Record 2: Parked Domain A Record
```
Type: A
Name: @
Value: Some GoDaddy IP address
Notes: "Parked Domain" or "Default"
Action: ❌ DELETE
```

### Record 3: GoDaddy Email MX Records (if not using GoDaddy email)
```
Type: MX
Name: @
Value: mailstore1.secureserver.net (or similar)
Priority: 10
Action: ❌ DELETE (only if you're NOT using GoDaddy email)
```

---

## What Your DNS Should Look Like After Cleanup

### Before (GoDaddy Default):
```
A     @    192.0.2.1          ❌ WebsiteBuilder Site (DELETE THIS)
MX    @    mailstore1...      ❌ GoDaddy Email (DELETE if not using)
NS    @    ns1.domaincontrol.com  ✅ Keep
NS    @    ns2.domaincontrol.com  ✅ Keep
```

### After Cleanup (Ready for Railway):
```
NS    @    ns1.domaincontrol.com  ✅ Keep
NS    @    ns2.domaincontrol.com  ✅ Keep
(No A record yet - you'll add Railway's A record next)
```

### After Adding Railway:
```
A     @    66.33.22.80        ✅ Railway (your hosting)
CNAME www  f6da841f.up.railway.app  ✅ Railway www subdomain
NS    @    ns1.domaincontrol.com  ✅ Keep
NS    @    ns2.domaincontrol.com  ✅ Keep
```

---

## Important Notes

1. **Don't Delete NS Records**: Name server records are required for DNS to work. Never delete these.

2. **Don't Delete SOA Record**: The Start of Authority record is a system record. Don't touch it.

3. **MX Records**: Only delete MX records if you're NOT using GoDaddy email. If you're using Resend or another email service, you can remove GoDaddy's MX records.

4. **Multiple A Records**: You can only have ONE A record for `@`. If GoDaddy created one, you must delete it before adding your Railway A record.

5. **DNS Propagation**: After deleting, changes take 15-60 minutes to propagate. The GoDaddy page may still show briefly.

---

## Troubleshooting

### Problem: Can't Find the Default A Record

**Solution:**
- Look for any A record with name `@` or blank
- Check the value - if it's not your Railway IP, it's probably GoDaddy's default
- Look for records with notes like "WebsiteBuilder", "Parked", or "Default"

### Problem: GoDaddy Page Still Shows After Deleting

**Solution:**
- Wait 15-60 minutes for DNS propagation
- Clear your browser cache
- Try accessing in incognito/private mode
- Check DNS propagation: [whatsmydns.net](https://www.whatsmydns.net)

### Problem: Accidentally Deleted Wrong Record

**Solution:**
- Don't panic! You can always add records back
- NS records are usually auto-created by GoDaddy
- Contact GoDaddy support if you deleted something critical

---

## Quick Checklist

- [ ] Logged into GoDaddy
- [ ] Opened DNS settings for your domain
- [ ] Found the default A record (name: `@`, points to GoDaddy IP)
- [ ] Deleted the default A record
- [ ] Verified NS records are still there
- [ ] Ready to add Railway DNS records

---

## Next Steps

After removing GoDaddy's default page:

1. ✅ Follow `GODADDY_RAILWAY_RESEND_SETUP.md` to add Railway DNS records
2. ✅ Add your Railway A record for root domain
3. ✅ Add your Railway CNAME record for www subdomain
4. ✅ Add Resend TXT records (if setting up email)

---

**Last Updated**: 2024  
**Version**: 1.0





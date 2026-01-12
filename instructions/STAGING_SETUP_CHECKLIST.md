# Staging Environment Setup - Quick Checklist

Use this checklist as you go through the staging setup process. Check off each item as you complete it.

---

## 📋 Pre-Setup

- [ ] GoDaddy account ready
- [ ] Firebase account ready
- [ ] Resend account ready (or create one)
- [ ] Railway account ready
- [ ] GitHub repository access
- [ ] 2-3 hours allocated for setup

---

## 🔥 Part 1: Firebase Staging Project

- [ ] Created Firebase project: `kingsman-saddlery-staging`
- [ ] Enabled Authentication (Email/Password + Google)
- [ ] Created Firestore database
- [ ] Enabled Storage
- [ ] Created Web app in Firebase
- [ ] Copied Firebase config values (apiKey, authDomain, projectId, etc.)
- [ ] Generated service account JSON file
- [ ] Set up Firestore security rules
- [ ] Set up Storage security rules
- [ ] Added authorized domains (staging domain + railway domain)

**Firebase Values Saved:**
- [ ] Project ID: `_________________`
- [ ] Service Account Email: `_________________`
- [ ] Web App Config copied to notes

---

## 📧 Part 2: Resend Staging Email

- [ ] Created Resend account (if new)
- [ ] Created staging API key: `Kingsman Saddlery Staging`
- [ ] Copied API key (starts with `re_...`)
- [ ] Added staging domain to Resend: `staging.kingsmansaddlery.com`
- [ ] Copied 3 DNS records from Resend:
  - [ ] Domain verification TXT record
  - [ ] SPF record
  - [ ] DKIM record
- [ ] Chose staging email address: `noreply@staging.kingsmansaddlery.com`

**Resend Values Saved:**
- [ ] API Key: `_________________`
- [ ] From Email: `_________________`
- [ ] Reply-To Email: `_________________`

---

## 🚂 Part 3: Railway Staging Deployment

- [ ] Created Railway project: `Kingsman Saddlery Staging`
- [ ] Created backend service: `backend-staging`
  - [ ] Set Root Directory: `server`
  - [ ] Set Start Command: `npm start`
- [ ] Created frontend service: `frontend-staging`
  - [ ] Set Root Directory: `client`
  - [ ] Set Build Command: `npm run build`
  - [ ] Set Start Command: `npm run preview`
- [ ] Copied Railway URLs:
  - [ ] Backend URL: `_________________`
  - [ ] Frontend URL: `_________________`

---

## 🌐 Part 4: DNS Configuration

- [ ] Opened GoDaddy DNS settings
- [ ] Added CNAME for staging subdomain:
  - [ ] Name: `staging`
  - [ ] Value: Railway frontend URL
- [ ] Added 3 TXT records for Resend:
  - [ ] Domain verification TXT (Name: `staging`)
  - [ ] SPF record (Name: `staging`)
  - [ ] DKIM record (Name: `resend._domainkey.staging`)
- [ ] Waited for DNS propagation (30-60 minutes)
- [ ] Added custom domain in Railway frontend: `staging.kingsmansaddlery.com`
- [ ] Verified domain is "Active" in Railway
- [ ] Verified domain is "Verified" in Resend

---

## ⚙️ Part 5: Environment Variables

### Backend Variables (Railway):
- [ ] `FIREBASE_PROJECT_ID=kingsman-saddlery-staging`
- [ ] `FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@...iam.gserviceaccount.com`
- [ ] `FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`
- [ ] `RESEND_API_KEY=re_...`
- [ ] `RESEND_FROM_EMAIL=noreply@staging.kingsmansaddlery.com`
- [ ] `RESEND_REPLY_TO=moh12asad10@gmail.com`
- [ ] `PORT=5000`
- [ ] `NODE_ENV=staging`
- [ ] `ALLOWED_ORIGINS=https://staging.kingsmansaddlery.com,https://frontend-staging-production.up.railway.app`

### Frontend Variables (Railway):
- [ ] `VITE_FIREBASE_API_KEY=AIzaSy...`
- [ ] `VITE_FIREBASE_AUTH_DOMAIN=kingsman-saddlery-staging.firebaseapp.com`
- [ ] `VITE_FIREBASE_PROJECT_ID=kingsman-saddlery-staging`
- [ ] `VITE_FIREBASE_APP_ID=1:...:web:...`
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID=...`
- [ ] `VITE_FIREBASE_STORAGE_BUCKET=kingsman-saddlery-staging.appspot.com`
- [ ] `VITE_API_BASE_URL=https://api-staging.kingsmansaddlery.com` (or Railway URL)
- [ ] `VITE_ADMIN_EMAILS=moh12asad10@gmail.com`

- [ ] Services redeployed after adding variables

---

## ✅ Part 6: Testing & Verification

- [ ] **Firebase Connection Test:**
  - [ ] Visited `/api/test-firestore` endpoint
  - [ ] Received success response
  - [ ] Service account email matches

- [ ] **Email Service Test:**
  - [ ] Visited `/api/email/test-smtp` endpoint
  - [ ] Received success response
  - [ ] Config shows correct from/reply-to emails

- [ ] **Frontend Access:**
  - [ ] Staging frontend loads: `https://staging.kingsmansaddlery.com`
  - [ ] No console errors
  - [ ] Products load (if data exists)

- [ ] **Authentication:**
  - [ ] Google Sign-In works
  - [ ] User can sign in successfully
  - [ ] Profile displays correctly

- [ ] **Order Email:**
  - [ ] Placed test order
  - [ ] Email received
  - [ ] Email from correct address
  - [ ] Email content is correct
  - [ ] Logo displays

- [ ] **Admin Panel:**
  - [ ] Admin can access `/admin`
  - [ ] Admin features work
  - [ ] No unauthorized access

- [ ] **File Uploads:**
  - [ ] Can upload product images
  - [ ] Images appear in Storage
  - [ ] Images display in frontend

---

## 🎯 Final Verification

- [ ] All services are running
- [ ] No errors in Railway logs
- [ ] All DNS records propagated
- [ ] All environment variables set correctly
- [ ] All tests passed
- [ ] Credentials saved securely
- [ ] Documentation complete

---

## 📝 Notes Section

**Staging URLs:**
- Frontend: `_________________`
- Backend: `_________________`

**Firebase Console:**
- URL: `_________________`

**Resend Dashboard:**
- Domain Status: `_________________`

**Issues Encountered:**
- `_________________`
- `_________________`

**Solutions Applied:**
- `_________________`
- `_________________`

---

## 🚀 Ready for Production!

Once all items are checked, your staging environment is ready! Use it to:
- Test all features before production
- Train team members
- Demo to stakeholders
- Final bug fixes

**Next Step:** Follow the same process for production environment setup.

---

**Date Completed:** `_________________`
**Completed By:** `_________________`


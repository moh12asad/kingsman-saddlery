# Apple Sign-In Setup - Simple Step-by-Step Guide

Follow these steps **in order**. Check each box as you complete it.

---

## ✅ STEP 1: Get Your Apple Team ID

1. Go to: https://developer.apple.com/account/
2. Sign in with your Apple Developer account
3. Look at the **top right corner** of the page
4. You'll see your **Team ID** (10 characters like: `ABC123DEFG`)
5. **Write it down** or copy it - you'll need it later

**✅ Check this box when done: [ ]**

---

## ✅ STEP 2: Create an App ID (Required!)

**Why?** Apple requires this even if you don't have an iOS app.

1. On the same page (https://developer.apple.com/account/)
2. Click **"Certificates, Identifiers & Profiles"** in the left sidebar
3. Click **"Identifiers"** in the left sidebar (under Certificates, Identifiers & Profiles)
4. Click the **"+"** button (top left, blue button)
5. Select **"App IDs"** → Click **"Continue"**
6. Select **"App"** → Click **"Continue"**
7. Fill in:
   - **Description**: Type `Kingsman Saddlery Web App`
   - **Bundle ID**: 
     - Select **"Explicit"**
     - Type: `com.moh12asad.webapp`
8. Click **"Continue"** → Click **"Register"**
9. **Done!** You now have an App ID

**✅ Check this box when done: [ ]**

---

## ✅ STEP 3: Create a Services ID

1. Still on the **Identifiers** page
2. Click the **"+"** button again (top left)
3. Select **"Services IDs"** → Click **"Continue"**
4. Fill in:
   - **Description**: Type `Kingsman Saddlery Sign In`
   - **Identifier**: Type `com.moh12asad.signin`
5. Click **"Continue"** → Click **"Register"**
6. **Done!** You now have a Services ID

**✅ Check this box when done: [ ]**

---

## ✅ STEP 4: Configure the Services ID

1. Click on the Services ID you just created (`com.moh12asad.signin`)
2. Check the box next to **"Sign in with Apple"**
3. Click **"Configure"** (button next to "Sign in with Apple")

### 4A. Primary App ID
- In the dropdown, select the App ID you created in Step 2
- It should be: `com.moh12asad.webapp`

### 4B. Website URLs
- **Domains and Subdomains**: Type `kingsman-saddlery-dev.firebaseapp.com`
  - ⚠️ **IMPORTANT**: This MUST be your Firebase auth domain (NOT your personal domain)
  - This is where Firebase handles authentication
- **Return URLs**: Click **"+"** and type: `https://kingsman-saddlery-dev.firebaseapp.com/__/auth/handler`
  - ⚠️ **IMPORTANT**: Use your Firebase domain here, not your personal domain
- Click **"Done"** (important!)

### 4C. Save
- Click **"Continue"** (bottom right)
- Click **"Save"** (top right)
- **Done!** Your Services ID is now configured

**✅ Check this box when done: [ ]**

---

## ✅ STEP 5: Create a Key

1. Still in Apple Developer, click **"Keys"** in the left sidebar (under Certificates, Identifiers & Profiles)
2. Click the **"+"** button (top left)
3. Fill in:
   - **Key Name**: Type `Kingsman Saddlery Sign In Key`
   - **Enable**: Check the box for **"Sign in with Apple"**
4. Click **"Continue"** → Click **"Register"**
5. **IMPORTANT**: Click **"Download"** to download the key file
   - ⚠️ **You can only download this ONCE!**
   - Save the file somewhere safe (it ends in `.p8`)
   - The file name will be like: `AuthKey_ABC123DEFG.p8`
6. **Note the Key ID** shown on the page (like `ABC123DEFG`)
   - Write it down - you'll need it

**✅ Check this box when done: [ ]**

---

## ✅ STEP 6: Configure Firebase

1. Go to: https://console.firebase.google.com/
2. Select your project: **kingsman-saddlery-dev** (or your project name)
3. Click **"Authentication"** in the left menu
4. Click **"Sign-in method"** tab
5. Find **"Apple"** in the list and click on it
6. Toggle **"Enable"** to **ON** (green)
7. Fill in the form:

   **Services ID**: 
   - Type: `com.moh12asad.signin`
   
   **Apple team ID**:
   - Type your Team ID from Step 1 (like `ABC123DEFG`)
   
   **Key ID**:
   - Type the Key ID from Step 5 (like `ABC123DEFG`)
   
   **Private key**:
   - Click **"Choose File"**
   - Select the `.p8` file you downloaded in Step 5

8. Click **"Save"** (bottom of the page)
9. **Done!** Apple Sign-In is now enabled

**✅ Check this box when done: [ ]**

---

## ✅ STEP 7: Test It!

1. Go to your website's Sign In page
2. You should see a **"Continue with Apple"** button
3. Click it to test
4. If it works, you're all set! 🎉

**✅ Check this box when done: [ ]**

---

## 🆘 Troubleshooting

### If Save button is disabled in Step 4:
- Make sure you selected a Primary App ID (from Step 2)
- Make sure you clicked "Done" after entering website URLs
- Make sure there are no red error messages

### If you can't find "Identifiers":
- Make sure you clicked "Certificates, Identifiers & Profiles" first
- Then click "Identifiers" in the left sidebar

### If you get errors in Firebase:
- Double-check all IDs match exactly (case-sensitive)
- Make sure the .p8 file was uploaded correctly
- Verify your Team ID is correct

---

## 📝 Quick Reference - What You Need

Write these down as you go:

- **Team ID**: _________________ (from Step 1)
- **App ID**: `com.moh12asad.webapp` (from Step 2)
- **Services ID**: `com.moh12asad.signin` (from Step 3)
- **Key ID**: _________________ (from Step 5)
- **Key File**: _________________ (from Step 5, the .p8 file)

---

## ✅ Final Checklist

- [ ] Step 1: Got Team ID
- [ ] Step 2: Created App ID
- [ ] Step 3: Created Services ID
- [ ] Step 4: Configured Services ID (with App ID and website URLs)
- [ ] Step 5: Created Key and downloaded .p8 file
- [ ] Step 6: Configured Firebase with all the information
- [ ] Step 7: Tested Apple Sign-In button

**If all boxes are checked, you're done! 🎉**


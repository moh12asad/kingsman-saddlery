# Apple Sign-In Setup Guide

This guide will walk you through setting up Sign in with Apple for your Firebase Authentication.

## Prerequisites

1. **Apple Developer Account** - You need an active Apple Developer Program membership ($99/year)
   - Sign up at: https://developer.apple.com/programs/
   - If you don't have one, you'll need to enroll first

2. **Firebase Project** - Your Firebase project should already be set up

## Understanding the Services ID Identifier

**What is it?**
The Services ID identifier is a unique string that Apple uses to identify your Sign in with Apple service. Think of it like a unique ID number, but in a specific format.

**Format Required:**
- Must be in **reverse-DNS format** (backwards domain format)
- Format: `com.yourcompany.yourproject.signin`
- Use **lowercase letters only**
- Use **dots (.)** to separate parts
- **No spaces, no special characters** (except dots)

**How to Create One:**
1. **If you have a website domain:**
   - Example: If your site is `kingsmansaddlery.com`
   - Reverse it: `com.kingsmansaddlery`
   - Add purpose: `com.kingsmansaddlery.signin`

2. **If you don't have a domain:**
   - Use your business name (lowercase, no spaces)
   - Example: "Kingsman Saddlery" → `kingsmansaddlery`
   - Format: `com.kingsmansaddlery.signin`

3. **Make it unique:**
   - Add your project name if needed: `com.kingsmansaddlery.webapp.signin`
   - Or add a suffix: `com.kingsmansaddlery.firebase.signin`

**Examples:**
- ✅ `com.kingsmansaddlery.signin` (good)
- ✅ `com.kingsmansaddlery.webapp.signin` (good)
- ✅ `com.yourcompany.firebaseauth` (good)
- ❌ `Kingsman Saddlery Sign In` (wrong - has spaces and capitals)
- ❌ `kingsman-saddlery-signin` (wrong - has hyphens)
- ❌ `kingsmansaddlery` (wrong - missing the `com.` prefix)

**Important:** This is just an identifier - it doesn't need to be a real domain. Apple just uses this format to ensure uniqueness.

## Step-by-Step Setup

### Step 1: Get Your Apple Team ID

1. Go to https://developer.apple.com/account/
2. Sign in with your Apple Developer account
3. Look at the top right corner - you'll see your **Team ID** (it's a 10-character alphanumeric string like `ABC123DEFG`)
4. **Write this down** - you'll need it for Firebase

### Step 2: Create a Services ID

1. Go to https://developer.apple.com/account/resources/identifiers/list/serviceId
2. Click the **+** button (top left) to create a new identifier
3. Select **Services IDs** and click **Continue**
4. Fill in the form:
   - **Description**: Enter a description (e.g., "Kingsman Saddlery Sign In")
   - **Identifier**: Enter a unique identifier in reverse-DNS format
     - **Format**: `com.yourcompany.yourproject.signin` or `com.yourdomain.signin`
     - **Examples**:
       - If your website is `kingsmansaddlery.com` → use `com.kingsmansaddlery.signin`
       - If your business name is "Kingsman Saddlery" → use `com.kingsmansaddlery.signin`
       - If you don't have a domain → use `com.kingsmansaddlery.webapp.signin`
     - **Important**: 
       - Use lowercase letters only
       - Use dots (.) to separate parts
       - Make it unique to your business
       - This is just an identifier - it doesn't need to match a real domain
   - **Note**: This identifier must be unique across all Apple Developer accounts
5. Click **Continue**, then **Register**

### Step 3: Configure the Services ID for Sign in with Apple

1. Click on the Services ID you just created
2. Check the box next to **Sign in with Apple**
3. Click **Configure** (next to "Sign in with Apple")
4. In the configuration window:
   
   **Primary App ID**: 
   - If you have an iOS app, select it from the dropdown
   - If you don't have an iOS app, you can skip this or create a placeholder App ID
   
   **Website URLs**:
   - **Domains and Subdomains**: Enter your Firebase Auth domain
     - Example: `kingsman-saddlery.firebaseapp.com`
     - To find this: Firebase Console → Authentication → Settings → Authorized domains
   
   **Return URLs**:
   - Click **+** to add a return URL
   - Enter: `https://YOUR_AUTH_DOMAIN/__/auth/handler`
     - Replace `YOUR_AUTH_DOMAIN` with your actual Firebase Auth domain
     - Example: `https://kingsman-saddlery.firebaseapp.com/__/auth/handler`
   - Click **Save**

5. Click **Continue** in the configuration window
6. Click **Save** to save the Services ID configuration

### Step 4: Create a Key for Sign in with Apple

1. Go to https://developer.apple.com/account/resources/authkeys/list
2. Click the **+** button (top left) to create a new key
3. Fill in the form:
   - **Key Name**: Enter a name (e.g., "Kingsman Saddlery Sign In Key")
   - **Enable**: Check **Sign in with Apple**
4. Click **Continue**, then **Register**
5. **IMPORTANT**: Click **Download** to download the key file (.p8)
   - ⚠️ **You can only download this key ONCE** - save it securely!
   - The file will be named something like `AuthKey_ABC123DEFG.p8`
6. **Note the Key ID** - it's displayed on the page (e.g., `ABC123DEFG`)
   - Write this down - you'll need it for Firebase

### Step 5: Configure Firebase Authentication

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project (kingsman-saddlery)
3. Go to **Authentication** → **Sign-in method**
4. Find **Apple** in the list and click on it
5. Toggle **Enable** to ON
6. Fill in the configuration:
   
   **OAuth code flow configuration**:
   - **Services ID**: Enter the Services ID you created in Step 2
     - Example: `com.kingsmansaddlery.signin`
   
   **Apple team ID**:
   - Enter your Team ID from Step 1
     - Example: `ABC123DEFG`
   
   **Key ID**:
   - Enter the Key ID from Step 4
     - Example: `ABC123DEFG`
   
   **Private key**:
   - Click **Choose File** and upload the .p8 key file you downloaded in Step 4
     - The file should be named something like `AuthKey_ABC123DEFG.p8`

7. Click **Save**

### Step 6: Verify Configuration

1. In Firebase Console, the Apple provider should now show as **Enabled** (green checkmark)
2. Test the sign-in:
   - Go to your app's Sign In page
   - Click the "Continue with Apple" button
   - You should see the Apple Sign-In popup

## Troubleshooting

### Common Issues

**Issue: "Invalid client" error**
- **Solution**: Double-check that your Services ID, Team ID, and Key ID are correct
- Make sure the return URL in Apple Developer Console matches exactly: `https://YOUR_AUTH_DOMAIN/__/auth/handler`

**Issue: "Configuration not found" error**
- **Solution**: 
  - Verify Apple Sign-In is enabled in Firebase Console
  - Check that all fields are filled correctly
  - Make sure the .p8 key file was uploaded correctly

**Issue: Popup doesn't appear**
- **Solution**:
  - Apple Sign-In works best in Safari browser
  - In other browsers, it may redirect instead of showing a popup
  - Make sure popups are not blocked

**Issue: "The operation couldn't be completed"**
- **Solution**:
  - Verify your Apple Developer account is active
  - Check that Sign in with Apple is enabled for your Services ID
  - Ensure the domain is correctly configured in Apple Developer Console

### Finding Your Firebase Auth Domain

1. Go to Firebase Console → Authentication → Settings
2. Scroll down to **Authorized domains**
3. Your auth domain will be listed there (e.g., `kingsman-saddlery.firebaseapp.com`)

## Testing Checklist

- [ ] Apple Developer account is active
- [ ] Services ID created and configured
- [ ] Key created and downloaded (.p8 file)
- [ ] Firebase Console configured with all credentials
- [ ] Apple Sign-In enabled in Firebase
- [ ] Test sign-in on Sign In page
- [ ] Test sign-in on Sign Up page

## Security Notes

1. **Keep your .p8 key file secure** - treat it like a password
2. **Don't commit the key file to Git** - add it to `.gitignore`
3. **Store credentials securely** - consider using a password manager
4. **Rotate keys periodically** - create new keys if you suspect compromise

## Additional Resources

- Apple Documentation: https://developer.apple.com/sign-in-with-apple/
- Firebase Apple Auth Docs: https://firebase.google.com/docs/auth/web/apple
- Apple Developer Portal: https://developer.apple.com/account/

## Need Help?

If you encounter issues:
1. Check the browser console for error messages
2. Check Firebase Console → Authentication → Users for any error logs
3. Verify all IDs match exactly (case-sensitive)
4. Ensure your Apple Developer account is in good standing


# Email Authentication Troubleshooting

## Current Error: "Username and Password not accepted" (535)

This error means Gmail is rejecting your credentials. Here's how to fix it:

## ✅ Step-by-Step Fix

### 1. Verify 2-Step Verification is Enabled
- Go to: https://myaccount.google.com/security
- Check if "2-Step Verification" shows as **ON**
- If OFF, enable it first (this is required for App Passwords)

### 2. Generate a NEW App Password
- Go to: https://myaccount.google.com/apppasswords
- If you don't see this page, 2-Step Verification is not enabled
- Select:
  - **App**: Mail
  - **Device**: Other (Custom name)
  - **Name**: Kingsman Saddlery
- Click **Generate**
- **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

### 3. Update `.env` File
Make sure your `server/.env` file has:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-actual-email@gmail.com
SMTP_PASS=abcdefghijklmnop
```

**Critical Checks:**
- ✅ `SMTP_USER` = Your **full Gmail address** (e.g., `moh12asad.jobs@gmail.com`)
- ✅ `SMTP_PASS` = The **16-character App Password** (spaces will be removed automatically)
- ❌ **NOT** your regular Gmail password
- ❌ **NOT** your Google account password

### 4. Restart Server
After updating `.env`, **restart your server completely**:
```bash
# Stop server (Ctrl+C)
cd server
npm run dev
```

## 🔍 Common Mistakes

1. **Using regular password instead of App Password**
   - ❌ Wrong: Your Gmail login password
   - ✅ Right: 16-character App Password from Google

2. **Wrong email address**
   - Make sure `SMTP_USER` matches the Gmail account where you generated the App Password

3. **2-Step Verification not enabled**
   - App Passwords only work if 2-Step Verification is ON

4. **Old/expired App Password**
   - Generate a new one if you're not sure

## 🧪 Alternative: Use Mailtrap for Testing

If Gmail continues to give issues, use **Mailtrap** for testing (emails are captured, not sent):

### Setup Mailtrap:

1. **Sign up** (free): https://mailtrap.io
2. **Get credentials**:
   - Go to "Email Testing" → "Inboxes" → Select your inbox
   - Copy the SMTP credentials

3. **Update `.env`**:
   ```env
   SMTP_HOST=sandbox.smtp.mailtrap.io
   SMTP_PORT=2525
   SMTP_SECURE=false
   SMTP_USER=your-mailtrap-username
   SMTP_PASS=your-mailtrap-password
   ```

4. **Restart server** and test

Mailtrap is great for development because:
- ✅ No App Passwords needed
- ✅ Emails are captured (not actually sent)
- ✅ Easy to see/test email templates
- ✅ Free tier available

## 🔄 Quick Test

After updating credentials, test by:
1. Going to your checkout page
2. Clicking "Proceed to Payment"
3. Check server logs for success/error
4. If using Mailtrap, check your inbox there
5. If using Gmail, check your email inbox

## Still Not Working?

1. **Double-check** your `.env` file is in `server/` directory
2. **Verify** the file is named exactly `.env` (with the dot)
3. **Check** there are no extra spaces or quotes around values
4. **Try** generating a new App Password
5. **Consider** using Mailtrap for easier testing


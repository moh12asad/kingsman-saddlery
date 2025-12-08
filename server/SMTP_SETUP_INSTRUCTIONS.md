# SMTP Email Configuration - Step by Step Guide

## Quick Setup

You need to create a `.env` file in the `server/` directory with your email credentials.

## Step 1: Create the `.env` file

1. Navigate to the `server/` folder
2. Create a new file named `.env` (note the dot at the beginning)
3. Copy the contents from `.env.example` or use the template below

## Step 2: Configure Gmail SMTP (Recommended for Development)

### Option A: Using Gmail with App Password

1. **Enable 2-Step Verification** on your Google Account:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable "2-Step Verification" if not already enabled

2. **Generate an App Password**:
   - Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Other (Custom name)"
   - Enter "Kingsman Saddlery" as the name
   - Click "Generate"
   - **Copy the 16-character password** (it will look like: `abcd efgh ijkl mnop`)

3. **Add to your `.env` file**:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-actual-email@gmail.com
   SMTP_PASS=abcdefghijklmnop
   ```
   
   **Important**: 
   - Replace `your-actual-email@gmail.com` with your actual Gmail address
   - Replace `abcdefghijklmnop` with the 16-character app password (remove spaces if any)
   - Do NOT use your regular Gmail password - it won't work!

### Example `.env` file:

```env
PORT=5000
NODE_ENV=development
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=moh12asad.jobs@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
```

## Step 3: Test the Configuration

1. Restart your server:
   ```bash
   cd server
   npm run dev
   ```

2. Try to place an order and click "Proceed to Payment"
3. Check your email inbox for the order confirmation

## Alternative Email Services

### Using Mailtrap (For Testing)

Mailtrap is great for development - emails are captured and not actually sent:

1. Sign up at [mailtrap.io](https://mailtrap.io) (free tier available)
2. Go to "Email Testing" → "Inboxes" → Select your inbox
3. Copy the SMTP credentials
4. Add to `.env`:
   ```env
   SMTP_HOST=sandbox.smtp.mailtrap.io
   SMTP_PORT=2525
   SMTP_SECURE=false
   SMTP_USER=your-mailtrap-username
   SMTP_PASS=your-mailtrap-password
   ```

### Using SendGrid

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create an API key
3. Add to `.env`:
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASS=your-sendgrid-api-key
   ```

## Troubleshooting

### "Email service not configured" warning
- Make sure your `.env` file is in the `server/` directory
- Check that `SMTP_USER` and `SMTP_PASS` are set
- Restart your server after adding/changing `.env` values

### Gmail authentication errors
- Make sure you're using an **App Password**, not your regular password
- Verify 2-Step Verification is enabled
- Check that the app password doesn't have spaces

### Connection timeout
- Verify `SMTP_HOST` and `SMTP_PORT` are correct
- Check your firewall/network settings
- Try using Mailtrap for testing if Gmail doesn't work

## Security Notes

⚠️ **Important**: 
- Never commit your `.env` file to Git
- The `.env` file should already be in `.gitignore`
- For production, use environment variables provided by your hosting service (Railway, Render, etc.)













# Email Service Setup

This application uses Nodemailer to send order confirmation emails.

## Configuration

Add the following environment variables to your `.env` file in the `server/` directory:

### Option 1: Gmail (Recommended for Development)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**Note for Gmail:**
- You'll need to use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular Gmail password
- Enable 2-Step Verification on your Google account first
- Generate an App Password: Google Account → Security → 2-Step Verification → App Passwords

### Option 2: SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Option 3: Custom SMTP Server

```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASS=your-password
```

### Option 4: Mailtrap (Testing)

For development and testing, you can use [Mailtrap](https://mailtrap.io):

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
```

## Testing

1. Install dependencies:
   ```bash
   cd server
   npm install
   ```

2. Set up your `.env` file with the SMTP credentials

3. The email service will automatically be used when:
   - User clicks "Proceed to Payment" on the order confirmation page
   - Order is completed and paid (after Tranzilla integration)

## Email Template

The order confirmation email includes:
- Order number
- Customer name and email
- Order items with images, quantities, and prices
- Shipping address
- Order total
- Order status

The template is located in `server/lib/emailService.js` and can be customized as needed.

## Troubleshooting

- **Email not sending**: Check that all SMTP environment variables are set correctly
- **Gmail authentication errors**: Make sure you're using an App Password, not your regular password
- **Connection timeout**: Verify your SMTP host and port are correct
- **Check server logs**: The email service logs errors to the console











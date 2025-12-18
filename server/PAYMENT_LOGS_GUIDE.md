# Payment Logs Guide

## Overview

All payment-related operations are logged with the `[PAYMENT]` prefix for easy filtering. Logs include comprehensive details about payment requests, calculations, validations, and processing - **without any card details** for security.

## Log Format

All payment logs follow this format:
```
[PAYMENT] [REQUEST_ID] Log Message: { details }
```

**Request IDs**:
- `CALC-*` - Calculate Total requests
- `PAY-*` - Payment Process requests

## What Gets Logged

### ✅ Logged Information

- User ID and email
- Request timestamps
- Payment amounts and currency
- Discount calculations and eligibility
- Tax and delivery costs
- Transaction IDs
- Request duration
- IP addresses
- User agents
- Validation results
- Error messages and stack traces

### ❌ NOT Logged (Security)

- Card numbers
- CVV codes
- Card holder names
- Expiration dates
- Any sensitive payment credentials

## Finding Logs in Deployment

### Option 1: Platform Logs (Recommended)

#### Render.com
1. Go to your Render dashboard
2. Select your service
3. Click on **"Logs"** tab
4. Filter by searching: `[PAYMENT]`
5. **Log File**: Logs are streamed in real-time in the Render dashboard

**Command to view logs**:
```bash
# If you have CLI access
render logs --service your-service-name --filter "[PAYMENT]"
```

#### Railway
1. Go to your Railway project
2. Select your service
3. Click on **"Deployments"** → Select deployment → **"View Logs"**
4. Filter by searching: `[PAYMENT]`
5. **Log File**: Logs are available in Railway dashboard under "Logs" tab

**Command to view logs**:
```bash
# If you have Railway CLI
railway logs --filter "[PAYMENT]"
```

#### Heroku
1. Go to your Heroku dashboard
2. Select your app
3. Click on **"More"** → **"View logs"**
4. Filter by searching: `[PAYMENT]`
5. **Log File**: Logs are streamed in Heroku dashboard

**Command to view logs**:
```bash
heroku logs --tail --app your-app-name | grep "\[PAYMENT\]"
```

#### Vercel / Netlify
- Logs are available in the platform dashboard
- Use the search/filter function with `[PAYMENT]`
- **Note**: Serverless functions may have different log retention policies

#### DigitalOcean App Platform
1. Go to your App Platform dashboard
2. Select your app
3. Click on **"Runtime Logs"**
4. Filter by: `[PAYMENT]`

#### AWS / Google Cloud / Azure
- Check your platform's logging service:
  - **AWS**: CloudWatch Logs
  - **Google Cloud**: Cloud Logging
  - **Azure**: Application Insights / Log Analytics
- Search for: `[PAYMENT]`

### Option 2: Server Logs (If Custom Setup)

If you're running your own server or have custom logging configured:

#### Standard Output (stdout/stderr)
Logs are written to `stdout` and `stderr` using `console.log()` and `console.error()`.

**Where to find**:
- If using PM2: `~/.pm2/logs/`
- If using systemd: `journalctl -u your-service-name`
- If using Docker: `docker logs container-name`
- If using Node.js directly: Check where stdout/stderr are redirected

#### Custom Log Files
If you've configured custom logging (e.g., Winston, Pino, Bunyan):

**Common locations**:
- `logs/payment.log`
- `logs/app.log`
- `/var/log/your-app/payment.log`
- `./server/logs/payment.log`

**To find your log file**:
1. Check your server startup script
2. Check environment variables for `LOG_FILE` or similar
3. Check your logging library configuration
4. Check `package.json` scripts

### Option 3: Real-time Monitoring

#### Using `tail` command (if you have server access):
```bash
# Follow logs in real-time
tail -f /path/to/logs/app.log | grep "\[PAYMENT\]"

# Or if logs go to stdout
pm2 logs | grep "\[PAYMENT\]"
```

#### Using log aggregation tools:
- **Datadog**: Search for `[PAYMENT]` in logs
- **Sentry**: Filter by tag `payment`
- **LogRocket**: Search for `[PAYMENT]`
- **New Relic**: Query logs with `message LIKE '%[PAYMENT]%'`

## Log Examples

### Calculate Total Request
```
[PAYMENT] [CALC-1234567890-abc123] Calculate Total Request Started
[PAYMENT] [CALC-1234567890-abc123] User: user123 (user@example.com)
[PAYMENT] [CALC-1234567890-abc123] Timestamp: 2024-01-15T10:30:00.000Z
[PAYMENT] [CALC-1234567890-abc123] Input Data: { subtotal: 250, tax: 0, deliveryCost: 50 }
[PAYMENT] [CALC-1234567890-abc123] Discount Eligibility: { eligible: true, percentage: 5 }
[PAYMENT] [CALC-1234567890-abc123] Discount Applied: { percentage: 5, amount: 12.5 }
[PAYMENT] [CALC-1234567890-abc123] Calculation Breakdown: { total: 287.5 }
[PAYMENT] [CALC-1234567890-abc123] Calculate Total Success: { total: 287.5, durationMs: 45 }
```

### Payment Process Request
```
[PAYMENT] [PAY-1234567890-xyz789] Payment Process Request Started
[PAYMENT] [PAY-1234567890-xyz789] User: user123 (user@example.com)
[PAYMENT] [PAY-1234567890-xyz789] IP Address: 192.168.1.1
[PAYMENT] [PAY-1234567890-xyz789] Payment Request Data: { amount: 287.5, currency: 'ILS' }
[PAYMENT] [PAY-1234567890-xyz789] Amount Validation: { isValid: true }
[PAYMENT] [PAY-1234567890-xyz789] Payment Process Success: { transactionId: 'TXN-...', durationMs: 120 }
```

### Error Example
```
[PAYMENT] [PAY-1234567890-xyz789] [SECURITY ALERT] Payment amount mismatch!
[PAYMENT] [PAY-1234567890-xyz789] Payment Process Error: { error: '...', durationMs: 50 }
```

## Filtering Logs

### By Request Type
- **Calculate Total**: `[PAYMENT] [CALC-`
- **Payment Process**: `[PAYMENT] [PAY-`

### By User
- Search for: `User: user123`

### By Transaction ID
- Search for: `transactionId: TXN-...`

### By Status
- **Success**: `Success:`
- **Error**: `Error:` or `[SECURITY ALERT]`
- **Validation**: `Validation failed:`

### By Time Range
Most platforms allow filtering by timestamp. Look for logs with:
- `Timestamp: 2024-01-15T10:30:00.000Z`

## Log Retention

Log retention depends on your hosting platform:

- **Render**: 7 days (free), 30 days (paid)
- **Railway**: 7 days (free), varies (paid)
- **Heroku**: 1500 lines (free), 7 days (paid)
- **Vercel**: 7 days
- **Custom servers**: Depends on your configuration

**Recommendation**: Set up log aggregation (Datadog, Sentry, etc.) for long-term storage and analysis.

## Monitoring Payment Logs

### Key Metrics to Monitor

1. **Payment Success Rate**
   - Count: `Payment Process Success`
   - Count: `Payment Process Error`
   - Calculate: Success / (Success + Error)

2. **Amount Mismatches**
   - Search for: `[SECURITY ALERT] Payment amount mismatch`
   - These indicate potential security issues

3. **Discount Application**
   - Search for: `Discount Applied`
   - Monitor discount usage

4. **Processing Time**
   - Look for: `durationMs`
   - Monitor for performance issues

5. **Error Rate**
   - Search for: `Error:`
   - Track common error patterns

## Troubleshooting

### Can't Find Logs?

1. **Check your platform's documentation** for log locations
2. **Verify logging is enabled** in your deployment
3. **Check if logs are being filtered** by your platform
4. **Try searching without brackets**: `PAYMENT` instead of `[PAYMENT]`
5. **Check different log levels**: Some platforms separate error logs

### Logs Not Appearing?

1. **Verify the code is deployed** (check git commit)
2. **Check if the endpoint is being called** (look for HTTP request logs)
3. **Verify authentication** (logs only appear for authenticated requests)
4. **Check for errors** in server startup logs

### Need More Details?

If you need additional logging:
1. Check `server/routes/payment.js` for log statements
2. Add custom log statements as needed
3. Remember: **Never log card details**

## Security Notes

- ✅ All logs are sanitized (no card details)
- ✅ User IDs are logged (for debugging)
- ✅ IP addresses are logged (for security)
- ✅ Transaction IDs are logged (for tracking)
- ❌ Card numbers are NEVER logged
- ❌ CVV codes are NEVER logged
- ❌ Card holder names are NEVER logged

## Quick Reference

**Log Prefix**: `[PAYMENT]`  
**Calculate Total ID**: `CALC-*`  
**Payment Process ID**: `PAY-*`  
**Transaction ID Format**: `TXN-*`  

**Platform Log Locations**:
- Render: Dashboard → Service → Logs tab
- Railway: Dashboard → Service → Logs tab
- Heroku: Dashboard → App → View logs
- Custom: Check your logging configuration

---

**Last Updated**: 2024  
**Version**: 1.0


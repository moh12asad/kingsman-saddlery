// Email service using nodemailer and Resend
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { db } from "./firebaseAdmin.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Security: HTML escaping function to prevent XSS attacks
function escapeHtml(text) {
  if (text == null || text === undefined) return '';
  const str = String(text);
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return str.replace(/[&<>"']/g, m => map[m]);
}

// Security: Validate and sanitize email address to prevent injection
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Email is required and must be a string');
  }
  const trimmed = email.trim().toLowerCase();
  // Check for email format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    throw new Error('Invalid email format');
  }
  // Check for injection attempts (newlines, carriage returns)
  if (/[\r\n]/.test(trimmed)) {
    throw new Error('Email contains invalid characters');
  }
  return trimmed;
}

// Security: Sanitize email subject lines (plain text, not HTML)
// Remove newlines and control characters, but don't HTML escape
function sanitizeSubject(subject) {
  if (!subject || typeof subject !== 'string') return '';
  // Remove newlines, carriage returns, and other control characters
  // Limit length to prevent header injection
  return subject
    .replace(/[\r\n\t]/g, ' ')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .substring(0, 200); // RFC 5322 recommends max 78 chars, but we allow more for modern clients
}

/**
 * Get logo attachment for emails
 */
function getLogoAttachment() {
  try {
    const logoPath = path.join(__dirname, '../../client/public/kingsman-saddlery-logo.png');
    
    // Check if file exists
    if (!fs.existsSync(logoPath)) {
      console.warn(`[EMAIL] Logo file not found at ${logoPath}`);
      return null;
    }
    
    return {
      filename: 'kingsman-saddlery-logo.png',
      path: logoPath,
      cid: 'logo' // Content-ID for referencing in HTML
    };
  } catch (error) {
    console.error('[EMAIL] Error getting logo attachment:', error);
    return null;
  }
}

/**
 * Get logo attachment as base64 for Resend
 */
function getLogoAttachmentBase64() {
  try {
    const logoPath = path.join(__dirname, '../../client/public/kingsman-saddlery-logo.png');
    
    // Check if file exists
    if (!fs.existsSync(logoPath)) {
      console.warn(`[EMAIL] Logo file not found at ${logoPath}`);
      return null;
    }
    
    const fileBuffer = fs.readFileSync(logoPath);
    const base64Content = fileBuffer.toString('base64');
    
    return {
      filename: 'kingsman-saddlery-logo.png',
      content: base64Content,
      cid: 'logo'
    };
  } catch (error) {
    console.error('[EMAIL] Error getting logo attachment (base64):', error);
    return null;
  }
}

// Create reusable transporter and Resend client
let transporter = null;
let resendClient = null;

/**
 * Check if Resend is configured
 */
export function isResendConfigured() {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Get Resend client instance
 */
export function getResendClient() {
  if (resendClient) {
    return resendClient;
  }

  if (!isResendConfigured()) {
    return null;
  }

  resendClient = new Resend(process.env.RESEND_API_KEY);
  console.log(`[EMAIL] Resend client created successfully`);
  return resendClient;
}

export function getTransporter() {
  if (transporter) {
    return transporter;
  }

  // If Resend is configured, we don't need SMTP transporter
  if (isResendConfigured()) {
    console.log(`[EMAIL] Resend is configured, skipping SMTP transporter creation`);
    return null;
  }

  // Detect hosting environment
  const isRender = process.env.RENDER === 'true' || process.env.RENDER_SERVICE_ID !== undefined;
  const isRailway = process.env.RAILWAY_ENVIRONMENT !== undefined;
  const isProduction = process.env.NODE_ENV === 'production';
  const hostEnv = isRender ? 'Render' : isRailway ? 'Railway' : isProduction ? 'Production' : 'Local';
  
  console.log(`[EMAIL] Environment detected: ${hostEnv}`);
  console.log(`[EMAIL] NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);

  // Configure email service (can be Gmail, SendGrid, SMTP, etc.)
  // For development, you can use Gmail or a service like Mailtrap
  const emailConfig = {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "465"), // Default to 465 for Railway compatibility
    secure: process.env.SMTP_SECURE !== "false", // Default to true for port 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Add connection timeout and retry options for Railway
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000,
  };

  console.log(`[EMAIL] SMTP Configuration:`);
  console.log(`[EMAIL]   Host: ${emailConfig.host}`);
  console.log(`[EMAIL]   Port: ${emailConfig.port}`);
  console.log(`[EMAIL]   Secure: ${emailConfig.secure}`);
  console.log(`[EMAIL]   User: ${emailConfig.auth.user ? emailConfig.auth.user.substring(0, 3) + '***' : 'NOT SET'}`);

  // If no SMTP config, return null (emails won't be sent)
  if (!emailConfig.auth.user || !emailConfig.auth.pass) {
    console.warn("⚠️  Email service not configured. Set SMTP_USER and SMTP_PASS (for SMTP) or RESEND_API_KEY (for Resend) environment variables.");
    return null;
  }

  // Remove any spaces from the password (App Passwords sometimes have spaces)
  if (emailConfig.auth.pass) {
    emailConfig.auth.pass = emailConfig.auth.pass.replace(/\s+/g, '');
  }

  transporter = nodemailer.createTransport(emailConfig);
  
  // Add event listeners for connection diagnostics
  transporter.on('token', (token) => {
    console.log(`[EMAIL] OAuth token received`);
  });

  console.log(`[EMAIL] Transporter created successfully`);
  return transporter;
}

/**
 * Generate HTML email template for order confirmation
 */
export async function generateOrderEmailTemplate(orderData) {
  // Get store info for email template
  const storeInfo = await getStoreInfo();
  const {
    orderNumber,
    customerName,
    customerEmail,
    items,
    shippingAddress,
    deliveryType = "delivery",
    subtotal,
    subtotalBeforeDiscount,
    discount,
    tax = 0,
    deliveryCost = 0,
    total,
    orderDate,
    status = "pending"
  } = orderData;

  const storeName = storeInfo?.storeName || "Kingsman Saddlery";
  const storeEmail = storeInfo?.storeEmail || process.env.SMTP_USER || "";
  const storePhone = storeInfo?.storePhone || "";
  const whatsappNumber = storeInfo?.whatsappNumber || "";

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <img src="${escapeHtml(item.image || '')}" alt="${escapeHtml(item.name || '')}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 2px solid #FCD34D;" />
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #000000; font-weight: 600;">${escapeHtml(item.name || '')}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #000000; font-weight: 600;">${escapeHtml(item.quantity || 0)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #000000; font-weight: 600;">${(item.price || 0).toFixed(2)} ILS</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #000000; font-weight: 700;">${((item.price || 0) * (item.quantity || 0)).toFixed(2)} ILS</td>
    </tr>
  `).join("");

  const addressHtml = deliveryType === "pickup" 
    ? `<p style="margin: 0; padding: 4px 0; font-weight: 700; color: #000000;">Store Pickup</p><p style="margin: 4px 0; padding: 4px 0; color: #000000; font-weight: 600;">Please pick up your order from our store.</p>`
    : shippingAddress 
    ? `
    <p style="margin: 0; padding: 4px 0; color: #000000; font-weight: 600;">${escapeHtml(shippingAddress.street || '')}</p>
    <p style="margin: 0; padding: 4px 0; color: #000000; font-weight: 600;">${escapeHtml(shippingAddress.city || '')} ${escapeHtml(shippingAddress.zipCode || '')}</p>
    ${shippingAddress.country ? `<p style="margin: 0; padding: 4px 0; color: #000000; font-weight: 600;">${escapeHtml(shippingAddress.country)}</p>` : ""}
  `
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - ${storeName}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #000000; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="background: #000000; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <img src="cid:logo" alt="${storeName}" style="max-width: 200px; height: auto;" />
      </div>
      
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #000000; margin-top: 0; font-size: 24px; font-weight: 700; border-bottom: 3px solid #FCD34D; padding-bottom: 10px; display: inline-block;">Order Confirmation</h2>
        
        <p style="font-size: 16px; color: #000000; font-weight: 600;">Dear ${escapeHtml(customerName || 'Customer')},</p>
        
        <p style="font-size: 16px; color: #000000;">Thank you for your order! We've received your order and will process it shortly.</p>
        
        <div style="background: linear-gradient(to right, #FCD34D 0%, #FBBF24 100%); padding: 20px; border-radius: 6px; margin: 20px 0; border: 2px solid #000000;">
          <p style="margin: 0 0 10px 0; font-weight: bold; font-size: 14px; color: #000000; text-transform: uppercase; letter-spacing: 1px;">ORDER NUMBER</p>
          <p style="margin: 0; font-size: 24px; font-weight: 900; color: #000000;">#${orderNumber}</p>
          ${orderDate ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #000000; font-weight: 600;">Date: ${orderDate}</p>` : ""}
        </div>

        <h3 style="color: #000000; font-size: 18px; margin-top: 30px; margin-bottom: 15px; font-weight: 700; border-bottom: 2px solid #FCD34D; padding-bottom: 8px; display: inline-block;">Order Items</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: linear-gradient(to right, #FCD34D 0%, #FBBF24 100%);">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #000000; font-size: 12px; text-transform: uppercase; color: #000000; font-weight: 700;">Image</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #000000; font-size: 12px; text-transform: uppercase; color: #000000; font-weight: 700;">Product</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #000000; font-size: 12px; text-transform: uppercase; color: #000000; font-weight: 700;">Qty</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #000000; font-size: 12px; text-transform: uppercase; color: #000000; font-weight: 700;">Price</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #000000; font-size: 12px; text-transform: uppercase; color: #000000; font-weight: 700;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="text-align: right; margin-top: 20px; padding-top: 20px; border-top: 3px solid #FCD34D;">
          <div style="margin: 8px 0;">
            <p style="margin: 4px 0; font-size: 14px; color: #000000; font-weight: 600;">
              Subtotal: ${(subtotalBeforeDiscount || subtotal || 0).toFixed(2)} ILS
            </p>
            ${discount && discount.amount > 0 ? `
            <p style="margin: 4px 0; font-size: 14px; color: #000000; font-weight: 700; background: #FCD34D; padding: 4px 8px; display: inline-block; border-radius: 4px;">
              ${discount.type === "new_user" ? "New User Discount" : "Discount"} (${discount.percentage}%): -${discount.amount.toFixed(2)} ILS
            </p>
            <p style="margin: 4px 0; font-size: 14px; color: #000000; font-weight: 600;">
              Subtotal after discount: ${(subtotal || 0).toFixed(2)} ILS
            </p>
            ` : ""}
            ${tax > 0 ? `
            <p style="margin: 4px 0; font-size: 14px; color: #000000; font-weight: 600;">
              Tax: ${tax.toFixed(2)} ILS
            </p>
            ` : ""}
            ${deliveryType === "delivery" && deliveryCost > 0 ? `
            <p style="margin: 4px 0; font-size: 14px; color: #000000; font-weight: 600;">
              Delivery: ${deliveryCost.toFixed(2)} ILS
            </p>
            ` : ""}
            <p style="margin: 12px 0 0 0; font-size: 20px; font-weight: 900; color: #000000; padding-top: 8px; border-top: 2px solid #000000; background: linear-gradient(to right, #FCD34D 0%, #FBBF24 100%); padding: 12px; border-radius: 4px; display: inline-block; min-width: 200px; text-align: center;">
              Total: ${total.toFixed(2)} ILS
            </p>
          </div>
        </div>

        <div style="margin-top: 30px; padding: 20px; background: #ffffff; border: 2px solid #FCD34D; border-radius: 6px;">
          <h3 style="color: #000000; font-size: 18px; margin-top: 0; margin-bottom: 15px; font-weight: 700; border-bottom: 2px solid #FCD34D; padding-bottom: 8px; display: inline-block;">${deliveryType === "pickup" ? "Pickup Information" : "Delivery Address"}</h3>
          ${addressHtml}
        </div>

        <div style="margin-top: 30px; padding: 20px; background: linear-gradient(to right, #FCD34D 0%, #FBBF24 100%); border: 2px solid #000000; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #000000; font-weight: 700;">
            <strong>Status:</strong> ${status === "pending" ? "Pending Payment" : status.charAt(0).toUpperCase() + status.slice(1)}
          </p>
          ${status === "pending" ? `
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #000000; font-weight: 600;">
              Your order will be processed once payment is confirmed. You will receive another email when your order is shipped.
            </p>
          ` : ""}
        </div>

        <p style="font-size: 16px; margin-top: 30px; color: #000000;">If you have any questions about your order, please don't hesitate to contact us.</p>
        
        <p style="font-size: 16px; margin-top: 20px; color: #000000;">
          Best regards,<br>
          <strong style="color: #000000;">${storeName} Team</strong>
        </p>
        
        ${storeEmail || storePhone || whatsappNumber ? `
        <div style="margin-top: 30px; padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;">
          <h3 style="color: #000000; font-size: 16px; margin-top: 0; margin-bottom: 10px; font-weight: 700;">Contact Us</h3>
          ${storeEmail ? `<p style="margin: 4px 0; font-size: 14px; color: #000000; font-weight: 600;">Email: <a href="mailto:${storeEmail}" style="color: #000000; text-decoration: underline;">${storeEmail}</a></p>` : ""}
          ${storePhone ? `<p style="margin: 4px 0; font-size: 14px; color: #000000; font-weight: 600;">Phone: <a href="tel:${storePhone}" style="color: #000000; text-decoration: underline;">${storePhone}</a></p>` : ""}
          ${whatsappNumber ? `<p style="margin: 4px 0; font-size: 14px; color: #000000; font-weight: 600;">WhatsApp: <a href="https://wa.me/${whatsappNumber.replace(/[^\d+]/g, '')}" style="color: #000000; text-decoration: underline;">${whatsappNumber}</a></p>` : ""}
        </div>
        ` : ""}
      </div>
      
      <div style="text-align: center; margin-top: 20px; padding: 20px; color: #000000; font-size: 12px; border-top: 1px solid #FCD34D;">
        <p style="margin: 0; font-weight: 600;">This is an automated email. Please do not reply to this message.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail(orderData) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[EMAIL] ===== Email Send Started at ${timestamp} =====`);
    console.log(`[EMAIL] Order Number: ${orderData.orderNumber}`);
    console.log(`[EMAIL] Recipient: ${orderData.customerEmail}`);
    
    const {
      customerEmail,
      customerName,
      orderNumber,
    } = orderData;

    if (!customerEmail) {
      throw new Error("Customer email is required");
    }

    // Get store info for email
    const storeInfo = await getStoreInfo();
    const storeName = storeInfo?.storeName || "Kingsman Saddlery";
    const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.SMTP_USER;
    
    if (!fromEmail) {
      throw new Error("From email not configured. Set RESEND_FROM_EMAIL or SMTP_USER");
    }

    // Security: Validate email address to prevent injection
    const validatedEmail = validateEmail(customerEmail);
    
    // Security: Sanitize subject line (plain text, not HTML)
    const sanitizedSubject = sanitizeSubject(`Order Confirmation #${orderNumber} - ${storeName}`);

    // Generate plain text version with discount info
    let textEmail = `Order Confirmation #${orderNumber}\n\nDear ${customerName},\n\nThank you for your order! We've received your order and will process it shortly.\n\nOrder Number: #${orderNumber}\n`;
    
    if (orderData.subtotalBeforeDiscount) {
      textEmail += `Subtotal: ${orderData.subtotalBeforeDiscount.toFixed(2)} ILS\n`;
    }
    
    if (orderData.discount && orderData.discount.amount > 0) {
      textEmail += `${orderData.discount.type === "new_user" ? "New User Discount" : "Discount"} (${orderData.discount.percentage}%): -${orderData.discount.amount.toFixed(2)} ILS\n`;
      textEmail += `Subtotal after discount: ${(orderData.subtotal || 0).toFixed(2)} ILS\n`;
    }
    
    if (orderData.tax > 0) {
      textEmail += `Tax: ${orderData.tax.toFixed(2)} ILS\n`;
    }
    
    if (orderData.deliveryType === "delivery" && orderData.deliveryCost > 0) {
      textEmail += `Delivery: ${orderData.deliveryCost.toFixed(2)} ILS\n`;
    }
    
    textEmail += `\nTotal: ${orderData.total.toFixed(2)} ILS\n\nBest regards,\n${storeName} Team`;

    const htmlContent = await generateOrderEmailTemplate(orderData);

    // Try Resend first if configured
    if (isResendConfigured()) {
      console.log(`[EMAIL] Using Resend API to send email...`);
      const resend = getResendClient();
      
      // Get logo attachment for Resend (base64)
      const logoAttachment = getLogoAttachmentBase64();
      const attachments = logoAttachment ? [logoAttachment] : [];

      const sendStartTime = Date.now();
      const { data, error } = await resend.emails.send({
        from: `"${storeName}" <${fromEmail}>`,
        to: [validatedEmail],
        subject: sanitizedSubject,
        html: htmlContent,
        text: textEmail,
        attachments: attachments,
      });

      if (error) {
        throw new Error(`Resend API error: ${error.message || JSON.stringify(error)}`);
      }

      const sendTime = Date.now() - sendStartTime;
      const totalTime = Date.now() - startTime;
      
      console.log(`[EMAIL] ✓ Email sent successfully via Resend!`);
      console.log(`[EMAIL]   Message ID: ${data?.id || 'N/A'}`);
      console.log(`[EMAIL]   Send Time: ${sendTime}ms`);
      console.log(`[EMAIL]   Total Time: ${totalTime}ms`);
      console.log(`[EMAIL] ===== Email Send Completed =====`);
      
      return { success: true, messageId: data?.id || 'resend-' + Date.now() };
    }

    // Fallback to SMTP
    console.log(`[EMAIL] Using SMTP to send email...`);
    const emailTransporter = getTransporter();
    
    if (!emailTransporter) {
      console.warn("[EMAIL] Email service not configured. Email not sent.");
      return { success: false, error: "Email service not configured. Set RESEND_API_KEY or SMTP credentials." };
    }

    // Get logo attachment for SMTP
    const logoAttachment = getLogoAttachment();
    const attachments = logoAttachment ? [logoAttachment] : [];

    const mailOptions = {
      from: `"${storeName}" <${fromEmail}>`,
      to: validatedEmail,
      subject: sanitizedSubject,
      html: htmlContent,
      text: textEmail,
      attachments: attachments,
    };

    console.log(`[EMAIL] Attempting to connect to SMTP server...`);
    console.log(`[EMAIL] SMTP Target: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
    const connectionStartTime = Date.now();
    
    // Verify connection first (this will help diagnose connection issues)
    try {
      await emailTransporter.verify();
      const verifyTime = Date.now() - connectionStartTime;
      console.log(`[EMAIL] ✓ SMTP connection verified successfully (${verifyTime}ms)`);
    } catch (verifyError) {
      const verifyTime = Date.now() - connectionStartTime;
      console.error(`[EMAIL] ✗ SMTP connection verification failed after ${verifyTime}ms`);
      console.error(`[EMAIL] Verification Error Code: ${verifyError.code || 'N/A'}`);
      console.error(`[EMAIL] Verification Error Message: ${verifyError.message}`);
      console.error(`[EMAIL] Verification Error Stack: ${verifyError.stack}`);
      
      // Check for specific error types that indicate Render/hosting issues
      if (verifyError.code === 'ETIMEDOUT' || verifyError.code === 'ECONNRESET' || verifyError.code === 'ECONNREFUSED') {
        console.error(`[EMAIL] ⚠️  NETWORK ERROR DETECTED - This suggests a hosting/firewall issue:`);
        console.error(`[EMAIL]    Error Code: ${verifyError.code}`);
        console.error(`[EMAIL]    This could indicate:`);
        console.error(`[EMAIL]    1. Render/Railway blocking outbound SMTP connections`);
        console.error(`[EMAIL]    2. Firewall blocking port ${process.env.SMTP_PORT}`);
        console.error(`[EMAIL]    3. Network routing issue from hosting provider`);
        console.error(`[EMAIL]    Consider using Resend API (set RESEND_API_KEY) to bypass SMTP issues.`);
      }
      
      throw verifyError;
    }

    console.log(`[EMAIL] Sending email to ${customerEmail}...`);
    const sendStartTime = Date.now();
    
    const info = await emailTransporter.sendMail(mailOptions);
    const sendTime = Date.now() - sendStartTime;
    const totalTime = Date.now() - startTime;
    
    console.log(`[EMAIL] ✓ Email sent successfully via SMTP!`);
    console.log(`[EMAIL]   Message ID: ${info.messageId}`);
    console.log(`[EMAIL]   Send Time: ${sendTime}ms`);
    console.log(`[EMAIL]   Total Time: ${totalTime}ms`);
    console.log(`[EMAIL] ===== Email Send Completed =====`);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[EMAIL] ===== Email Send Failed after ${totalTime}ms =====`);
    console.error(`[EMAIL] Error Type: ${error.constructor.name}`);
    console.error(`[EMAIL] Error Code: ${error.code || 'N/A'}`);
    console.error(`[EMAIL] Error Message: ${error.message}`);
    console.error(`[EMAIL] Error Stack: ${error.stack}`);
    
    // Detailed error analysis for common issues
    if (error.code) {
      console.error(`[EMAIL] Error Code Analysis:`);
      switch (error.code) {
        case 'ETIMEDOUT':
          console.error(`[EMAIL]   ETIMEDOUT: Connection timed out`);
          console.error(`[EMAIL]   Possible causes:`);
          console.error(`[EMAIL]     - Render/Railway blocking SMTP port ${process.env.SMTP_PORT}`);
          console.error(`[EMAIL]     - Gmail SMTP server not reachable from hosting IP`);
          console.error(`[EMAIL]     - Network routing issue`);
          console.error(`[EMAIL]   Solution: Use Resend API (set RESEND_API_KEY) to bypass SMTP issues.`);
          break;
        case 'ECONNREFUSED':
          console.error(`[EMAIL]   ECONNREFUSED: Connection refused`);
          console.error(`[EMAIL]   Possible causes:`);
          console.error(`[EMAIL]     - Port ${process.env.SMTP_PORT} is blocked by hosting provider`);
          console.error(`[EMAIL]     - SMTP server is down or unreachable`);
          console.error(`[EMAIL]   Solution: Use Resend API (set RESEND_API_KEY) to bypass SMTP issues.`);
          break;
        case 'ECONNRESET':
          console.error(`[EMAIL]   ECONNRESET: Connection reset by peer`);
          console.error(`[EMAIL]   Possible causes:`);
          console.error(`[EMAIL]     - Firewall closing connection`);
          console.error(`[EMAIL]     - Gmail blocking connection from hosting IP`);
          console.error(`[EMAIL]   Solution: Use Resend API (set RESEND_API_KEY) to bypass SMTP issues.`);
          break;
        case 'EHOSTUNREACH':
          console.error(`[EMAIL]   EHOSTUNREACH: Host unreachable`);
          console.error(`[EMAIL]   Possible causes:`);
          console.error(`[EMAIL]     - DNS resolution issue`);
          console.error(`[EMAIL]     - Network routing problem from hosting provider`);
          break;
        case 'ENOTFOUND':
          console.error(`[EMAIL]   ENOTFOUND: DNS lookup failed`);
          console.error(`[EMAIL]   Possible causes:`);
          console.error(`[EMAIL]     - DNS resolution issue on hosting provider`);
          console.error(`[EMAIL]     - Invalid SMTP host: ${process.env.SMTP_HOST}`);
          break;
        default:
          console.error(`[EMAIL]   ${error.code}: Check error message for details`);
      }
    }
    
    // Check if it's a Gmail-specific error
    if (error.response) {
      console.error(`[EMAIL] SMTP Server Response:`);
      console.error(`[EMAIL]   Code: ${error.responseCode || 'N/A'}`);
      console.error(`[EMAIL]   Message: ${error.response || 'N/A'}`);
    }
    
    console.error(`[EMAIL] ===== End Error Details =====`);
    
    return { success: false, error: error.message };
  }
}

/**
 * Get store information from settings
 */
async function getStoreInfo() {
  try {
    const settingsDoc = await db.collection("settings").doc("general").get();
    
    if (settingsDoc.exists) {
      return settingsDoc.data();
    }
    
    // Return defaults if no settings exist
    return {
      storeName: "Kingsman Saddlery",
      storeEmail: process.env.SMTP_USER || "",
      storePhone: "",
      whatsappNumber: "",
      location: {
        address: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
      },
    };
  } catch (error) {
    console.error("Error fetching store info:", error);
    return {
      storeName: "Kingsman Saddlery",
      storeEmail: process.env.SMTP_USER || "",
      storePhone: "",
      whatsappNumber: "",
      location: {
        address: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
      },
    };
  }
}

/**
 * Generate HTML email template for contact form submission
 */
function generateContactFormEmailTemplate(contactData, storeInfo) {
  const { name, email, phone, subject, message, id } = contactData;
  const storeName = storeInfo?.storeName || "Kingsman Saddlery";
  const storeEmail = storeInfo?.storeEmail || process.env.SMTP_USER || "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Form Submission - ${storeName}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #000000; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="background: #000000; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <img src="cid:logo" alt="${storeName}" style="max-width: 200px; height: auto;" />
      </div>
      
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #000000; margin-top: 0; font-size: 24px; font-weight: 700; border-bottom: 3px solid #FCD34D; padding-bottom: 10px; display: inline-block;">Contact Form Submission</h2>
        
        <div style="background: linear-gradient(to right, #FCD34D 0%, #FBBF24 100%); padding: 20px; border-radius: 6px; margin: 20px 0; border: 2px solid #000000;">
          <p style="margin: 0 0 10px 0; font-weight: bold; font-size: 14px; color: #000000; text-transform: uppercase; letter-spacing: 1px;">SUBMISSION ID</p>
          <p style="margin: 0; font-size: 24px; font-weight: 900; color: #000000;">#${id}</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #000000; font-weight: 600;">Date: ${new Date().toLocaleString()}</p>
        </div>

        <div style="margin-top: 30px; padding: 20px; background: #ffffff; border: 2px solid #FCD34D; border-radius: 6px;">
          <h3 style="color: #000000; font-size: 18px; margin-top: 0; margin-bottom: 15px; font-weight: 700; border-bottom: 2px solid #FCD34D; padding-bottom: 8px; display: inline-block;">Contact Information</h3>
          
          <div style="margin: 12px 0;">
            <p style="margin: 4px 0; font-size: 14px; color: #000000; font-weight: 600;">
              <strong>Name:</strong> ${escapeHtml(name || '')}
            </p>
          </div>
          
          <div style="margin: 12px 0;">
            <p style="margin: 4px 0; font-size: 14px; color: #000000; font-weight: 600;">
              <strong>Email:</strong> <a href="mailto:${escapeHtml(email || '')}" style="color: #000000; text-decoration: underline;">${escapeHtml(email || '')}</a>
            </p>
          </div>
          
          ${phone ? `
          <div style="margin: 12px 0;">
            <p style="margin: 4px 0; font-size: 14px; color: #000000; font-weight: 600;">
              <strong>Phone:</strong> <a href="tel:${escapeHtml(phone)}" style="color: #000000; text-decoration: underline;">${escapeHtml(phone)}</a>
            </p>
          </div>
          ` : ""}
          
          <div style="margin: 12px 0;">
            <p style="margin: 4px 0; font-size: 14px; color: #000000; font-weight: 600;">
              <strong>Subject:</strong> ${escapeHtml(subject || '')}
            </p>
          </div>
        </div>

        <div style="margin-top: 20px; padding: 20px; background: linear-gradient(to right, #FCD34D 0%, #FBBF24 100%); border: 2px solid #000000; border-radius: 6px;">
          <h3 style="color: #000000; font-size: 18px; margin-top: 0; margin-bottom: 15px; font-weight: 700; border-bottom: 2px solid #000000; padding-bottom: 8px; display: inline-block;">Message</h3>
          <p style="margin: 0; font-size: 14px; color: #000000; font-weight: 600; white-space: pre-wrap;">${escapeHtml(message || '')}</p>
        </div>

        <p style="font-size: 16px; margin-top: 30px; color: #000000;">
          Please respond to this inquiry at your earliest convenience.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; padding: 20px; color: #000000; font-size: 12px; border-top: 1px solid #FCD34D;">
        <p style="margin: 0; font-weight: 600;">This is an automated email from ${storeName} contact form.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send contact form email notification
 */
export async function sendContactFormEmail(contactData) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[EMAIL] ===== Contact Form Email Started at ${timestamp} =====`);
    console.log(`[EMAIL] Submission ID: ${contactData.id}`);
    console.log(`[EMAIL] From: ${contactData.email}`);
    
    if (!contactData.email) {
      throw new Error("Contact email is required");
    }

    // Security: Validate email address to prevent injection
    const validatedContactEmail = validateEmail(contactData.email);

    // Get store info
    const storeInfo = await getStoreInfo();
    const storeName = storeInfo.storeName || 'Kingsman Saddlery';
    const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.SMTP_USER;
    const recipientEmail = storeInfo.storeEmail || fromEmail;

    if (!recipientEmail) {
      throw new Error("Store email not configured. Set RESEND_FROM_EMAIL or SMTP_USER");
    }
    
    // Security: Validate recipient email as well
    const validatedRecipientEmail = validateEmail(recipientEmail);

    // Generate plain text version
    const textEmail = `New Contact Form Submission #${contactData.id}\n\n` +
      `Name: ${contactData.name}\n` +
      `Email: ${contactData.email}\n` +
      (contactData.phone ? `Phone: ${contactData.phone}\n` : "") +
      `Subject: ${contactData.subject}\n\n` +
      `Message:\n${contactData.message}\n\n` +
      `Date: ${new Date().toLocaleString()}`;

    // Security: Sanitize subject line (plain text, not HTML - don't use escapeHtml)
    const sanitizedSubject = sanitizeSubject(
      `New Contact Form: ${contactData.subject || ''} - ${storeName}`
    );

    const htmlContent = generateContactFormEmailTemplate(contactData, storeInfo);

    // Try Resend first if configured
    if (isResendConfigured()) {
      console.log(`[EMAIL] Using Resend API to send contact form email...`);
      const resend = getResendClient();
      
      // Get logo attachment for Resend (base64)
      const logoAttachment = getLogoAttachmentBase64();
      const attachments = logoAttachment ? [logoAttachment] : [];

      const sendStartTime = Date.now();
      const { data, error } = await resend.emails.send({
        from: `"${storeName}" <${fromEmail}>`,
        to: [validatedRecipientEmail],
        replyTo: validatedContactEmail,
        subject: sanitizedSubject,
        html: htmlContent,
        text: textEmail,
        attachments: attachments,
      });

      if (error) {
        throw new Error(`Resend API error: ${error.message || JSON.stringify(error)}`);
      }

      const sendTime = Date.now() - sendStartTime;
      const totalTime = Date.now() - startTime;
      
      console.log(`[EMAIL] ✓ Contact form email sent successfully via Resend!`);
      console.log(`[EMAIL]   Message ID: ${data?.id || 'N/A'}`);
      console.log(`[EMAIL]   Send Time: ${sendTime}ms`);
      console.log(`[EMAIL]   Total Time: ${totalTime}ms`);
      console.log(`[EMAIL] ===== Contact Form Email Completed =====`);
      
      return { success: true, messageId: data?.id || 'resend-' + Date.now() };
    }

    // Fallback to SMTP
    console.log(`[EMAIL] Using SMTP to send contact form email...`);
    const emailTransporter = getTransporter();
    
    if (!emailTransporter) {
      console.warn("[EMAIL] Email service not configured. Email not sent.");
      return { success: false, error: "Email service not configured. Set RESEND_API_KEY or SMTP credentials." };
    }
    
    // Get logo attachment for SMTP
    const logoAttachment = getLogoAttachment();
    const attachments = logoAttachment ? [logoAttachment] : [];

    const mailOptions = {
      from: `"${storeName}" <${fromEmail}>`,
      to: validatedRecipientEmail,
      replyTo: validatedContactEmail,
      subject: sanitizedSubject,
      html: htmlContent,
      text: textEmail,
      attachments: attachments,
    };

    console.log(`[EMAIL] Sending contact form email to ${recipientEmail}...`);
    const sendStartTime = Date.now();
    
    const info = await emailTransporter.sendMail(mailOptions);
    const sendTime = Date.now() - sendStartTime;
    const totalTime = Date.now() - startTime;
    
    console.log(`[EMAIL] ✓ Contact form email sent successfully via SMTP!`);
    console.log(`[EMAIL]   Message ID: ${info.messageId}`);
    console.log(`[EMAIL]   Send Time: ${sendTime}ms`);
    console.log(`[EMAIL]   Total Time: ${totalTime}ms`);
    console.log(`[EMAIL] ===== Contact Form Email Completed =====`);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[EMAIL] ===== Contact Form Email Failed after ${totalTime}ms =====`);
    console.error(`[EMAIL] Error Type: ${error.constructor.name}`);
    console.error(`[EMAIL] Error Code: ${error.code || 'N/A'}`);
    console.error(`[EMAIL] Error Message: ${error.message}`);
    console.error(`[EMAIL] Error Stack: ${error.stack}`);
    console.error(`[EMAIL] ===== End Error Details =====`);
    
    return { success: false, error: error.message };
  }
}


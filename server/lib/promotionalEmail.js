// Promotional email functions
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
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    throw new Error('Invalid email format');
  }
  if (/[\r\n]/.test(trimmed)) {
    throw new Error('Email contains invalid characters');
  }
  return trimmed;
}

// Security: Sanitize email subject lines
function sanitizeSubject(subject) {
  if (!subject || typeof subject !== 'string') return '';
  return subject
    .replace(/[\r\n\t]/g, ' ')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .substring(0, 200);
}

// Get logo attachment
function getLogoAttachment() {
  try {
    const logoPath = path.join(__dirname, '../../client/public/kingsman-saddlery-logo.png');
    if (!fs.existsSync(logoPath)) {
      console.warn(`[EMAIL] Logo file not found at ${logoPath}`);
      return null;
    }
    return {
      filename: 'kingsman-saddlery-logo.png',
      path: logoPath,
      cid: 'logo'
    };
  } catch (error) {
    console.error('[EMAIL] Error getting logo attachment:', error);
    return null;
  }
}

// Get logo attachment as base64 for Resend
function getLogoAttachmentBase64() {
  try {
    const logoPath = path.join(__dirname, '../../client/public/kingsman-saddlery-logo.png');
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

// Check if Resend is configured
function isResendConfigured() {
  return !!process.env.RESEND_API_KEY;
}

// Get Resend client
let resendClient = null;
function getResendClient() {
  if (resendClient) {
    return resendClient;
  }
  if (!isResendConfigured()) {
    return null;
  }
  resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

// Get SMTP transporter
let transporter = null;
function getTransporter() {
  if (transporter) {
    return transporter;
  }
  if (isResendConfigured()) {
    return null;
  }
  const emailConfig = {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "465"),
    secure: process.env.SMTP_SECURE !== "false",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  };
  if (!emailConfig.auth.user || !emailConfig.auth.pass) {
    return null;
  }
  if (emailConfig.auth.pass) {
    emailConfig.auth.pass = emailConfig.auth.pass.replace(/\s+/g, '');
  }
  transporter = nodemailer.createTransport(emailConfig);
  return transporter;
}

// Get store information from settings
async function getStoreInfo() {
  try {
    const settingsDoc = await db.collection("settings").doc("general").get();
    if (settingsDoc.exists) {
      return settingsDoc.data();
    }
    return {
      storeName: "Kingsman Saddlery",
      storeEmail: process.env.SMTP_USER || "",
      storePhone: "",
      whatsappNumber: "",
    };
  } catch (error) {
    console.error("Error fetching store info:", error);
    return {
      storeName: "Kingsman Saddlery",
      storeEmail: process.env.SMTP_USER || "",
      storePhone: "",
      whatsappNumber: "",
    };
  }
}

/**
 * Generate HTML email template for promotional/update emails
 */
function generatePromotionalEmailTemplate(subject, message, storeInfo) {
  const storeName = storeInfo?.storeName || "Kingsman Saddlery";
  const storeEmail = storeInfo?.storeEmail || process.env.SMTP_USER || "";
  const storePhone = storeInfo?.storePhone || "";
  const whatsappNumber = storeInfo?.whatsappNumber || "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(subject)} - ${storeName}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #000000; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <div style="background: #000000; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <img src="cid:logo" alt="${storeName}" style="max-width: 200px; height: auto;" />
      </div>
      
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #000000; margin-top: 0; font-size: 24px; font-weight: 700; border-bottom: 3px solid #FCD34D; padding-bottom: 10px; display: inline-block;">${escapeHtml(subject)}</h2>
        
        <div style="margin-top: 30px; padding: 20px; background: #ffffff; border: 2px solid #FCD34D; border-radius: 6px;">
          <div style="font-size: 16px; color: #000000; line-height: 1.6;">
            ${message}
            <style>
              /* Ensure images display properly in email clients */
              img {
                max-width: 100% !important;
                height: auto !important;
                display: block;
                border: none;
              }
            </style>
          </div>
        </div>

        <p style="font-size: 16px; margin-top: 30px; color: #000000;">
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
        <p style="margin: 0; font-weight: 600;">You are receiving this email because you subscribed to updates from ${storeName}.</p>
        <p style="margin: 8px 0 0 0; font-weight: 600;">This is an automated email. Please do not reply to this message.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send promotional/update email to a single recipient
 */
export async function sendPromotionalEmail(recipientEmail, recipientName, subject, message) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[EMAIL] ===== Promotional Email Started at ${timestamp} =====`);
    console.log(`[EMAIL] Recipient: ${recipientEmail}`);
    console.log(`[EMAIL] Subject: ${subject}`);
    
    if (!recipientEmail) {
      throw new Error("Recipient email is required");
    }

    // Get store info
    const storeInfo = await getStoreInfo();
    const storeName = storeInfo?.storeName || "Kingsman Saddlery";
    
    // For Resend: Use custom domain email if configured, otherwise use test email
    // For SMTP: Use Gmail directly as "from"
    const gmailEmail = process.env.RESEND_REPLY_TO || process.env.SMTP_USER;
    const resendFromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const fromEmail = isResendConfigured() ? resendFromEmail : (process.env.SMTP_USER || gmailEmail);
    const replyToEmail = isResendConfigured() ? gmailEmail : undefined;
    
    if (!fromEmail) {
      throw new Error("From email not configured. Set RESEND_FROM_EMAIL (for Resend) or SMTP_USER (for SMTP)");
    }

    // Security: Validate email address
    const validatedEmail = validateEmail(recipientEmail);
    
    // Security: Sanitize subject line
    const sanitizedSubject = sanitizeSubject(subject);

    // Generate plain text version
    const textEmail = `${subject}\n\n${message}\n\nBest regards,\n${storeName} Team`;

    const htmlContent = generatePromotionalEmailTemplate(subject, message, storeInfo);

    // Try Resend first if configured
    if (isResendConfigured()) {
      console.log(`[EMAIL] Using Resend API to send promotional email...`);
      const resend = getResendClient();
      
      // Get logo attachment for Resend (base64)
      const logoAttachment = getLogoAttachmentBase64();
      const attachments = logoAttachment ? [logoAttachment] : [];

      const sendStartTime = Date.now();
      const emailOptions = {
        from: `"${storeName}" <${fromEmail}>`,
        to: [validatedEmail],
        subject: sanitizedSubject,
        html: htmlContent,
        text: textEmail,
        attachments: attachments,
      };
      
      // Add reply-to if Gmail email is configured
      if (replyToEmail) {
        emailOptions.replyTo = replyToEmail;
      }
      
      const { data, error } = await resend.emails.send(emailOptions);

      if (error) {
        throw new Error(`Resend API error: ${error.message || JSON.stringify(error)}`);
      }

      const sendTime = Date.now() - sendStartTime;
      const totalTime = Date.now() - startTime;
      
      console.log(`[EMAIL] ✓ Promotional email sent successfully via Resend!`);
      console.log(`[EMAIL]   Message ID: ${data?.id || 'N/A'}`);
      console.log(`[EMAIL]   Send Time: ${sendTime}ms`);
      console.log(`[EMAIL]   Total Time: ${totalTime}ms`);
      console.log(`[EMAIL] ===== Promotional Email Completed =====`);
      
      return { success: true, messageId: data?.id || 'resend-' + Date.now() };
    }

    // Fallback to SMTP
    console.log(`[EMAIL] Using SMTP to send promotional email...`);
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

    if (replyToEmail) {
      mailOptions.replyTo = replyToEmail;
    }

    console.log(`[EMAIL] Sending promotional email to ${recipientEmail}...`);
    const sendStartTime = Date.now();
    
    const info = await emailTransporter.sendMail(mailOptions);
    const sendTime = Date.now() - sendStartTime;
    const totalTime = Date.now() - startTime;
    
    console.log(`[EMAIL] ✓ Promotional email sent successfully via SMTP!`);
    console.log(`[EMAIL]   Message ID: ${info.messageId}`);
    console.log(`[EMAIL]   Send Time: ${sendTime}ms`);
    console.log(`[EMAIL]   Total Time: ${totalTime}ms`);
    console.log(`[EMAIL] ===== Promotional Email Completed =====`);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[EMAIL] ===== Promotional Email Failed after ${totalTime}ms =====`);
    console.error(`[EMAIL] Error Type: ${error.constructor.name}`);
    console.error(`[EMAIL] Error Code: ${error.code || 'N/A'}`);
    console.error(`[EMAIL] Error Message: ${error.message}`);
    console.error(`[EMAIL] Error Stack: ${error.stack}`);
    console.error(`[EMAIL] ===== End Error Details =====`);
    
    return { success: false, error: error.message };
  }
}


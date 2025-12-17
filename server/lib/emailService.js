// Email service using nodemailer
import nodemailer from "nodemailer";

// Create reusable transporter
let transporter = null;

function getTransporter() {
  if (transporter) {
    return transporter;
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
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  console.log(`[EMAIL] SMTP Configuration:`);
  console.log(`[EMAIL]   Host: ${emailConfig.host}`);
  console.log(`[EMAIL]   Port: ${emailConfig.port}`);
  console.log(`[EMAIL]   Secure: ${emailConfig.secure}`);
  console.log(`[EMAIL]   User: ${emailConfig.auth.user ? emailConfig.auth.user.substring(0, 3) + '***' : 'NOT SET'}`);

  // If no SMTP config, return null (emails won't be sent)
  if (!emailConfig.auth.user || !emailConfig.auth.pass) {
    console.warn("⚠️  Email service not configured. Set SMTP_USER and SMTP_PASS environment variables.");
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
export function generateOrderEmailTemplate(orderData) {
  const {
    orderNumber,
    customerName,
    customerEmail,
    items,
    shippingAddress,
    deliveryType = "delivery",
    total,
    orderDate,
    status = "pending"
  } = orderData;

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <img src="${item.image || ''}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;" />
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.price.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join("");

  const addressHtml = deliveryType === "pickup" 
    ? `<p style="margin: 0; padding: 4px 0; font-weight: bold;">Store Pickup</p><p style="margin: 4px 0; padding: 4px 0; color: #6b7280;">Please pick up your order from our store.</p>`
    : shippingAddress 
    ? `
    <p style="margin: 0; padding: 4px 0;">${shippingAddress.street}</p>
    <p style="margin: 0; padding: 4px 0;">${shippingAddress.city} ${shippingAddress.zipCode}</p>
    ${shippingAddress.country ? `<p style="margin: 0; padding: 4px 0;">${shippingAddress.country}</p>` : ""}
  `
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - Kingsman Saddlery</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Kingsman Saddlery</h1>
      </div>
      
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #111827; margin-top: 0; font-size: 24px;">Order Confirmation</h2>
        
        <p style="font-size: 16px;">Dear ${customerName},</p>
        
        <p style="font-size: 16px;">Thank you for your order! We've received your order and will process it shortly.</p>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; font-weight: bold; font-size: 14px; color: #6b7280;">ORDER NUMBER</p>
          <p style="margin: 0; font-size: 20px; font-weight: bold; color: #111827;">#${orderNumber}</p>
          ${orderDate ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">Date: ${orderDate}</p>` : ""}
        </div>

        <h3 style="color: #111827; font-size: 18px; margin-top: 30px; margin-bottom: 15px;">Order Items</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 12px; text-transform: uppercase; color: #6b7280;">Image</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 12px; text-transform: uppercase; color: #6b7280;">Product</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb; font-size: 12px; text-transform: uppercase; color: #6b7280;">Qty</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb; font-size: 12px; text-transform: uppercase; color: #6b7280;">Price</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb; font-size: 12px; text-transform: uppercase; color: #6b7280;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="text-align: right; margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
          <p style="margin: 8px 0; font-size: 16px;">
            <span style="font-weight: bold;">Total: $${total.toFixed(2)}</span>
          </p>
        </div>

        <div style="margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 6px;">
          <h3 style="color: #111827; font-size: 18px; margin-top: 0; margin-bottom: 15px;">${deliveryType === "pickup" ? "Pickup Information" : "Delivery Address"}</h3>
          ${addressHtml}
        </div>

        <div style="margin-top: 30px; padding: 20px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            <strong>Status:</strong> ${status === "pending" ? "Pending Payment" : status.charAt(0).toUpperCase() + status.slice(1)}
          </p>
          ${status === "pending" ? `
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #92400e;">
              Your order will be processed once payment is confirmed. You will receive another email when your order is shipped.
            </p>
          ` : ""}
        </div>

        <p style="font-size: 16px; margin-top: 30px;">If you have any questions about your order, please don't hesitate to contact us.</p>
        
        <p style="font-size: 16px; margin-top: 20px;">
          Best regards,<br>
          <strong>Kingsman Saddlery Team</strong>
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6b7280; font-size: 12px;">
        <p style="margin: 0;">This is an automated email. Please do not reply to this message.</p>
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
    
    const emailTransporter = getTransporter();
    
    if (!emailTransporter) {
      console.warn("[EMAIL] Email service not configured. Email not sent.");
      return { success: false, error: "Email service not configured" };
    }

    const {
      customerEmail,
      customerName,
      orderNumber,
    } = orderData;

    if (!customerEmail) {
      throw new Error("Customer email is required");
    }

    const mailOptions = {
      from: `"Kingsman Saddlery" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: `Order Confirmation #${orderNumber} - Kingsman Saddlery`,
      html: generateOrderEmailTemplate(orderData),
      text: `Order Confirmation #${orderNumber}\n\nDear ${customerName},\n\nThank you for your order! We've received your order and will process it shortly.\n\nOrder Number: #${orderNumber}\nTotal: $${orderData.total.toFixed(2)}\n\nBest regards,\nKingsman Saddlery Team`,
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
      }
      
      throw verifyError;
    }

    console.log(`[EMAIL] Sending email to ${customerEmail}...`);
    const sendStartTime = Date.now();
    
    const info = await emailTransporter.sendMail(mailOptions);
    const sendTime = Date.now() - sendStartTime;
    const totalTime = Date.now() - startTime;
    
    console.log(`[EMAIL] ✓ Email sent successfully!`);
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
          break;
        case 'ECONNREFUSED':
          console.error(`[EMAIL]   ECONNREFUSED: Connection refused`);
          console.error(`[EMAIL]   Possible causes:`);
          console.error(`[EMAIL]     - Port ${process.env.SMTP_PORT} is blocked by hosting provider`);
          console.error(`[EMAIL]     - SMTP server is down or unreachable`);
          break;
        case 'ECONNRESET':
          console.error(`[EMAIL]   ECONNRESET: Connection reset by peer`);
          console.error(`[EMAIL]   Possible causes:`);
          console.error(`[EMAIL]     - Firewall closing connection`);
          console.error(`[EMAIL]     - Gmail blocking connection from hosting IP`);
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


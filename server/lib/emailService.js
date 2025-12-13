// Email service using nodemailer
import nodemailer from "nodemailer";

// Create reusable transporter
let transporter = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

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
  try {
    const emailTransporter = getTransporter();
    
    if (!emailTransporter) {
      console.warn("Email service not configured. Email not sent.");
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

    const info = await emailTransporter.sendMail(mailOptions);
    console.log("Order confirmation email sent:", info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    return { success: false, error: error.message };
  }
}


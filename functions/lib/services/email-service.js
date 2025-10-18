"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueEmail = queueEmail;
exports.sendInvoiceEmail = sendInvoiceEmail;
exports.sendPaymentReceivedEmail = sendPaymentReceivedEmail;
exports.sendOverdueInvoiceEmail = sendOverdueInvoiceEmail;
exports.sendEmployeeInvitationEmail = sendEmployeeInvitationEmail;
const admin = __importStar(require("firebase-admin"));
/**
 * Queue an email to be sent via Firestore mail collection
 *
 * @param emailData - Email configuration
 * @returns Promise resolving to mail document ID
 */
async function queueEmail(emailData) {
    const db = admin.firestore();
    // Format recipients
    const to = Array.isArray(emailData.to)
        ? emailData.to.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email))
        : emailData.to.name
            ? `${emailData.to.name} <${emailData.to.email}>`
            : emailData.to.email;
    // Create mail document
    const mailRef = await db.collection('mail').add({
        to,
        from: emailData.from
            ? emailData.from.name
                ? `${emailData.from.name} <${emailData.from.email}>`
                : emailData.from.email
            : undefined,
        replyTo: emailData.replyTo,
        message: {
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text || stripHtml(emailData.html),
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return mailRef.id;
}
/**
 * Send invoice notification email
 */
async function sendInvoiceEmail(params) {
    const { recipientEmail, recipientName, invoiceNumber, amount, dueDate, companyName } = params;
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .invoice-details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2563eb; }
          .amount { font-size: 24px; font-weight: bold; color: #2563eb; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Invoice from ${companyName}</h1>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p>You have received a new invoice:</p>

            <div class="invoice-details">
              <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
              <p><strong>Amount Due:</strong> <span class="amount">$${amount.toFixed(2)}</span></p>
              <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <p>Please arrange payment by the due date.</p>
            <p>Thank you for your business!</p>
          </div>
          <div class="footer">
            <p>This is an automated message from ${companyName}.</p>
          </div>
        </div>
      </body>
    </html>
  `;
    return queueEmail({
        to: { email: recipientEmail, name: recipientName },
        subject: `Invoice ${invoiceNumber} from ${companyName}`,
        html,
    });
}
/**
 * Send payment received notification
 */
async function sendPaymentReceivedEmail(params) {
    const { recipientEmail, recipientName, invoiceNumber, amountPaid, remainingBalance, companyName } = params;
    const isPaidInFull = remainingBalance < 0.01;
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .payment-details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #10b981; }
          .amount { font-size: 24px; font-weight: bold; color: #10b981; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Received</h1>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p>Thank you! We have received your payment:</p>

            <div class="payment-details">
              <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
              <p><strong>Amount Paid:</strong> <span class="amount">$${amountPaid.toFixed(2)}</span></p>
              ${!isPaidInFull
        ? `<p><strong>Remaining Balance:</strong> $${remainingBalance.toFixed(2)}</p>`
        : '<p style="color: #10b981; font-weight: bold;">✓ Paid in Full</p>'}
            </div>

            <p>We appreciate your business!</p>
          </div>
          <div class="footer">
            <p>This is an automated message from ${companyName}.</p>
          </div>
        </div>
      </body>
    </html>
  `;
    return queueEmail({
        to: { email: recipientEmail, name: recipientName },
        subject: isPaidInFull
            ? `Payment Received - Invoice ${invoiceNumber} Paid in Full`
            : `Payment Received - Invoice ${invoiceNumber}`,
        html,
    });
}
/**
 * Send overdue invoice reminder
 */
async function sendOverdueInvoiceEmail(params) {
    const { recipientEmail, recipientName, invoiceNumber, amountDue, dueDate, daysPastDue, companyName } = params;
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .invoice-details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #ef4444; }
          .amount { font-size: 24px; font-weight: bold; color: #ef4444; }
          .warning { color: #dc2626; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Overdue Invoice Reminder</h1>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p class="warning">This is a reminder that invoice ${invoiceNumber} is now ${daysPastDue} day${daysPastDue > 1 ? 's' : ''} overdue.</p>

            <div class="invoice-details">
              <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
              <p><strong>Amount Due:</strong> <span class="amount">$${amountDue.toFixed(2)}</span></p>
              <p><strong>Original Due Date:</strong> ${new Date(dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <p>Please arrange payment as soon as possible.</p>
            <p>If you have already sent payment, please disregard this notice.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from ${companyName}.</p>
          </div>
        </div>
      </body>
    </html>
  `;
    return queueEmail({
        to: { email: recipientEmail, name: recipientName },
        subject: `Overdue Invoice Reminder - ${invoiceNumber}`,
        html,
    });
}
/**
 * Send employee invitation email
 */
async function sendEmployeeInvitationEmail(params) {
    const { recipientEmail, recipientName, inviterName, companyName, role, signupUrl } = params;
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .invitation-details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2563eb; }
          .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You're Invited to ${companyName}</h1>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p>${inviterName} has invited you to join ${companyName} as a <strong>${role}</strong>.</p>

            <div class="invitation-details">
              <p><strong>Company:</strong> ${companyName}</p>
              <p><strong>Role:</strong> ${role}</p>
              <p><strong>Invited by:</strong> ${inviterName}</p>
            </div>

            <p>Click the button below to create your account:</p>
            <p style="text-align: center;">
              <a href="${signupUrl}" class="button">Accept Invitation</a>
            </p>

            <p style="font-size: 12px; color: #6b7280;">
              If the button doesn't work, copy and paste this link into your browser:<br/>
              ${signupUrl}
            </p>
          </div>
          <div class="footer">
            <p>This invitation was sent by ${companyName} via Sierra Painting Management System.</p>
          </div>
        </div>
      </body>
    </html>
  `;
    return queueEmail({
        to: { email: recipientEmail, name: recipientName },
        subject: `Invitation to join ${companyName}`,
        html,
    });
}
/**
 * Strip HTML tags for plain text fallback
 */
function stripHtml(html) {
    return html
        .replace(/<style[^>]*>.*?<\/style>/gi, '')
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s\s+/g, ' ')
        .trim();
}
//# sourceMappingURL=email-service.js.map
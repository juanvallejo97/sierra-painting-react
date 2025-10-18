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
exports.sendEmployeeInvitation = exports.sendPaymentNotification = exports.sendInvoiceNotification = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const email_service_1 = require("../services/email-service");
/**
 * Send invoice notification to client
 *
 * Triggered when invoice status changes to 'sent'
 */
exports.sendInvoiceNotification = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { invoiceId } = data;
    if (!invoiceId || typeof invoiceId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'invoiceId is required and must be a string');
    }
    try {
        const db = admin.firestore();
        const invoiceRef = db.collection('invoices').doc(invoiceId);
        const invoiceSnap = await invoiceRef.get();
        if (!invoiceSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Invoice not found');
        }
        const invoiceData = invoiceSnap.data();
        // Verify user has access to this invoice's company
        const userCompanyId = context.auth.token.companyId;
        if (!userCompanyId || userCompanyId !== invoiceData.companyId) {
            throw new functions.https.HttpsError('permission-denied', 'Access denied to this invoice');
        }
        // Get company details
        const companySnap = await db.collection('companies').doc(invoiceData.companyId).get();
        const companyData = companySnap.data();
        const companyName = (companyData === null || companyData === void 0 ? void 0 : companyData.name) || 'Sierra Painting';
        // Validate recipient email
        if (!invoiceData.clientEmail) {
            throw new functions.https.HttpsError('failed-precondition', 'Invoice does not have a client email');
        }
        // Send email
        await (0, email_service_1.sendInvoiceEmail)({
            recipientEmail: invoiceData.clientEmail,
            recipientName: invoiceData.client,
            invoiceNumber: invoiceData.invoiceNumber,
            amount: invoiceData.amount,
            dueDate: invoiceData.dueDate,
            companyName,
        });
        // Update invoice to mark as sent (if not already)
        if (invoiceData.status === 'draft') {
            await invoiceRef.update({
                status: 'sent',
                sentDate: new Date().toISOString().split('T')[0],
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        return { success: true, message: 'Invoice email sent successfully' };
    }
    catch (error) {
        console.error('Error sending invoice email:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to send invoice email');
    }
});
/**
 * Send payment received notification to client
 *
 * Called after payment is recorded
 */
exports.sendPaymentNotification = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { invoiceId } = data;
    if (!invoiceId || typeof invoiceId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'invoiceId is required and must be a string');
    }
    try {
        const db = admin.firestore();
        const invoiceRef = db.collection('invoices').doc(invoiceId);
        const invoiceSnap = await invoiceRef.get();
        if (!invoiceSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Invoice not found');
        }
        const invoiceData = invoiceSnap.data();
        // Verify user has access to this invoice's company
        const userCompanyId = context.auth.token.companyId;
        if (!userCompanyId || userCompanyId !== invoiceData.companyId) {
            throw new functions.https.HttpsError('permission-denied', 'Access denied to this invoice');
        }
        // Get company details
        const companySnap = await db.collection('companies').doc(invoiceData.companyId).get();
        const companyData = companySnap.data();
        const companyName = (companyData === null || companyData === void 0 ? void 0 : companyData.name) || 'Sierra Painting';
        // Validate recipient email
        if (!invoiceData.clientEmail) {
            throw new functions.https.HttpsError('failed-precondition', 'Invoice does not have a client email');
        }
        // Send email
        await (0, email_service_1.sendPaymentReceivedEmail)({
            recipientEmail: invoiceData.clientEmail,
            recipientName: invoiceData.client,
            invoiceNumber: invoiceData.invoiceNumber,
            amountPaid: invoiceData.amountPaid || 0,
            remainingBalance: invoiceData.remainingBalance || 0,
            companyName,
        });
        return { success: true, message: 'Payment notification sent successfully' };
    }
    catch (error) {
        console.error('Error sending payment notification:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to send payment notification');
    }
});
/**
 * Send employee invitation email
 *
 * Called when admin invites a new employee
 */
exports.sendEmployeeInvitation = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // Verify user is admin or manager
    const userRole = context.auth.token.role;
    if (!userRole || (userRole !== 'admin' && userRole !== 'manager')) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins and managers can invite employees');
    }
    const { employeeEmail, employeeName, role } = data;
    if (!employeeEmail || typeof employeeEmail !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'employeeEmail is required and must be a string');
    }
    if (!employeeName || typeof employeeName !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'employeeName is required and must be a string');
    }
    if (!role || typeof role !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'role is required and must be a string');
    }
    try {
        const db = admin.firestore();
        const userCompanyId = context.auth.token.companyId;
        if (!userCompanyId) {
            throw new functions.https.HttpsError('failed-precondition', 'User does not have a company assignment');
        }
        // Get company and inviter details
        const companySnap = await db.collection('companies').doc(userCompanyId).get();
        const companyData = companySnap.data();
        const companyName = (companyData === null || companyData === void 0 ? void 0 : companyData.name) || 'Sierra Painting';
        const inviterSnap = await db.collection('users').doc(context.auth.uid).get();
        const inviterData = inviterSnap.data();
        const inviterName = (inviterData === null || inviterData === void 0 ? void 0 : inviterData.name) || (inviterData === null || inviterData === void 0 ? void 0 : inviterData.email) || 'Your manager';
        // Generate signup URL with invitation token
        const signupUrl = `${process.env.FIREBASE_AUTH_DOMAIN || 'https://sierra-painting.com'}/signup?email=${encodeURIComponent(employeeEmail)}&invite=1`;
        // Send invitation email
        await (0, email_service_1.sendEmployeeInvitationEmail)({
            recipientEmail: employeeEmail,
            recipientName: employeeName,
            inviterName,
            companyName,
            role,
            signupUrl,
        });
        return { success: true, message: 'Invitation email sent successfully' };
    }
    catch (error) {
        console.error('Error sending employee invitation:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to send invitation email');
    }
});
//# sourceMappingURL=notifications.js.map
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
exports.sendOverdueInvoiceReminders = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const email_service_1 = require("../services/email-service");
/**
 * Scheduled function to send overdue invoice reminders
 *
 * Runs daily at 9:00 AM (server time)
 * Sends reminders for invoices that are 1, 7, 14, and 30 days overdue
 */
exports.sendOverdueInvoiceReminders = functions.pubsub
    .schedule('0 9 * * *') // Every day at 9:00 AM
    .timeZone('America/Los_Angeles') // PST/PDT
    .onRun(async (context) => {
    const db = admin.firestore();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    console.log('Starting overdue invoice reminder job:', today.toISOString());
    try {
        // Query all sent or partially paid invoices
        const invoicesSnapshot = await db
            .collection('invoices')
            .where('status', 'in', ['sent', 'partially_paid'])
            .get();
        const overdueInvoices = [];
        // Filter for overdue invoices
        invoicesSnapshot.forEach((doc) => {
            const data = doc.data();
            const dueDate = new Date(data.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            if (dueDate < today) {
                const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                // Send reminders at specific intervals: 1, 7, 14, 30 days
                const reminderIntervals = [1, 7, 14, 30];
                if (reminderIntervals.includes(daysPastDue)) {
                    overdueInvoices.push({
                        id: doc.id,
                        data,
                        daysPastDue,
                    });
                }
            }
        });
        console.log(`Found ${overdueInvoices.length} overdue invoices to process`);
        // Send reminder emails
        const emailPromises = overdueInvoices.map(async (invoice) => {
            try {
                // Skip if no client email
                if (!invoice.data.clientEmail) {
                    console.log(`Skipping invoice ${invoice.data.invoiceNumber}: no client email`);
                    return;
                }
                // Get company name
                const companySnap = await db.collection('companies').doc(invoice.data.companyId).get();
                const companyData = companySnap.data();
                const companyName = (companyData === null || companyData === void 0 ? void 0 : companyData.name) || 'Sierra Painting';
                // Send reminder email
                await (0, email_service_1.sendOverdueInvoiceEmail)({
                    recipientEmail: invoice.data.clientEmail,
                    recipientName: invoice.data.client,
                    invoiceNumber: invoice.data.invoiceNumber,
                    amountDue: invoice.data.remainingBalance || invoice.data.amount,
                    dueDate: invoice.data.dueDate,
                    daysPastDue: invoice.daysPastDue,
                    companyName,
                });
                // Log reminder sent
                await db.collection('invoices').doc(invoice.id).update({
                    lastReminderSent: admin.firestore.FieldValue.serverTimestamp(),
                    reminderCount: admin.firestore.FieldValue.increment(1),
                });
                console.log(`Sent overdue reminder for invoice ${invoice.data.invoiceNumber} (${invoice.daysPastDue} days overdue)`);
            }
            catch (error) {
                console.error(`Error sending reminder for invoice ${invoice.id}:`, error);
            }
        });
        await Promise.all(emailPromises);
        console.log('Overdue invoice reminder job completed successfully');
    }
    catch (error) {
        console.error('Error in overdue invoice reminder job:', error);
        throw error;
    }
});
//# sourceMappingURL=overdue-invoices.js.map
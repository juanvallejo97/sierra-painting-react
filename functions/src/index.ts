import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export all authentication triggers and callable functions
export { setUserClaimsOnCreate, assignUserRole, getCurrentClaims } from './triggers/auth';

// Export migration functions
export { backfillUserClaims, checkUserClaims } from './migrations/backfill-claims';

// Export callable functions
export { generateInvoiceNumber } from './callable/invoices';

export {
  sendInvoiceNotification,
  sendPaymentNotification,
  sendEmployeeInvitation,
} from './callable/notifications';

// Export scheduled functions
export { sendOverdueInvoiceReminders } from './scheduled/overdue-invoices';

// Future exports will include:
// - App Check middleware
// - Analytics functions

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export all authentication triggers and callable functions
export { setUserClaimsOnCreate, assignUserRole, getCurrentClaims } from './triggers/auth';

// Export migration functions
export { backfillUserClaims, checkUserClaims } from './migrations/backfill-claims';

// Export callable functions
export { generateInvoiceNumber } from './callable/invoices';

// Future exports will include:
// - App Check middleware
// - Scheduled backup functions
// - Analytics functions

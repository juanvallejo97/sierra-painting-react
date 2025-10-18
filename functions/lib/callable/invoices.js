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
exports.generateInvoiceNumber = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * Cloud Function: Generate Invoice Number (Server-Side)
 *
 * This function generates unique invoice numbers with format: INV-YYYYMM-XXXX
 * Uses Firestore transactions to prevent race conditions and ensure sequential numbering.
 *
 * Security:
 * - Requires authentication
 * - Validates user has companyId in custom claims
 * - Enforces multi-tenant isolation
 *
 * @param companyId - The company ID to generate invoice number for
 * @returns Invoice number string (e.g., "INV-202510-0001")
 */
exports.generateInvoiceNumber = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to generate invoice numbers');
    }
    // Extract companyId from request
    const { companyId } = data;
    // Validate companyId is provided
    if (!companyId || typeof companyId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'companyId is required and must be a string');
    }
    // Verify user has access to this company (custom claims)
    const userCompanyId = context.auth.token.companyId;
    if (!userCompanyId) {
        throw new functions.https.HttpsError('permission-denied', 'User does not have a company assignment');
    }
    if (userCompanyId !== companyId) {
        throw new functions.https.HttpsError('permission-denied', 'User does not have access to this company');
    }
    // Generate year-month prefix
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `INV-${yearMonth}-`;
    // Use Firestore transaction to ensure atomic increment
    const db = admin.firestore();
    const counterRef = db.collection('invoiceCounters').doc(`${companyId}-${yearMonth}`);
    try {
        const invoiceNumber = await db.runTransaction(async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            let nextNumber;
            if (!counterDoc.exists) {
                // First invoice of the month for this company
                nextNumber = 1;
                transaction.set(counterRef, {
                    companyId,
                    yearMonth,
                    lastNumber: nextNumber,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            else {
                // Increment existing counter
                const counterData = counterDoc.data();
                nextNumber = ((counterData === null || counterData === void 0 ? void 0 : counterData.lastNumber) || 0) + 1;
                transaction.update(counterRef, {
                    lastNumber: nextNumber,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            // Format as INV-YYYYMM-0001
            return `${prefix}${String(nextNumber).padStart(4, '0')}`;
        });
        return { invoiceNumber };
    }
    catch (error) {
        console.error('Error generating invoice number:', error);
        throw new functions.https.HttpsError('internal', 'Failed to generate invoice number. Please try again.');
    }
});
//# sourceMappingURL=invoices.js.map
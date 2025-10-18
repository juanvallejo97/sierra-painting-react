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
exports.checkUserClaims = exports.backfillUserClaims = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const app_check_1 = require("../middleware/app-check");
/**
 * Migration Script: Backfill Custom Claims for Existing Users
 *
 * PURPOSE:
 * This migration is critical for the transition from Firestore document-based
 * authorization to custom claims-based authorization.
 *
 * WHAT IT DOES:
 * 1. Reads all user documents from Firestore
 * 2. For each user with role/companyId in their document:
 *    - Sets custom claims with their role and companyId
 *    - Marks migration as complete in the user document
 * 3. Logs all operations for audit trail
 *
 * WHEN TO RUN:
 * - Run ONCE during Phase 0 Day 1 deployment
 * - Run again if any users are missing claims
 *
 * HOW TO RUN:
 * ```bash
 * # Via Firebase CLI
 * firebase functions:shell
 * > backfillUserClaims()
 *
 * # Via HTTP (if deployed as callable)
 * # Only admins can call this function
 * ```
 *
 * SAFETY:
 * - Idempotent: Safe to run multiple times
 * - Only updates users that don't have claims yet
 * - Validates data before setting claims
 * - Does not delete or modify existing claims
 *
 * @see functions/src/triggers/auth.ts for ongoing claim management
 */
exports.backfillUserClaims = functions.https.onCall(async (data, context) => {
    var _a;
    // Security Layer 1: Verify App Check token
    (0, app_check_1.verifyAppCheck)(context, {
        monitorOnly: !(0, app_check_1.isAppCheckEnforced)(),
        errorMessage: 'App Check verification failed for backfillUserClaims',
    });
    // Security Layer 2: Only admins can run migrations
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in to run migrations');
    }
    if (context.auth.token.role !== 'admin') {
        functions.logger.warn('Non-admin attempted to run migration', {
            userId: context.auth.uid,
        });
        throw new functions.https.HttpsError('permission-denied', 'Only admins can run migrations');
    }
    functions.logger.info('Starting custom claims backfill migration', {
        initiatedBy: context.auth.uid,
    });
    const results = {
        total: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        errorDetails: [],
    };
    try {
        // Step 1: Get all user documents from Firestore
        const usersSnapshot = await admin.firestore().collection('users').get();
        results.total = usersSnapshot.size;
        functions.logger.info(`Found ${results.total} users to process`);
        // Step 2: Process each user
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data();
            try {
                // Step 2a: Get current auth record and claims
                const userRecord = await admin.auth().getUser(userId);
                const currentClaims = userRecord.customClaims || {};
                // Step 2b: Check if user already has claims
                if (currentClaims.role && currentClaims.companyId) {
                    functions.logger.debug('User already has claims, skipping', { userId });
                    results.skipped++;
                    continue;
                }
                // Step 2c: Validate user has role and companyId in Firestore
                const role = userData.role;
                const companyId = userData.companyId;
                if (!role) {
                    functions.logger.warn('User missing role in Firestore, skipping', {
                        userId,
                        email: userData.email,
                    });
                    results.skipped++;
                    continue;
                }
                // Users without companyId should be marked as pending
                if (!companyId) {
                    functions.logger.info('User missing companyId, setting as pending', {
                        userId,
                        email: userData.email,
                    });
                    await admin.auth().setCustomUserClaims(userId, {
                        role: 'pending',
                        companyId: null,
                        createdAt: Date.now(),
                        migratedAt: Date.now(),
                    });
                    results.updated++;
                    continue;
                }
                // Step 2d: Validate role is valid
                const validRoles = ['admin', 'manager', 'worker', 'crew', 'staff'];
                if (!validRoles.includes(role)) {
                    functions.logger.error('Invalid role found in Firestore', {
                        userId,
                        role,
                        email: userData.email,
                    });
                    results.errors++;
                    results.errorDetails.push({
                        userId,
                        email: userData.email,
                        error: `Invalid role: ${role}`,
                    });
                    continue;
                }
                // Step 2e: Set custom claims from Firestore data
                const newClaims = {
                    role,
                    companyId,
                    createdAt: ((_a = userData.createdAt) === null || _a === void 0 ? void 0 : _a.toMillis()) || Date.now(),
                    migratedAt: Date.now(),
                    migratedBy: context.auth.uid,
                };
                await admin.auth().setCustomUserClaims(userId, newClaims);
                // Step 2f: Mark user document as migrated (for audit purposes)
                await admin.firestore().collection('users').doc(userId).update({
                    claimsMigrated: true,
                    claimsMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                functions.logger.info('Successfully migrated user', {
                    userId,
                    email: userData.email,
                    role,
                    companyId,
                });
                results.updated++;
            }
            catch (error) {
                functions.logger.error('Failed to migrate user', {
                    userId,
                    error: error.message,
                });
                results.errors++;
                results.errorDetails.push({
                    userId,
                    email: userData.email,
                    error: error.message,
                });
            }
        }
        // Step 3: Log final results
        functions.logger.info('Custom claims backfill migration completed', results);
        return {
            success: true,
            message: 'Migration completed',
            results,
        };
    }
    catch (error) {
        functions.logger.error('Migration failed', { error: error.message });
        throw new functions.https.HttpsError('internal', `Migration failed: ${error.message}`);
    }
});
/**
 * Debug Function: Check Claims for a Specific User
 *
 * Useful for verifying migration success or debugging claim issues.
 *
 * USAGE:
 * ```javascript
 * const checkClaims = firebase.functions().httpsCallable('checkUserClaims');
 * const result = await checkClaims({ userId: 'abc123' });
 * console.log(result.data);
 * ```
 */
exports.checkUserClaims = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d;
    // Security Layer 1: Verify App Check token
    (0, app_check_1.verifyAppCheck)(context, {
        monitorOnly: !(0, app_check_1.isAppCheckEnforced)(),
        errorMessage: 'App Check verification failed for checkUserClaims',
    });
    // Security Layer 2: Only admins can check other users' claims
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    const { userId } = data;
    // Non-admins can only check their own claims
    if (context.auth.token.role !== 'admin' && context.auth.uid !== userId) {
        throw new functions.https.HttpsError('permission-denied', "Only admins can check other users' claims");
    }
    try {
        const userRecord = await admin.auth().getUser(userId);
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        return {
            success: true,
            userId,
            email: userRecord.email,
            customClaims: userRecord.customClaims || {},
            firestoreData: userDoc.exists
                ? {
                    role: (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role,
                    companyId: (_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.companyId,
                    status: (_c = userDoc.data()) === null || _c === void 0 ? void 0 : _c.status,
                    claimsMigrated: (_d = userDoc.data()) === null || _d === void 0 ? void 0 : _d.claimsMigrated,
                }
                : null,
        };
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', `Failed to check claims: ${error.message}`);
    }
});
//# sourceMappingURL=backfill-claims.js.map
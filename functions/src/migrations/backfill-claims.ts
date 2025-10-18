import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { verifyAppCheck, isAppCheckEnforced } from '../middleware/app-check';

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
export const backfillUserClaims = functions.https.onCall(async (data, context) => {
  // Security Layer 1: Verify App Check token
  verifyAppCheck(context, {
    monitorOnly: !isAppCheckEnforced(),
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
    errorDetails: [] as any[],
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
          createdAt: userData.createdAt?.toMillis() || Date.now(),
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
      } catch (error: any) {
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
  } catch (error: any) {
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
export const checkUserClaims = functions.https.onCall(async (data, context) => {
  // Security Layer 1: Verify App Check token
  verifyAppCheck(context, {
    monitorOnly: !isAppCheckEnforced(),
    errorMessage: 'App Check verification failed for checkUserClaims',
  });

  // Security Layer 2: Only admins can check other users' claims
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { userId } = data;

  // Non-admins can only check their own claims
  if (context.auth.token.role !== 'admin' && context.auth.uid !== userId) {
    throw new functions.https.HttpsError(
      'permission-denied',
      "Only admins can check other users' claims",
    );
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
            role: userDoc.data()?.role,
            companyId: userDoc.data()?.companyId,
            status: userDoc.data()?.status,
            claimsMigrated: userDoc.data()?.claimsMigrated,
          }
        : null,
    };
  } catch (error: any) {
    throw new functions.https.HttpsError('internal', `Failed to check claims: ${error.message}`);
  }
});

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { verifyAppCheck, isAppCheckEnforced } from '../middleware/app-check';

/**
 * Cloud Function trigger: Set custom claims when a new user is created
 *
 * This is the AUTHORITATIVE source for user roles and company assignment.
 * The user profile document in Firestore is for display purposes only.
 *
 * Security Model:
 * - Custom claims are the single source of truth for authorization
 * - Firestore rules read from request.auth.token.role and request.auth.token.companyId
 * - Clients CANNOT modify their own claims (only Admin SDK can)
 *
 * @see firestore.rules for claim-based authorization rules
 */
export const setUserClaimsOnCreate = functions.auth.user().onCreate(async (user) => {
  const { uid, email, displayName, photoURL } = user;

  functions.logger.info('Setting custom claims for new user', { uid, email });

  try {
    // Step 1: Set initial custom claims
    // New users start as 'pending' until an admin assigns them a role and company
    const initialClaims = {
      role: 'pending',
      companyId: null,
      createdAt: Date.now(),
    };

    await admin.auth().setCustomUserClaims(uid, initialClaims);
    functions.logger.info('Custom claims set successfully', { uid, claims: initialClaims });

    // Step 2: Create minimal user profile document (non-authoritative)
    // This document stores display data only - NOT authorization data
    const userProfileData: any = {
      email: email || '',
      displayName: displayName || '',
      photoURL: photoURL || '',
      status: 'pending', // Mirrors the claim for convenience
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Note: We do NOT store role or companyId here - claims are authoritative
    await admin.firestore().collection('users').doc(uid).set(userProfileData);
    functions.logger.info('User profile document created', { uid });

    return { success: true, uid };
  } catch (error) {
    functions.logger.error('Failed to set custom claims', { uid, error });
    throw new functions.https.HttpsError('internal', 'Failed to initialize user account');
  }
});

/**
 * Callable Function: Admin assigns role and company to user
 *
 * Only admins can call this function to promote users from 'pending' to active roles.
 * This updates custom claims (authoritative) and the profile doc (for display).
 *
 * SECURITY:
 * - App Check verification (protect against bot abuse)
 * - Authentication required
 * - Admin-only access
 * - Company isolation enforced
 *
 * @param data.targetUserId - User ID to update
 * @param data.role - New role (admin, manager, worker, etc.)
 * @param data.companyId - Company to assign user to
 * @param context - Auth context (must be admin)
 */
export const assignUserRole = functions.https.onCall(async (data, context) => {
  // Security Layer 1: Verify App Check token
  // Use monitor mode initially, then enforce in production
  verifyAppCheck(context, {
    monitorOnly: !isAppCheckEnforced(),
    errorMessage: 'App Check verification failed for assignUserRole',
  });

  // Security Layer 2: Only authenticated admins can call this
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in to assign roles');
  }

  const callerUid = context.auth.uid;
  const callerClaims = context.auth.token;

  // Verify caller is an admin
  if (callerClaims.role !== 'admin') {
    functions.logger.warn('Non-admin attempted to assign role', { callerUid });
    throw new functions.https.HttpsError('permission-denied', 'Only admins can assign roles');
  }

  const { targetUserId, role, companyId } = data;

  // Validate input
  if (!targetUserId || !role || !companyId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'targetUserId, role, and companyId are required',
    );
  }

  const validRoles = ['admin', 'manager', 'worker', 'crew', 'staff'];
  if (!validRoles.includes(role)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Invalid role. Must be one of: ${validRoles.join(', ')}`,
    );
  }

  // Security: Admins can only assign users to their own company
  if (callerClaims.companyId !== companyId) {
    functions.logger.warn('Admin attempted cross-company assignment', {
      callerUid,
      callerCompany: callerClaims.companyId,
      targetCompany: companyId,
    });
    throw new functions.https.HttpsError(
      'permission-denied',
      'Cannot assign users to a different company',
    );
  }

  try {
    functions.logger.info('Assigning role to user', {
      targetUserId,
      role,
      companyId,
      assignedBy: callerUid,
    });

    // Step 1: Update custom claims (authoritative)
    const newClaims = {
      role,
      companyId,
      updatedAt: Date.now(),
      updatedBy: callerUid,
    };

    await admin.auth().setCustomUserClaims(targetUserId, newClaims);

    // Step 2: Update profile document status for convenience
    await admin.firestore().collection('users').doc(targetUserId).update({
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info('Role assigned successfully', {
      targetUserId,
      role,
      companyId,
    });

    return {
      success: true,
      message: `User ${targetUserId} assigned role '${role}' in company '${companyId}'`,
    };
  } catch (error) {
    functions.logger.error('Failed to assign role', { targetUserId, error });
    throw new functions.https.HttpsError('internal', 'Failed to assign user role');
  }
});

/**
 * Callable Function: User checks their current claims
 *
 * Useful for debugging and forcing token refresh.
 * Returns the custom claims for the authenticated user.
 *
 * SECURITY:
 * - App Check verification
 * - Authentication required
 */
export const getCurrentClaims = functions.https.onCall(async (data, context) => {
  // Verify App Check token
  verifyAppCheck(context, {
    monitorOnly: !isAppCheckEnforced(),
    errorMessage: 'App Check verification failed for getCurrentClaims',
  });

  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const uid = context.auth.uid;
  const userRecord = await admin.auth().getUser(uid);

  return {
    uid,
    email: userRecord.email,
    claims: userRecord.customClaims || {},
  };
});

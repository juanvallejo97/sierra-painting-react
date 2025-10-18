import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {
  sendInvoiceEmail,
  sendPaymentReceivedEmail,
  sendEmployeeInvitationEmail,
} from '../services/email-service';

/**
 * Send invoice notification to client
 *
 * Triggered when invoice status changes to 'sent'
 */
export const sendInvoiceNotification = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { invoiceId } = data;

  if (!invoiceId || typeof invoiceId !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'invoiceId is required and must be a string',
    );
  }

  try {
    const db = admin.firestore();
    const invoiceRef = db.collection('invoices').doc(invoiceId);
    const invoiceSnap = await invoiceRef.get();

    if (!invoiceSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Invoice not found');
    }

    const invoiceData = invoiceSnap.data()!;

    // Verify user has access to this invoice's company
    const userCompanyId = context.auth.token.companyId;
    if (!userCompanyId || userCompanyId !== invoiceData.companyId) {
      throw new functions.https.HttpsError('permission-denied', 'Access denied to this invoice');
    }

    // Get company details
    const companySnap = await db.collection('companies').doc(invoiceData.companyId).get();
    const companyData = companySnap.data();
    const companyName = companyData?.name || 'Sierra Painting';

    // Validate recipient email
    if (!invoiceData.clientEmail) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Invoice does not have a client email',
      );
    }

    // Send email
    await sendInvoiceEmail({
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
  } catch (error: any) {
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
export const sendPaymentNotification = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { invoiceId } = data;

  if (!invoiceId || typeof invoiceId !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'invoiceId is required and must be a string',
    );
  }

  try {
    const db = admin.firestore();
    const invoiceRef = db.collection('invoices').doc(invoiceId);
    const invoiceSnap = await invoiceRef.get();

    if (!invoiceSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Invoice not found');
    }

    const invoiceData = invoiceSnap.data()!;

    // Verify user has access to this invoice's company
    const userCompanyId = context.auth.token.companyId;
    if (!userCompanyId || userCompanyId !== invoiceData.companyId) {
      throw new functions.https.HttpsError('permission-denied', 'Access denied to this invoice');
    }

    // Get company details
    const companySnap = await db.collection('companies').doc(invoiceData.companyId).get();
    const companyData = companySnap.data();
    const companyName = companyData?.name || 'Sierra Painting';

    // Validate recipient email
    if (!invoiceData.clientEmail) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Invoice does not have a client email',
      );
    }

    // Send email
    await sendPaymentReceivedEmail({
      recipientEmail: invoiceData.clientEmail,
      recipientName: invoiceData.client,
      invoiceNumber: invoiceData.invoiceNumber,
      amountPaid: invoiceData.amountPaid || 0,
      remainingBalance: invoiceData.remainingBalance || 0,
      companyName,
    });

    return { success: true, message: 'Payment notification sent successfully' };
  } catch (error: any) {
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
export const sendEmployeeInvitation = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Verify user is admin or manager
  const userRole = context.auth.token.role;
  if (!userRole || (userRole !== 'admin' && userRole !== 'manager')) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins and managers can invite employees',
    );
  }

  const { employeeEmail, employeeName, role } = data;

  if (!employeeEmail || typeof employeeEmail !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'employeeEmail is required and must be a string',
    );
  }

  if (!employeeName || typeof employeeName !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'employeeName is required and must be a string',
    );
  }

  if (!role || typeof role !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'role is required and must be a string',
    );
  }

  try {
    const db = admin.firestore();
    const userCompanyId = context.auth.token.companyId;

    if (!userCompanyId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'User does not have a company assignment',
      );
    }

    // Get company and inviter details
    const companySnap = await db.collection('companies').doc(userCompanyId).get();
    const companyData = companySnap.data();
    const companyName = companyData?.name || 'Sierra Painting';

    const inviterSnap = await db.collection('users').doc(context.auth.uid).get();
    const inviterData = inviterSnap.data();
    const inviterName = inviterData?.name || inviterData?.email || 'Your manager';

    // Generate signup URL with invitation token
    const signupUrl = `${process.env.FIREBASE_AUTH_DOMAIN || 'https://sierra-painting.com'}/signup?email=${encodeURIComponent(employeeEmail)}&invite=1`;

    // Send invitation email
    await sendEmployeeInvitationEmail({
      recipientEmail: employeeEmail,
      recipientName: employeeName,
      inviterName,
      companyName,
      role,
      signupUrl,
    });

    return { success: true, message: 'Invitation email sent successfully' };
  } catch (error: any) {
    console.error('Error sending employee invitation:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'Failed to send invitation email');
  }
});

/**
 * Notification Service
 *
 * Comprehensive notification system for in-app notifications
 * Supports various notification types and actions
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Notification Types
 */
export enum NotificationType {
  // Job Notifications
  JOB_ASSIGNED = 'job_assigned',
  JOB_STATUS_CHANGED = 'job_status_changed',
  JOB_COMPLETED = 'job_completed',
  JOB_CANCELLED = 'job_cancelled',
  JOB_COMMENT = 'job_comment',

  // Invoice Notifications
  INVOICE_CREATED = 'invoice_created',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_OVERDUE = 'invoice_overdue',
  INVOICE_SENT = 'invoice_sent',
  PAYMENT_RECEIVED = 'payment_received',

  // Time Entry Notifications
  TIME_ENTRY_APPROVED = 'time_entry_approved',
  TIME_ENTRY_REJECTED = 'time_entry_rejected',
  TIME_ENTRY_REMINDER = 'time_entry_reminder',

  // User Notifications
  USER_INVITED = 'user_invited',
  USER_ROLE_CHANGED = 'user_role_changed',
  USER_MENTIONED = 'user_mentioned',

  // System Notifications
  SYSTEM_UPDATE = 'system_update',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  SYSTEM_ALERT = 'system_alert',

  // General
  MESSAGE = 'message',
  REMINDER = 'reminder',
  ANNOUNCEMENT = 'announcement',
}

/**
 * Notification Priority
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Notification Action
 */
export interface NotificationAction {
  label: string;
  action: string; // e.g., "view_job", "approve_time_entry"
  data?: Record<string, unknown>;
}

/**
 * Notification Interface
 */
export interface Notification {
  id?: string;
  type: NotificationType;
  priority: NotificationPriority;
  userId: string;
  companyId: string;

  // Content
  title: string;
  message: string;
  icon?: string;

  // Actions
  actions?: NotificationAction[];

  // Link/Navigation
  link?: string; // e.g., "/jobs/123"

  // Metadata
  metadata?: Record<string, unknown>;
  relatedResourceType?: string; // e.g., "job", "invoice"
  relatedResourceId?: string;

  // Status
  read: boolean;
  readAt?: Timestamp;
  archived: boolean;

  // Timestamps
  createdAt: Timestamp;
  expiresAt?: Timestamp; // Auto-delete after this time
}

/**
 * Notification Preferences
 */
export interface NotificationPreferences {
  userId: string;
  companyId: string;

  // Channel preferences
  inApp: boolean;
  email: boolean;
  push: boolean; // Future: Push notifications

  // Type preferences (which types to receive)
  enabledTypes: NotificationType[];

  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // e.g., "22:00"
  quietHoursEnd?: string; // e.g., "08:00"

  updatedAt: Timestamp;
}

/**
 * Create a notification
 */
export async function createNotification(
  notification: Omit<Notification, 'id' | 'createdAt' | 'read' | 'readAt' | 'archived'>
): Promise<string> {
  try {
    const notificationData = {
      ...notification,
      read: false,
      archived: false,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'notifications'), notificationData);

    console.log('[Notifications] Created notification:', docRef.id);

    return docRef.id;
  } catch (error) {
    console.error('[Notifications] Failed to create notification:', error);
    throw error;
  }
}

/**
 * Create notifications for multiple users
 */
export async function createBulkNotifications(
  userIds: string[],
  notificationData: Omit<
    Notification,
    'id' | 'userId' | 'createdAt' | 'read' | 'readAt' | 'archived'
  >
): Promise<void> {
  try {
    const batch = writeBatch(db);

    userIds.forEach((userId) => {
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        ...notificationData,
        userId,
        read: false,
        archived: false,
        createdAt: serverTimestamp(),
      });
    });

    await batch.commit();

    console.log('[Notifications] Created bulk notifications for', userIds.length, 'users');
  } catch (error) {
    console.error('[Notifications] Failed to create bulk notifications:', error);
    throw error;
  }
}

/**
 * Get notifications for a user
 */
export async function getNotifications(
  userId: string,
  options: {
    unreadOnly?: boolean;
    limitCount?: number;
    type?: NotificationType;
  } = {}
): Promise<Notification[]> {
  try {
    let q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('archived', '==', false),
      orderBy('createdAt', 'desc')
    );

    if (options.unreadOnly) {
      q = query(q, where('read', '==', false));
    }

    if (options.type) {
      q = query(q, where('type', '==', options.type));
    }

    if (options.limitCount) {
      q = query(q, limit(options.limitCount));
    }

    const snapshot = await getDocs(q);

    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Notification
    );
  } catch (error) {
    console.error('[Notifications] Failed to get notifications:', error);
    return [];
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false),
      where('archived', '==', false)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('[Notifications] Failed to get unread count:', error);
    return 0;
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  try {
    const notifRef = doc(db, 'notifications', notificationId);

    await updateDoc(notifRef, {
      read: true,
      readAt: serverTimestamp(),
    });

    console.log('[Notifications] Marked as read:', notificationId);
  } catch (error) {
    console.error('[Notifications] Failed to mark as read:', error);
    throw error;
  }
}

/**
 * Mark multiple notifications as read
 */
export async function markMultipleAsRead(notificationIds: string[]): Promise<void> {
  try {
    const batch = writeBatch(db);

    notificationIds.forEach((id) => {
      const notifRef = doc(db, 'notifications', id);
      batch.update(notifRef, {
        read: true,
        readAt: serverTimestamp(),
      });
    });

    await batch.commit();

    console.log('[Notifications] Marked', notificationIds.length, 'as read');
  } catch (error) {
    console.error('[Notifications] Failed to mark multiple as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<void> {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('[Notifications] No unread notifications to mark');
      return;
    }

    const batch = writeBatch(db);

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        read: true,
        readAt: serverTimestamp(),
      });
    });

    await batch.commit();

    console.log('[Notifications] Marked all as read for user:', userId);
  } catch (error) {
    console.error('[Notifications] Failed to mark all as read:', error);
    throw error;
  }
}

/**
 * Archive notification
 */
export async function archiveNotification(notificationId: string): Promise<void> {
  try {
    const notifRef = doc(db, 'notifications', notificationId);

    await updateDoc(notifRef, {
      archived: true,
    });

    console.log('[Notifications] Archived:', notificationId);
  } catch (error) {
    console.error('[Notifications] Failed to archive:', error);
    throw error;
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));

    console.log('[Notifications] Deleted:', notificationId);
  } catch (error) {
    console.error('[Notifications] Failed to delete:', error);
    throw error;
  }
}

/**
 * Delete all notifications for a user
 */
export async function deleteAllNotifications(userId: string): Promise<void> {
  try {
    const q = query(collection(db, 'notifications'), where('userId', '==', userId));

    const snapshot = await getDocs(q);

    if (snapshot.empty) return;

    const batch = writeBatch(db);

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log('[Notifications] Deleted all for user:', userId);
  } catch (error) {
    console.error('[Notifications] Failed to delete all:', error);
    throw error;
  }
}

// ============================================================================
// Notification Preferences
// ============================================================================

/**
 * Get user notification preferences
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences | null> {
  try {
    const docRef = doc(db, 'notificationPreferences', userId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // Return default preferences
      return {
        userId,
        companyId: '',
        inApp: true,
        email: true,
        push: false,
        enabledTypes: Object.values(NotificationType),
        quietHoursEnabled: false,
        updatedAt: serverTimestamp() as Timestamp,
      };
    }

    return docSnap.data() as NotificationPreferences;
  } catch (error) {
    console.error('[Notifications] Failed to get preferences:', error);
    return null;
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<void> {
  try {
    const docRef = doc(db, 'notificationPreferences', userId);

    await updateDoc(docRef, {
      ...preferences,
      updatedAt: serverTimestamp(),
    });

    console.log('[Notifications] Updated preferences for:', userId);
  } catch (error) {
    console.error('[Notifications] Failed to update preferences:', error);
    throw error;
  }
}

// ============================================================================
// Convenience Functions for Common Notifications
// ============================================================================

/**
 * Notify user about job assignment
 */
export async function notifyJobAssigned(params: {
  userId: string;
  companyId: string;
  jobId: string;
  jobName: string;
  assignedBy: string;
}): Promise<string> {
  return createNotification({
    type: NotificationType.JOB_ASSIGNED,
    priority: NotificationPriority.NORMAL,
    userId: params.userId,
    companyId: params.companyId,
    title: 'New Job Assigned',
    message: `You have been assigned to "${params.jobName}"`,
    link: `/jobs/${params.jobId}`,
    icon: '📋',
    relatedResourceType: 'job',
    relatedResourceId: params.jobId,
    metadata: {
      jobId: params.jobId,
      jobName: params.jobName,
      assignedBy: params.assignedBy,
    },
    actions: [
      {
        label: 'View Job',
        action: 'view_job',
        data: { jobId: params.jobId },
      },
    ],
  });
}

/**
 * Notify user about job status change
 */
export async function notifyJobStatusChanged(params: {
  userId: string;
  companyId: string;
  jobId: string;
  jobName: string;
  oldStatus: string;
  newStatus: string;
}): Promise<string> {
  return createNotification({
    type: NotificationType.JOB_STATUS_CHANGED,
    priority: NotificationPriority.NORMAL,
    userId: params.userId,
    companyId: params.companyId,
    title: 'Job Status Updated',
    message: `"${params.jobName}" changed from ${params.oldStatus} to ${params.newStatus}`,
    link: `/jobs/${params.jobId}`,
    icon: '🔄',
    relatedResourceType: 'job',
    relatedResourceId: params.jobId,
    metadata: params,
  });
}

/**
 * Notify user about invoice payment
 */
export async function notifyInvoicePaid(params: {
  userId: string;
  companyId: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
}): Promise<string> {
  return createNotification({
    type: NotificationType.INVOICE_PAID,
    priority: NotificationPriority.HIGH,
    userId: params.userId,
    companyId: params.companyId,
    title: 'Invoice Paid',
    message: `Invoice #${params.invoiceNumber} has been paid ($${params.amount.toFixed(2)})`,
    link: `/invoices/${params.invoiceId}`,
    icon: '💰',
    relatedResourceType: 'invoice',
    relatedResourceId: params.invoiceId,
    metadata: params,
  });
}

/**
 * Notify user about time entry approval
 */
export async function notifyTimeEntryApproved(params: {
  userId: string;
  companyId: string;
  timeEntryId: string;
  date: string;
  hours: number;
}): Promise<string> {
  return createNotification({
    type: NotificationType.TIME_ENTRY_APPROVED,
    priority: NotificationPriority.NORMAL,
    userId: params.userId,
    companyId: params.companyId,
    title: 'Time Entry Approved',
    message: `Your time entry for ${params.date} (${params.hours}h) has been approved`,
    link: `/time-entries`,
    icon: '✅',
    relatedResourceType: 'timeEntry',
    relatedResourceId: params.timeEntryId,
    metadata: params,
  });
}

/**
 * Notify user about being mentioned
 */
export async function notifyUserMentioned(params: {
  userId: string;
  companyId: string;
  mentionedBy: string;
  mentionedByName: string;
  context: string;
  link?: string;
}): Promise<string> {
  return createNotification({
    type: NotificationType.USER_MENTIONED,
    priority: NotificationPriority.NORMAL,
    userId: params.userId,
    companyId: params.companyId,
    title: 'You were mentioned',
    message: `${params.mentionedByName} mentioned you: "${params.context}"`,
    link: params.link,
    icon: '@',
    metadata: params,
  });
}

/**
 * Send system announcement to all users in a company
 */
export async function sendAnnouncement(params: {
  companyId: string;
  userIds: string[];
  title: string;
  message: string;
  priority?: NotificationPriority;
  expiresInDays?: number;
}): Promise<void> {
  const expiresAt = params.expiresInDays
    ? Timestamp.fromDate(new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000))
    : undefined;

  await createBulkNotifications(params.userIds, {
    type: NotificationType.ANNOUNCEMENT,
    priority: params.priority || NotificationPriority.NORMAL,
    companyId: params.companyId,
    title: params.title,
    message: params.message,
    icon: '📢',
    expiresAt,
  });
}

/**
 * Clean up expired notifications
 */
export async function cleanupExpiredNotifications(): Promise<void> {
  try {
    const now = Timestamp.now();

    const q = query(
      collection(db, 'notifications'),
      where('expiresAt', '<=', now)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('[Notifications] No expired notifications to clean up');
      return;
    }

    const batch = writeBatch(db);

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log('[Notifications] Cleaned up', snapshot.size, 'expired notifications');
  } catch (error) {
    console.error('[Notifications] Failed to cleanup expired notifications:', error);
  }
}

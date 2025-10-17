/**
 * Activity Tracker
 *
 * Tracks all user and system activities for activity feed and timeline
 */

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Activity Types
 */
export enum ActivityType {
  // Job Activities
  JOB_CREATED = 'job_created',
  JOB_UPDATED = 'job_updated',
  JOB_DELETED = 'job_deleted',
  JOB_ASSIGNED = 'job_assigned',
  JOB_UNASSIGNED = 'job_unassigned',
  JOB_STATUS_CHANGED = 'job_status_changed',
  JOB_COMPLETED = 'job_completed',
  JOB_COMMENT_ADDED = 'job_comment_added',

  // Invoice Activities
  INVOICE_CREATED = 'invoice_created',
  INVOICE_UPDATED = 'invoice_updated',
  INVOICE_DELETED = 'invoice_deleted',
  INVOICE_SENT = 'invoice_sent',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_PAYMENT_RECEIVED = 'invoice_payment_received',

  // Time Entry Activities
  TIME_ENTRY_CREATED = 'time_entry_created',
  TIME_ENTRY_UPDATED = 'time_entry_updated',
  TIME_ENTRY_DELETED = 'time_entry_deleted',
  TIME_ENTRY_APPROVED = 'time_entry_approved',
  TIME_ENTRY_REJECTED = 'time_entry_rejected',

  // User Activities
  USER_LOGGED_IN = 'user_logged_in',
  USER_LOGGED_OUT = 'user_logged_out',
  USER_INVITED = 'user_invited',
  USER_JOINED = 'user_joined',
  USER_ROLE_CHANGED = 'user_role_changed',
  USER_PROFILE_UPDATED = 'user_profile_updated',

  // System Activities
  SYSTEM_BACKUP_CREATED = 'system_backup_created',
  SYSTEM_UPDATE = 'system_update',
  SYSTEM_MAINTENANCE = 'system_maintenance',
}

/**
 * Activity Interface
 */
export interface Activity {
  id?: string;
  type: ActivityType;
  userId: string;
  userEmail: string;
  userName: string;
  companyId: string;

  // Activity details
  title: string;
  description: string;
  icon?: string;

  // Related resources
  resourceType?: string; // 'job', 'invoice', 'timeEntry', etc.
  resourceId?: string;
  resourceName?: string;

  // Metadata
  metadata?: Record<string, unknown>;
  changes?: {
    field: string;
    oldValue?: unknown;
    newValue?: unknown;
  }[];

  // Timestamps
  timestamp: Timestamp;
}

/**
 * Create activity log entry
 */
export async function logActivity(
  activity: Omit<Activity, 'id' | 'timestamp'>
): Promise<string> {
  try {
    const activityData = {
      ...activity,
      timestamp: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'activityFeed'), activityData);

    console.log('[Activity] Logged activity:', docRef.id, activity.type);

    return docRef.id;
  } catch (error) {
    console.error('[Activity] Failed to log activity:', error);
    throw error;
  }
}

/**
 * Get activities for a company
 */
export async function getActivities(options: {
  companyId: string;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  type?: ActivityType;
  limitCount?: number;
}): Promise<Activity[]> {
  try {
    let q = query(
      collection(db, 'activityFeed'),
      where('companyId', '==', options.companyId),
      orderBy('timestamp', 'desc')
    );

    if (options.userId) {
      q = query(q, where('userId', '==', options.userId));
    }

    if (options.resourceType) {
      q = query(q, where('resourceType', '==', options.resourceType));
    }

    if (options.resourceId) {
      q = query(q, where('resourceId', '==', options.resourceId));
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
        }) as Activity
    );
  } catch (error) {
    console.error('[Activity] Failed to get activities:', error);
    return [];
  }
}

// ============================================================================
// Convenience Functions for Common Activities
// ============================================================================

/**
 * Log job creation
 */
export async function logJobCreated(params: {
  userId: string;
  userEmail: string;
  userName: string;
  companyId: string;
  jobId: string;
  jobName: string;
}): Promise<string> {
  return logActivity({
    type: ActivityType.JOB_CREATED,
    userId: params.userId,
    userEmail: params.userEmail,
    userName: params.userName,
    companyId: params.companyId,
    title: 'Created new job',
    description: `${params.userName} created "${params.jobName}"`,
    icon: '📋',
    resourceType: 'job',
    resourceId: params.jobId,
    resourceName: params.jobName,
  });
}

/**
 * Log job assignment
 */
export async function logJobAssigned(params: {
  userId: string;
  userEmail: string;
  userName: string;
  companyId: string;
  jobId: string;
  jobName: string;
  assignedToName: string;
}): Promise<string> {
  return logActivity({
    type: ActivityType.JOB_ASSIGNED,
    userId: params.userId,
    userEmail: params.userEmail,
    userName: params.userName,
    companyId: params.companyId,
    title: 'Assigned worker to job',
    description: `${params.userName} assigned ${params.assignedToName} to "${params.jobName}"`,
    icon: '👤',
    resourceType: 'job',
    resourceId: params.jobId,
    resourceName: params.jobName,
    metadata: {
      assignedTo: params.assignedToName,
    },
  });
}

/**
 * Log job status change
 */
export async function logJobStatusChanged(params: {
  userId: string;
  userEmail: string;
  userName: string;
  companyId: string;
  jobId: string;
  jobName: string;
  oldStatus: string;
  newStatus: string;
}): Promise<string> {
  return logActivity({
    type: ActivityType.JOB_STATUS_CHANGED,
    userId: params.userId,
    userEmail: params.userEmail,
    userName: params.userName,
    companyId: params.companyId,
    title: 'Changed job status',
    description: `${params.userName} changed "${params.jobName}" from ${params.oldStatus} to ${params.newStatus}`,
    icon: '🔄',
    resourceType: 'job',
    resourceId: params.jobId,
    resourceName: params.jobName,
    changes: [
      {
        field: 'status',
        oldValue: params.oldStatus,
        newValue: params.newStatus,
      },
    ],
  });
}

/**
 * Log invoice creation
 */
export async function logInvoiceCreated(params: {
  userId: string;
  userEmail: string;
  userName: string;
  companyId: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
}): Promise<string> {
  return logActivity({
    type: ActivityType.INVOICE_CREATED,
    userId: params.userId,
    userEmail: params.userEmail,
    userName: params.userName,
    companyId: params.companyId,
    title: 'Created invoice',
    description: `${params.userName} created invoice #${params.invoiceNumber} ($${params.amount.toFixed(2)})`,
    icon: '📄',
    resourceType: 'invoice',
    resourceId: params.invoiceId,
    resourceName: `Invoice #${params.invoiceNumber}`,
    metadata: {
      invoiceNumber: params.invoiceNumber,
      amount: params.amount,
    },
  });
}

/**
 * Log invoice payment
 */
export async function logInvoicePaid(params: {
  userId: string;
  userEmail: string;
  userName: string;
  companyId: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
}): Promise<string> {
  return logActivity({
    type: ActivityType.INVOICE_PAID,
    userId: params.userId,
    userEmail: params.userEmail,
    userName: params.userName,
    companyId: params.companyId,
    title: 'Invoice paid',
    description: `Invoice #${params.invoiceNumber} was paid ($${params.amount.toFixed(2)})`,
    icon: '💰',
    resourceType: 'invoice',
    resourceId: params.invoiceId,
    resourceName: `Invoice #${params.invoiceNumber}`,
    metadata: {
      invoiceNumber: params.invoiceNumber,
      amount: params.amount,
    },
  });
}

/**
 * Log time entry approval
 */
export async function logTimeEntryApproved(params: {
  userId: string;
  userEmail: string;
  userName: string;
  companyId: string;
  timeEntryId: string;
  workerName: string;
  date: string;
  hours: number;
}): Promise<string> {
  return logActivity({
    type: ActivityType.TIME_ENTRY_APPROVED,
    userId: params.userId,
    userEmail: params.userEmail,
    userName: params.userName,
    companyId: params.companyId,
    title: 'Approved time entry',
    description: `${params.userName} approved ${params.workerName}'s time entry for ${params.date} (${params.hours}h)`,
    icon: '✅',
    resourceType: 'timeEntry',
    resourceId: params.timeEntryId,
    metadata: {
      workerName: params.workerName,
      date: params.date,
      hours: params.hours,
    },
  });
}

/**
 * Log user login
 */
export async function logUserLogin(params: {
  userId: string;
  userEmail: string;
  userName: string;
  companyId: string;
}): Promise<string> {
  return logActivity({
    type: ActivityType.USER_LOGGED_IN,
    userId: params.userId,
    userEmail: params.userEmail,
    userName: params.userName,
    companyId: params.companyId,
    title: 'User logged in',
    description: `${params.userName} logged in`,
    icon: '🔐',
  });
}

/**
 * Log user joined
 */
export async function logUserJoined(params: {
  userId: string;
  userEmail: string;
  userName: string;
  companyId: string;
}): Promise<string> {
  return logActivity({
    type: ActivityType.USER_JOINED,
    userId: params.userId,
    userEmail: params.userEmail,
    userName: params.userName,
    companyId: params.companyId,
    title: 'New user joined',
    description: `${params.userName} joined the company`,
    icon: '👋',
  });
}

/**
 * Get activity icon for type
 */
export function getActivityIcon(type: ActivityType): string {
  const icons: Record<ActivityType, string> = {
    [ActivityType.JOB_CREATED]: '📋',
    [ActivityType.JOB_UPDATED]: '✏️',
    [ActivityType.JOB_DELETED]: '🗑️',
    [ActivityType.JOB_ASSIGNED]: '👤',
    [ActivityType.JOB_UNASSIGNED]: '👤',
    [ActivityType.JOB_STATUS_CHANGED]: '🔄',
    [ActivityType.JOB_COMPLETED]: '✅',
    [ActivityType.JOB_COMMENT_ADDED]: '💬',
    [ActivityType.INVOICE_CREATED]: '📄',
    [ActivityType.INVOICE_UPDATED]: '✏️',
    [ActivityType.INVOICE_DELETED]: '🗑️',
    [ActivityType.INVOICE_SENT]: '📧',
    [ActivityType.INVOICE_PAID]: '💰',
    [ActivityType.INVOICE_PAYMENT_RECEIVED]: '💵',
    [ActivityType.TIME_ENTRY_CREATED]: '⏱️',
    [ActivityType.TIME_ENTRY_UPDATED]: '✏️',
    [ActivityType.TIME_ENTRY_DELETED]: '🗑️',
    [ActivityType.TIME_ENTRY_APPROVED]: '✅',
    [ActivityType.TIME_ENTRY_REJECTED]: '❌',
    [ActivityType.USER_LOGGED_IN]: '🔐',
    [ActivityType.USER_LOGGED_OUT]: '🚪',
    [ActivityType.USER_INVITED]: '✉️',
    [ActivityType.USER_JOINED]: '👋',
    [ActivityType.USER_ROLE_CHANGED]: '🔑',
    [ActivityType.USER_PROFILE_UPDATED]: '👤',
    [ActivityType.SYSTEM_BACKUP_CREATED]: '💾',
    [ActivityType.SYSTEM_UPDATE]: '🔄',
    [ActivityType.SYSTEM_MAINTENANCE]: '🔧',
  };

  return icons[type] || '📌';
}

/**
 * Get human-readable title for activity type
 */
export function getActivityTitle(type: ActivityType): string {
  const titles: Record<ActivityType, string> = {
    [ActivityType.JOB_CREATED]: 'Created Job',
    [ActivityType.JOB_UPDATED]: 'Updated Job',
    [ActivityType.JOB_DELETED]: 'Deleted Job',
    [ActivityType.JOB_ASSIGNED]: 'Assigned Worker',
    [ActivityType.JOB_UNASSIGNED]: 'Unassigned Worker',
    [ActivityType.JOB_STATUS_CHANGED]: 'Changed Job Status',
    [ActivityType.JOB_COMPLETED]: 'Completed Job',
    [ActivityType.JOB_COMMENT_ADDED]: 'Added Comment',
    [ActivityType.INVOICE_CREATED]: 'Created Invoice',
    [ActivityType.INVOICE_UPDATED]: 'Updated Invoice',
    [ActivityType.INVOICE_DELETED]: 'Deleted Invoice',
    [ActivityType.INVOICE_SENT]: 'Sent Invoice',
    [ActivityType.INVOICE_PAID]: 'Invoice Paid',
    [ActivityType.INVOICE_PAYMENT_RECEIVED]: 'Payment Received',
    [ActivityType.TIME_ENTRY_CREATED]: 'Created Time Entry',
    [ActivityType.TIME_ENTRY_UPDATED]: 'Updated Time Entry',
    [ActivityType.TIME_ENTRY_DELETED]: 'Deleted Time Entry',
    [ActivityType.TIME_ENTRY_APPROVED]: 'Approved Time Entry',
    [ActivityType.TIME_ENTRY_REJECTED]: 'Rejected Time Entry',
    [ActivityType.USER_LOGGED_IN]: 'Logged In',
    [ActivityType.USER_LOGGED_OUT]: 'Logged Out',
    [ActivityType.USER_INVITED]: 'Invited User',
    [ActivityType.USER_JOINED]: 'User Joined',
    [ActivityType.USER_ROLE_CHANGED]: 'Changed Role',
    [ActivityType.USER_PROFILE_UPDATED]: 'Updated Profile',
    [ActivityType.SYSTEM_BACKUP_CREATED]: 'Backup Created',
    [ActivityType.SYSTEM_UPDATE]: 'System Update',
    [ActivityType.SYSTEM_MAINTENANCE]: 'Maintenance',
  };

  return titles[type] || type.replace(/_/g, ' ');
}

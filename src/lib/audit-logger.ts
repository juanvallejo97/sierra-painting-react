/**
 * Audit Logger
 *
 * Comprehensive audit logging for compliance and security
 * Tracks all user actions, data changes, and system events
 */

import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { auth } from './firebase';

/**
 * Audit Event Types
 */
export enum AuditEventType {
  // Authentication
  LOGIN = 'login',
  LOGOUT = 'logout',
  SIGNUP = 'signup',
  PASSWORD_RESET = 'password_reset',
  PASSWORD_CHANGE = 'password_change',

  // Data Operations
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  READ = 'read',
  EXPORT = 'export',

  // Permission Changes
  PERMISSION_GRANT = 'permission_grant',
  PERMISSION_REVOKE = 'permission_revoke',
  ROLE_CHANGE = 'role_change',

  // Job Operations
  JOB_CREATED = 'job_created',
  JOB_UPDATED = 'job_updated',
  JOB_DELETED = 'job_deleted',
  JOB_STATUS_CHANGED = 'job_status_changed',
  JOB_ASSIGNED = 'job_assigned',

  // Invoice Operations
  INVOICE_CREATED = 'invoice_created',
  INVOICE_UPDATED = 'invoice_updated',
  INVOICE_DELETED = 'invoice_deleted',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_SENT = 'invoice_sent',

  // Employee Operations
  EMPLOYEE_INVITED = 'employee_invited',
  EMPLOYEE_ACTIVATED = 'employee_activated',
  EMPLOYEE_DEACTIVATED = 'employee_deactivated',
  EMPLOYEE_ROLE_CHANGED = 'employee_role_changed',

  // System Events
  SYSTEM_ERROR = 'system_error',
  SECURITY_ALERT = 'security_alert',
  DATA_BREACH_ATTEMPT = 'data_breach_attempt',

  // Compliance Events
  GDPR_DATA_EXPORT = 'gdpr_data_export',
  GDPR_DATA_DELETION = 'gdpr_data_deletion',
  CONSENT_GRANTED = 'consent_granted',
  CONSENT_REVOKED = 'consent_revoked',
}

/**
 * Audit Event Severity
 */
export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Audit Log Entry
 */
export interface AuditLogEntry {
  id?: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId: string;
  userEmail: string;
  companyId: string;
  timestamp: Timestamp;
  ipAddress?: string;
  userAgent?: string;
  resource?: string; // e.g., "jobs/job-123"
  action?: string; // Human-readable action
  metadata?: Record<string, unknown>;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
}

/**
 * Get current user IP address (anonymized)
 */
async function getAnonymizedIP(): Promise<string | undefined> {
  try {
    // In production, this would use a server-side API to get IP
    // For client-side, we anonymize by removing last octet
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    const ip = data.ip as string;

    // Anonymize IPv4: 192.168.1.100 -> 192.168.1.0
    if (ip.includes('.')) {
      const parts = ip.split('.');
      parts[3] = '0';
      return parts.join('.');
    }

    // Anonymize IPv6: remove last 64 bits
    if (ip.includes(':')) {
      const parts = ip.split(':');
      return parts.slice(0, 4).join(':') + '::0';
    }

    return 'unknown';
  } catch {
    return undefined;
  }
}

/**
 * Log audit event
 */
export async function logAuditEvent(
  eventType: AuditEventType,
  options: {
    severity?: AuditSeverity;
    resource?: string;
    action?: string;
    metadata?: Record<string, unknown>;
    changes?: {
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
    };
  } = {}
): Promise<void> {
  const user = auth.currentUser;

  if (!user) {
    console.warn('[Audit] Cannot log event: No authenticated user');
    return;
  }

  // Get user's company ID from custom claims or localStorage
  const companyId = localStorage.getItem('userCompanyId') || 'unknown';

  try {
    const auditEntry: Omit<AuditLogEntry, 'id'> = {
      eventType,
      severity: options.severity || AuditSeverity.INFO,
      userId: user.uid,
      userEmail: user.email || 'unknown',
      companyId,
      timestamp: serverTimestamp() as Timestamp,
      ipAddress: await getAnonymizedIP(),
      userAgent: navigator.userAgent,
      resource: options.resource,
      action: options.action,
      metadata: options.metadata,
      changes: options.changes,
    };

    await addDoc(collection(db, 'auditLogs'), auditEntry);

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log('[Audit]', eventType, auditEntry);
    }
  } catch (error) {
    console.error('[Audit] Failed to log event:', error);
    // Don't throw - audit logging should not break app functionality
  }
}

/**
 * Log authentication events
 */
export async function logLogin(method: string): Promise<void> {
  await logAuditEvent(AuditEventType.LOGIN, {
    severity: AuditSeverity.INFO,
    action: `User logged in via ${method}`,
    metadata: { method },
  });
}

export async function logLogout(): Promise<void> {
  await logAuditEvent(AuditEventType.LOGOUT, {
    severity: AuditSeverity.INFO,
    action: 'User logged out',
  });
}

export async function logSignup(method: string): Promise<void> {
  await logAuditEvent(AuditEventType.SIGNUP, {
    severity: AuditSeverity.INFO,
    action: `New user signed up via ${method}`,
    metadata: { method },
  });
}

/**
 * Log data operations
 */
export async function logDataCreate(
  resource: string,
  resourceId: string,
  data: Record<string, unknown>
): Promise<void> {
  await logAuditEvent(AuditEventType.CREATE, {
    severity: AuditSeverity.INFO,
    resource: `${resource}/${resourceId}`,
    action: `Created ${resource}`,
    changes: { after: data },
  });
}

export async function logDataUpdate(
  resource: string,
  resourceId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Promise<void> {
  await logAuditEvent(AuditEventType.UPDATE, {
    severity: AuditSeverity.INFO,
    resource: `${resource}/${resourceId}`,
    action: `Updated ${resource}`,
    changes: { before, after },
  });
}

export async function logDataDelete(
  resource: string,
  resourceId: string,
  data: Record<string, unknown>
): Promise<void> {
  await logAuditEvent(AuditEventType.DELETE, {
    severity: AuditSeverity.WARNING,
    resource: `${resource}/${resourceId}`,
    action: `Deleted ${resource}`,
    changes: { before: data },
  });
}

export async function logDataExport(
  resource: string,
  format: string,
  recordCount: number
): Promise<void> {
  await logAuditEvent(AuditEventType.EXPORT, {
    severity: AuditSeverity.INFO,
    resource,
    action: `Exported ${recordCount} ${resource} records`,
    metadata: { format, recordCount },
  });
}

/**
 * Log job operations
 */
export async function logJobCreated(jobId: string, jobData: Record<string, unknown>): Promise<void> {
  await logAuditEvent(AuditEventType.JOB_CREATED, {
    severity: AuditSeverity.INFO,
    resource: `jobs/${jobId}`,
    action: `Created job: ${jobData.name || jobId}`,
    metadata: { jobId, status: jobData.status },
  });
}

export async function logJobStatusChanged(
  jobId: string,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  await logAuditEvent(AuditEventType.JOB_STATUS_CHANGED, {
    severity: AuditSeverity.INFO,
    resource: `jobs/${jobId}`,
    action: `Changed job status from ${oldStatus} to ${newStatus}`,
    changes: {
      before: { status: oldStatus },
      after: { status: newStatus },
    },
  });
}

/**
 * Log invoice operations
 */
export async function logInvoiceCreated(
  invoiceId: string,
  amount: number
): Promise<void> {
  await logAuditEvent(AuditEventType.INVOICE_CREATED, {
    severity: AuditSeverity.INFO,
    resource: `invoices/${invoiceId}`,
    action: `Created invoice for $${amount.toFixed(2)}`,
    metadata: { invoiceId, amount },
  });
}

export async function logInvoicePaid(
  invoiceId: string,
  amount: number,
  paymentMethod: string
): Promise<void> {
  await logAuditEvent(AuditEventType.INVOICE_PAID, {
    severity: AuditSeverity.INFO,
    resource: `invoices/${invoiceId}`,
    action: `Invoice paid: $${amount.toFixed(2)} via ${paymentMethod}`,
    metadata: { invoiceId, amount, paymentMethod },
  });
}

/**
 * Log permission changes
 */
export async function logRoleChange(
  targetUserId: string,
  oldRole: string,
  newRole: string
): Promise<void> {
  await logAuditEvent(AuditEventType.ROLE_CHANGE, {
    severity: AuditSeverity.WARNING,
    resource: `users/${targetUserId}`,
    action: `Changed user role from ${oldRole} to ${newRole}`,
    changes: {
      before: { role: oldRole },
      after: { role: newRole },
    },
  });
}

/**
 * Log security events
 */
export async function logSecurityAlert(
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent(AuditEventType.SECURITY_ALERT, {
    severity: AuditSeverity.CRITICAL,
    action: message,
    metadata,
  });
}

export async function logDataBreachAttempt(
  resource: string,
  reason: string
): Promise<void> {
  await logAuditEvent(AuditEventType.DATA_BREACH_ATTEMPT, {
    severity: AuditSeverity.CRITICAL,
    resource,
    action: `Attempted unauthorized access to ${resource}: ${reason}`,
  });
}

/**
 * Log GDPR compliance events
 */
export async function logGDPRDataExport(userId: string): Promise<void> {
  await logAuditEvent(AuditEventType.GDPR_DATA_EXPORT, {
    severity: AuditSeverity.INFO,
    resource: `users/${userId}`,
    action: 'User requested GDPR data export',
  });
}

export async function logGDPRDataDeletion(userId: string): Promise<void> {
  await logAuditEvent(AuditEventType.GDPR_DATA_DELETION, {
    severity: AuditSeverity.WARNING,
    resource: `users/${userId}`,
    action: 'User requested GDPR data deletion',
  });
}

/**
 * Query audit logs (admin only)
 */
export async function getAuditLogs(options: {
  companyId: string;
  userId?: string;
  eventType?: AuditEventType;
  startDate?: Date;
  endDate?: Date;
  limitCount?: number;
}): Promise<AuditLogEntry[]> {
  try {
    let q = query(
      collection(db, 'auditLogs'),
      where('companyId', '==', options.companyId),
      orderBy('timestamp', 'desc')
    );

    if (options.userId) {
      q = query(q, where('userId', '==', options.userId));
    }

    if (options.eventType) {
      q = query(q, where('eventType', '==', options.eventType));
    }

    if (options.startDate) {
      q = query(q, where('timestamp', '>=', Timestamp.fromDate(options.startDate)));
    }

    if (options.endDate) {
      q = query(q, where('timestamp', '<=', Timestamp.fromDate(options.endDate)));
    }

    if (options.limitCount) {
      q = query(q, limit(options.limitCount));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as AuditLogEntry[];
  } catch (error) {
    console.error('[Audit] Failed to query audit logs:', error);
    return [];
  }
}

/**
 * Export audit logs to CSV
 */
export function exportAuditLogsToCSV(logs: AuditLogEntry[]): string {
  const headers = [
    'Timestamp',
    'Event Type',
    'Severity',
    'User Email',
    'Action',
    'Resource',
    'IP Address',
  ];

  const rows = logs.map((log) => [
    log.timestamp?.toDate().toISOString() || '',
    log.eventType,
    log.severity,
    log.userEmail,
    log.action || '',
    log.resource || '',
    log.ipAddress || '',
  ]);

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

  return csv;
}

/**
 * Download audit logs as CSV file
 */
export function downloadAuditLogsCSV(logs: AuditLogEntry[], filename = 'audit-logs.csv'): void {
  const csv = exportAuditLogsToCSV(logs);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

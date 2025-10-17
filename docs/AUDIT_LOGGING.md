# Audit Logging Guide

**Date**: 2025-10-17
**Status**: ✅ Implemented
**Version**: 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Event Types](#event-types)
3. [Implementation](#implementation)
4. [Querying Audit Logs](#querying-audit-logs)
5. [Compliance](#compliance)
6. [Retention Policy](#retention-policy)
7. [Security](#security)
8. [Best Practices](#best-practices)

---

## Overview

The audit logging system provides comprehensive tracking of all user actions and system events for:
- ✅ **Compliance** - GDPR, SOC 2, HIPAA requirements
- ✅ **Security** - Detect unauthorized access attempts
- ✅ **Debugging** - Trace issues and understand user behavior
- ✅ **Accountability** - Track who did what and when

### Key Features

- **Immutable Logs**: Audit logs cannot be modified once created
- **Anonymized IP**: IP addresses are anonymized for privacy
- **Multi-tenant Isolation**: Each company's logs are isolated
- **Admin-only Access**: Only admins can view audit logs
- **Automatic Tracking**: Critical events logged automatically
- **Export Capability**: CSV export for compliance reports

---

## Event Types

### Authentication Events

| Event | Type | Severity | Description |
|-------|------|----------|-------------|
| Login | `login` | INFO | User logged in |
| Logout | `logout` | INFO | User logged out |
| Signup | `signup` | INFO | New user registered |
| Password Reset | `password_reset` | INFO | Password reset requested |
| Password Change | `password_change` | INFO | Password changed |

### Data Operations

| Event | Type | Severity | Description |
|-------|------|----------|-------------|
| Create | `create` | INFO | Record created |
| Update | `update` | INFO | Record updated |
| Delete | `delete` | WARNING | Record deleted |
| Read | `read` | INFO | Record accessed |
| Export | `export` | INFO | Data exported |

### Permission Changes

| Event | Type | Severity | Description |
|-------|------|----------|-------------|
| Role Change | `role_change` | WARNING | User role changed |
| Permission Grant | `permission_grant` | WARNING | Permission granted |
| Permission Revoke | `permission_revoke` | WARNING | Permission revoked |

### Business Events

| Event | Type | Severity | Description |
|-------|------|----------|-------------|
| Job Created | `job_created` | INFO | New job created |
| Job Status Changed | `job_status_changed` | INFO | Job status updated |
| Invoice Paid | `invoice_paid` | INFO | Invoice payment received |
| Employee Activated | `employee_activated` | INFO | Employee activated |

### Security Events

| Event | Type | Severity | Description |
|-------|------|----------|-------------|
| Security Alert | `security_alert` | CRITICAL | Security issue detected |
| Data Breach Attempt | `data_breach_attempt` | CRITICAL | Unauthorized access attempt |

### Compliance Events

| Event | Type | Severity | Description |
|-------|------|----------|-------------|
| GDPR Data Export | `gdpr_data_export` | INFO | User requested data export |
| GDPR Data Deletion | `gdpr_data_deletion` | WARNING | User requested data deletion |
| Consent Granted | `consent_granted` | INFO | User granted consent |
| Consent Revoked | `consent_revoked` | WARNING | User revoked consent |

---

## Implementation

### Automatic Logging

Integrate audit logging into your data operations:

```typescript
import {
  logDataCreate,
  logDataUpdate,
  logDataDelete,
} from '../lib/audit-logger';

// When creating a record
async function createJob(data: JobData) {
  const docRef = await addDoc(collection(db, 'jobs'), data);

  // Log the creation
  await logDataCreate('jobs', docRef.id, data);

  return docRef.id;
}

// When updating a record
async function updateJob(jobId: string, updates: Partial<JobData>) {
  const docRef = doc(db, 'jobs', jobId);
  const before = (await getDoc(docRef)).data();

  await updateDoc(docRef, updates);

  // Log the update with before/after
  await logDataUpdate('jobs', jobId, before, { ...before, ...updates });
}

// When deleting a record
async function deleteJob(jobId: string) {
  const docRef = doc(db, 'jobs', jobId);
  const data = (await getDoc(docRef)).data();

  await deleteDoc(docRef);

  // Log the deletion
  await logDataDelete('jobs', jobId, data);
}
```

### Business Event Logging

```typescript
import {
  logJobCreated,
  logJobStatusChanged,
  logInvoicePaid,
} from '../lib/audit-logger';

// Log job creation
await logJobCreated(jobId, {
  name: 'Kitchen Remodel',
  status: 'pending',
});

// Log job status change
await logJobStatusChanged(jobId, 'pending', 'in-progress');

// Log invoice payment
await logInvoicePaid(invoiceId, 1500.00, 'credit_card');
```

### Security Event Logging

```typescript
import {
  logSecurityAlert,
  logDataBreachAttempt,
} from '../lib/audit-logger';

// Log unauthorized access attempt
if (!hasPermission) {
  await logDataBreachAttempt(
    `jobs/${jobId}`,
    'User attempted to access job without permission'
  );
  throw new Error('Unauthorized');
}

// Log suspicious activity
if (suspiciousActivity) {
  await logSecurityAlert(
    'Multiple failed login attempts detected',
    {
      attempts: 5,
      timeframe: '5 minutes',
    }
  );
}
```

### Custom Event Logging

```typescript
import { logAuditEvent, AuditEventType, AuditSeverity } from '../lib/audit-logger';

await logAuditEvent(AuditEventType.CUSTOM, {
  severity: AuditSeverity.INFO,
  resource: 'reports/monthly-summary',
  action: 'Generated monthly report',
  metadata: {
    month: 'October',
    year: 2025,
    recordCount: 150,
  },
});
```

---

## Querying Audit Logs

### Basic Query

```typescript
import { getAuditLogs } from '../lib/audit-logger';

// Get all logs for your company
const logs = await getAuditLogs({
  companyId: 'company-123',
  limitCount: 100,
});
```

### Filtered Queries

```typescript
// Get logs for specific user
const userLogs = await getAuditLogs({
  companyId: 'company-123',
  userId: 'user-456',
  limitCount: 50,
});

// Get logs by event type
const loginLogs = await getAuditLogs({
  companyId: 'company-123',
  eventType: AuditEventType.LOGIN,
  limitCount: 100,
});

// Get logs in date range
const recentLogs = await getAuditLogs({
  companyId: 'company-123',
  startDate: new Date('2025-10-01'),
  endDate: new Date('2025-10-31'),
  limitCount: 1000,
});
```

### Export to CSV

```typescript
import { downloadAuditLogsCSV } from '../lib/audit-logger';

// Export audit logs
const logs = await getAuditLogs({ companyId: 'company-123' });
downloadAuditLogsCSV(logs, 'audit-logs-october-2025.csv');
```

---

## Compliance

### GDPR Compliance

#### Right to Access (Article 15)

Users can request all data about them:

```typescript
import { logGDPRDataExport } from '../lib/audit-logger';

async function exportUserData(userId: string) {
  // Log the export request
  await logGDPRDataExport(userId);

  // Gather all user data
  const userData = await getAllUserData(userId);

  // Return data in portable format
  return {
    personalData: userData,
    auditLog: await getAuditLogs({ companyId, userId }),
    exportDate: new Date().toISOString(),
  };
}
```

#### Right to Erasure (Article 17)

Users can request data deletion:

```typescript
import { logGDPRDataDeletion } from '../lib/audit-logger';

async function deleteUserData(userId: string) {
  // Log the deletion request
  await logGDPRDataDeletion(userId);

  // Delete user data
  await deleteAllUserData(userId);

  // Anonymize audit logs (keep for compliance)
  await anonymizeUserAuditLogs(userId);
}
```

#### Retention Period

Track when data should be deleted:

```typescript
// Delete audit logs older than 90 days
async function cleanupOldAuditLogs() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  const oldLogs = await getAuditLogs({
    companyId: 'company-123',
    endDate: cutoffDate,
  });

  for (const log of oldLogs) {
    await deleteDoc(doc(db, 'auditLogs', log.id!));
  }
}
```

### SOC 2 Compliance

Audit logs support SOC 2 requirements:

**Common Criteria (CC)**:
- **CC5.2**: Audit logs track changes to system resources
- **CC6.1**: Security events and violations are logged
- **CC7.2**: Changes to user access are tracked

**Trust Services Criteria**:
- **Availability**: System events and errors logged
- **Confidentiality**: Access to sensitive data tracked
- **Processing Integrity**: Data modifications tracked

### HIPAA Compliance

For healthcare-related data:

```typescript
// Log access to protected health information (PHI)
await logAuditEvent(AuditEventType.READ, {
  severity: AuditSeverity.INFO,
  resource: 'patient/123',
  action: 'Viewed patient medical record',
  metadata: {
    phi_accessed: true,
    record_type: 'medical_history',
  },
});
```

---

## Retention Policy

### Default Retention

- **Standard Logs**: 90 days
- **Security Events**: 365 days
- **Compliance Events**: 7 years (as required)

### Automatic Cleanup

Configure automatic cleanup with Cloud Functions:

```typescript
// functions/src/audit-cleanup.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const cleanupAuditLogs = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const db = admin.firestore();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const snapshot = await db
      .collection('auditLogs')
      .where('timestamp', '<', cutoffDate)
      .where('severity', '!=', 'critical') // Keep critical logs longer
      .get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Deleted ${snapshot.size} old audit logs`);
  });
```

---

## Security

### Access Control

- **Admin Only**: Only admins can view audit logs
- **Company Isolation**: Users can only see their company's logs
- **Immutable**: Logs cannot be modified after creation
- **No Deletion**: Regular users cannot delete logs

### IP Anonymization

IP addresses are anonymized for privacy:

```typescript
// Original: 192.168.1.100 -> Stored: 192.168.1.0
// Original: 2001:0db8:85a3:0000:0000:8a2e:0370:7334
// -> Stored: 2001:0db8:85a3:0000::0
```

### Data Sanitization

Sensitive data is never logged:

```typescript
// ❌ Bad - logs password
await logAuditEvent(AuditEventType.CREATE, {
  metadata: {
    user: { email: 'user@example.com', password: 'secret123' },
  },
});

// ✅ Good - sanitizes sensitive fields
await logAuditEvent(AuditEventType.CREATE, {
  metadata: {
    user: { email: 'user@example.com' },
  },
});
```

---

## Best Practices

### ✅ Do

1. **Log All State Changes**:
   ```typescript
   // Before updating
   const before = await getDoc(docRef);
   await updateDoc(docRef, updates);
   const after = await getDoc(docRef);
   await logDataUpdate('jobs', jobId, before.data(), after.data());
   ```

2. **Include Context**:
   ```typescript
   await logJobCreated(jobId, {
     name: job.name,
     status: job.status,
     customer: job.customerId,
   });
   ```

3. **Use Appropriate Severity**:
   ```typescript
   // INFO for normal operations
   await logAuditEvent(AuditEventType.LOGIN, { severity: AuditSeverity.INFO });

   // CRITICAL for security issues
   await logSecurityAlert('message', { severity: AuditSeverity.CRITICAL });
   ```

4. **Handle Failures Gracefully**:
   ```typescript
   try {
     await deleteJob(jobId);
   } catch (error) {
     // Log error but don't fail if audit logging fails
     await logAuditEvent(AuditEventType.SYSTEM_ERROR, {
       severity: AuditSeverity.ERROR,
       metadata: { error: error.message },
     });
     throw error; // Re-throw original error
   }
   ```

### ❌ Don't

1. **Don't Log Passwords or Secrets**:
   ```typescript
   // ❌ Bad
   await logAuditEvent(type, {
     metadata: { password: 'secret123', apiKey: 'key' },
   });
   ```

2. **Don't Log PII Without Anonymization**:
   ```typescript
   // ❌ Bad
   await logAuditEvent(type, {
     metadata: { ssn: '123-45-6789', creditCard: '4111...' },
   });
   ```

3. **Don't Skip Critical Events**:
   ```typescript
   // ❌ Bad - permission change without logging
   await updateDoc(userRef, { role: 'admin' });

   // ✅ Good
   await updateDoc(userRef, { role: 'admin' });
   await logRoleChange(userId, 'worker', 'admin');
   ```

4. **Don't Modify Logs**:
   ```typescript
   // ❌ Bad - audit logs are immutable
   await updateDoc(doc(db, 'auditLogs', logId), { action: 'changed' });
   ```

---

## Audit Log Schema

```typescript
interface AuditLogEntry {
  id?: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId: string;
  userEmail: string;
  companyId: string;
  timestamp: Timestamp;
  ipAddress?: string; // Anonymized
  userAgent?: string;
  resource?: string; // e.g., "jobs/job-123"
  action?: string; // Human-readable description
  metadata?: Record<string, unknown>;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
}
```

---

## Firestore Rules

```javascript
match /auditLogs/{logId} {
  // Only admins can read audit logs in their company
  allow read: if isAuthenticated()
              && userExists()
              && isAdmin()
              && 'companyId' in resource.data
              && belongsToUserCompany(resource.data.companyId);

  // Authenticated users can create audit logs
  allow create: if isAuthenticated()
                && userExists()
                && hasCompanyId()
                && request.resource.data.companyId == getUserData().companyId
                && request.resource.data.userId == request.auth.uid;

  // Nobody can update audit logs (immutable)
  allow update: if false;

  // Only admins can delete old audit logs (retention policy)
  allow delete: if isAuthenticated()
                && userExists()
                && isAdmin()
                && 'companyId' in resource.data
                && belongsToUserCompany(resource.data.companyId);
}
```

---

## Resources

- **GDPR**: https://gdpr.eu/
- **SOC 2**: https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/aicpasoc2report.html
- **HIPAA**: https://www.hhs.gov/hipaa/index.html
- **Firestore Security**: https://firebase.google.com/docs/firestore/security/overview

---

**Last Updated**: 2025-10-17
**Maintained By**: Development Team
**Questions?**: See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

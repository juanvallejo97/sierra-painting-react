# Activity Feed & Timeline

**Date**: 2025-10-17
**Status**: ✅ Implemented
**Version**: 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Activity Types](#activity-types)
4. [Usage Guide](#usage-guide)
5. [Components](#components)
6. [Creating Activities](#creating-activities)
7. [Integration Points](#integration-points)
8. [Best Practices](#best-practices)
9. [Examples](#examples)

---

## Overview

The Activity Feed & Timeline system tracks and displays all user and system activities in chronological order, providing visibility into what's happening across jobs, invoices, team members, and the organization.

### Key Features

✅ **30+ Activity Types** - Jobs, invoices, time entries, users, system events
✅ **Real-time Updates** - Firestore subscriptions for instant activity updates
✅ **Multiple Views** - Feed (list), Timeline (visual), Compact (widget)
✅ **Filtering** - By type, resource, user, date range
✅ **Change Tracking** - Before/after values for updates
✅ **Resource Links** - Click to navigate to related resources
✅ **Grouped Display** - By date (Today, Yesterday, This Week)
✅ **Immutable Logs** - Cannot be modified after creation
✅ **Visual Timeline** - Professional timeline visualization

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  User Interface                          │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────┐  │
│  │  ActivityFeed   │ ActivityTimeline │  DashboardWidget│
│  └───────┬──────┘  └───────┬───────┘  └──────┬──────┘  │
│          │                  │                  │          │
│          └──────────────────┼──────────────────┘          │
│                             │                             │
└─────────────────────────────┼─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│           Activity Tracker Service                        │
│  ┌──────────────────────────────────────────────────┐    │
│  │  activity-tracker.ts                              │    │
│  │  - logActivity()                                  │    │
│  │  - getActivities()                                │    │
│  │  - Convenience functions:                         │    │
│  │    - logJobCreated()                              │    │
│  │    - logJobAssigned()                             │    │
│  │    - logInvoicePaid()                             │    │
│  │    - logTimeEntryApproved()                       │    │
│  │    - logUserJoined()                              │    │
│  └──────────────────┬───────────────────────────────┘    │
└─────────────────────┼───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                Firestore Database                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  activityFeed/ collection                         │  │
│  │  - Immutable logs                                 │  │
│  │  - Real-time sync                                 │  │
│  │  - Company-level isolation                        │  │
│  │  - Automatic timestamping                         │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

---

## Activity Types

### Job Activities

| Type | Description | Icon |
|------|-------------|------|
| `JOB_CREATED` | New job created | 📋 |
| `JOB_UPDATED` | Job details updated | ✏️ |
| `JOB_DELETED` | Job deleted | 🗑️ |
| `JOB_ASSIGNED` | Worker assigned to job | 👤 |
| `JOB_UNASSIGNED` | Worker removed from job | 👤 |
| `JOB_STATUS_CHANGED` | Job status changed | 🔄 |
| `JOB_COMPLETED` | Job marked as complete | ✅ |
| `JOB_COMMENT_ADDED` | Comment added to job | 💬 |

### Invoice Activities

| Type | Description | Icon |
|------|-------------|------|
| `INVOICE_CREATED` | New invoice created | 📄 |
| `INVOICE_UPDATED` | Invoice details updated | ✏️ |
| `INVOICE_DELETED` | Invoice deleted | 🗑️ |
| `INVOICE_SENT` | Invoice sent to customer | 📧 |
| `INVOICE_PAID` | Invoice marked as paid | 💰 |
| `INVOICE_PAYMENT_RECEIVED` | Payment received | 💵 |

### Time Entry Activities

| Type | Description | Icon |
|------|-------------|------|
| `TIME_ENTRY_CREATED` | New time entry created | ⏱️ |
| `TIME_ENTRY_UPDATED` | Time entry updated | ✏️ |
| `TIME_ENTRY_DELETED` | Time entry deleted | 🗑️ |
| `TIME_ENTRY_APPROVED` | Time entry approved | ✅ |
| `TIME_ENTRY_REJECTED` | Time entry rejected | ❌ |

### User Activities

| Type | Description | Icon |
|------|-------------|------|
| `USER_LOGGED_IN` | User logged in | 🔐 |
| `USER_LOGGED_OUT` | User logged out | 🚪 |
| `USER_INVITED` | User invited to join | ✉️ |
| `USER_JOINED` | User joined company | 👋 |
| `USER_ROLE_CHANGED` | User role changed | 🔑 |
| `USER_PROFILE_UPDATED` | User profile updated | 👤 |

### System Activities

| Type | Description | Icon |
|------|-------------|------|
| `SYSTEM_BACKUP_CREATED` | System backup created | 💾 |
| `SYSTEM_UPDATE` | System updated | 🔄 |
| `SYSTEM_MAINTENANCE` | Maintenance performed | 🔧 |

---

## Usage Guide

### Basic Activity Tracking

```typescript
import {
  logActivity,
  ActivityType,
} from '../lib/activity/activity-tracker';

// Log an activity
await logActivity({
  type: ActivityType.JOB_CREATED,
  userId: user.uid,
  userEmail: user.email!,
  userName: user.displayName || 'Unknown',
  companyId: userData.companyId,
  title: 'Created new job',
  description: `Created "${jobName}"`,
  icon: '📋',
  resourceType: 'job',
  resourceId: jobId,
  resourceName: jobName,
});
```

### Using Convenience Functions

```typescript
import {
  logJobCreated,
  logJobAssigned,
  logJobStatusChanged,
  logInvoicePaid,
  logTimeEntryApproved,
} from '../lib/activity/activity-tracker';

// Log job creation
await logJobCreated({
  userId: user.uid,
  userEmail: user.email!,
  userName: user.displayName!,
  companyId: userData.companyId,
  jobId: job.id,
  jobName: job.name,
});

// Log job assignment
await logJobAssigned({
  userId: user.uid,
  userEmail: user.email!,
  userName: user.displayName!,
  companyId: userData.companyId,
  jobId: job.id,
  jobName: job.name,
  assignedToName: worker.name,
});

// Log job status change
await logJobStatusChanged({
  userId: user.uid,
  userEmail: user.email!,
  userName: user.displayName!,
  companyId: userData.companyId,
  jobId: job.id,
  jobName: job.name,
  oldStatus: 'pending',
  newStatus: 'in-progress',
});
```

---

## Components

### ActivityFeed

List view of activities with filtering and grouping.

```typescript
import ActivityFeed from '../components/ActivityFeed';

<ActivityFeed
  limitCount={50}
  showFilters={true}
  className="mt-4"
/>
```

**Props**:
- `limitCount?: number` - Maximum activities to show (default: 50)
- `resourceType?: string` - Filter by resource type (e.g., 'job', 'invoice')
- `resourceId?: string` - Filter by specific resource ID
- `userId?: string` - Filter by user
- `showFilters?: boolean` - Show filter dropdown (default: false)
- `className?: string` - Additional CSS classes

### ActivityFeedCompact

Compact version for sidebars and widgets.

```typescript
import { ActivityFeedCompact } from '../components/ActivityFeed';

<ActivityFeedCompact limitCount={5} />
```

**Props**:
- `limitCount?: number` - Maximum activities to show (default: 10)
- `className?: string` - Additional CSS classes

### ActivityTimeline

Visual timeline representation of activities.

```typescript
import ActivityTimeline from '../components/ActivityTimeline';

<ActivityTimeline
  limitCount={20}
  resourceType="job"
  resourceId={jobId}
/>
```

**Props**:
- `limitCount?: number` - Maximum activities to show (default: 20)
- `resourceType?: string` - Filter by resource type
- `resourceId?: string` - Filter by specific resource
- `userId?: string` - Filter by user
- `className?: string` - Additional CSS classes

### TimelineMilestone

Highlight major milestones in timeline.

```typescript
import { TimelineMilestone } from '../components/ActivityTimeline';

<TimelineMilestone
  title="Project Completed"
  description="Kitchen remodel project finished"
  date={new Date()}
  icon="🎉"
  color="green"
/>
```

### HorizontalTimeline

Horizontal timeline layout.

```typescript
import { HorizontalTimeline } from '../components/ActivityTimeline';

<HorizontalTimeline activities={activities} />
```

---

## Creating Activities

### Manual Activity Logging

```typescript
import { logActivity, ActivityType } from '../lib/activity/activity-tracker';
import { auth } from '../lib/firebase';
import { useAuth } from '../lib/auth-context';

const { userData } = useAuth();

await logActivity({
  type: ActivityType.JOB_CREATED,
  userId: auth.currentUser!.uid,
  userEmail: auth.currentUser!.email!,
  userName: auth.currentUser!.displayName || 'Unknown',
  companyId: userData.companyId,
  title: 'Created new job',
  description: `Created "${job.name}"`,
  icon: '📋',
  resourceType: 'job',
  resourceId: job.id,
  resourceName: job.name,
  metadata: {
    status: job.status,
    estimatedHours: job.estimatedHours,
  },
});
```

### Tracking Changes

```typescript
await logActivity({
  type: ActivityType.JOB_STATUS_CHANGED,
  userId: user.uid,
  userEmail: user.email!,
  userName: user.displayName!,
  companyId: userData.companyId,
  title: 'Changed job status',
  description: `Changed "${job.name}" from ${oldStatus} to ${newStatus}`,
  icon: '🔄',
  resourceType: 'job',
  resourceId: job.id,
  resourceName: job.name,
  changes: [
    {
      field: 'status',
      oldValue: oldStatus,
      newValue: newStatus,
    },
  ],
});
```

---

## Integration Points

### When to Log Activities

**Job Operations**:
```typescript
// Creating a job
async function createJob(jobData: JobData) {
  const docRef = await addDoc(collection(db, 'jobs'), jobData);

  // Log activity
  await logJobCreated({
    userId: user.uid,
    userEmail: user.email!,
    userName: user.displayName!,
    companyId: userData.companyId,
    jobId: docRef.id,
    jobName: jobData.name,
  });

  return docRef.id;
}

// Assigning worker
async function assignWorker(jobId: string, workerId: string, workerName: string) {
  await updateDoc(doc(db, 'jobs', jobId), {
    workers: arrayUnion(workerId),
  });

  // Log activity
  await logJobAssigned({
    userId: user.uid,
    userEmail: user.email!,
    userName: user.displayName!,
    companyId: userData.companyId,
    jobId,
    jobName: job.name,
    assignedToName: workerName,
  });
}

// Changing status
async function updateJobStatus(jobId: string, newStatus: string) {
  const job = await getJob(jobId);
  const oldStatus = job.status;

  await updateDoc(doc(db, 'jobs', jobId), { status: newStatus });

  // Log activity
  await logJobStatusChanged({
    userId: user.uid,
    userEmail: user.email!,
    userName: user.displayName!,
    companyId: userData.companyId,
    jobId,
    jobName: job.name,
    oldStatus,
    newStatus,
  });
}
```

**Invoice Operations**:
```typescript
// Creating invoice
async function createInvoice(invoiceData: InvoiceData) {
  const docRef = await addDoc(collection(db, 'invoices'), invoiceData);

  await logInvoiceCreated({
    userId: user.uid,
    userEmail: user.email!,
    userName: user.displayName!,
    companyId: userData.companyId,
    invoiceId: docRef.id,
    invoiceNumber: invoiceData.invoiceNumber,
    amount: invoiceData.total,
  });

  return docRef.id;
}

// Marking invoice as paid
async function markInvoicePaid(invoiceId: string) {
  const invoice = await getInvoice(invoiceId);

  await updateDoc(doc(db, 'invoices', invoiceId), { status: 'paid' });

  await logInvoicePaid({
    userId: user.uid,
    userEmail: user.email!,
    userName: user.displayName!,
    companyId: userData.companyId,
    invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    amount: invoice.total,
  });
}
```

**Time Entry Operations**:
```typescript
// Approving time entry
async function approveTimeEntry(timeEntryId: string) {
  const timeEntry = await getTimeEntry(timeEntryId);
  const worker = await getUser(timeEntry.userId);

  await updateDoc(doc(db, 'timeEntries', timeEntryId), {
    status: 'approved',
  });

  await logTimeEntryApproved({
    userId: user.uid,
    userEmail: user.email!,
    userName: user.displayName!,
    companyId: userData.companyId,
    timeEntryId,
    workerName: worker.name,
    date: timeEntry.date,
    hours: timeEntry.hours,
  });
}
```

**User Operations**:
```typescript
// User joins company
async function onUserJoin(user: User) {
  await logUserJoined({
    userId: user.uid,
    userEmail: user.email!,
    userName: user.displayName || 'New User',
    companyId: user.companyId,
  });
}

// User logs in (optional - can be noisy)
async function onUserLogin(user: User) {
  await logUserLogin({
    userId: user.uid,
    userEmail: user.email!,
    userName: user.displayName!,
    companyId: userData.companyId,
  });
}
```

---

## Best Practices

### ✅ Do

1. **Always Include User Context**
   ```typescript
   await logActivity({
     userId: user.uid,
     userEmail: user.email!,
     userName: user.displayName!,
     companyId: userData.companyId,
     // ... other fields
   });
   ```

2. **Use Descriptive Titles and Descriptions**
   ```typescript
   await logActivity({
     title: 'Changed job status',
     description: `Changed "Kitchen Remodel" from pending to in-progress`,
     // ... other fields
   });
   ```

3. **Link to Resources**
   ```typescript
   await logActivity({
     resourceType: 'job',
     resourceId: job.id,
     resourceName: job.name,
     // ... other fields
   });
   ```

4. **Track Changes for Updates**
   ```typescript
   await logActivity({
     changes: [
       { field: 'status', oldValue: 'pending', newValue: 'completed' },
       { field: 'estimatedHours', oldValue: 10, newValue: 12 },
     ],
     // ... other fields
   });
   ```

5. **Use Appropriate Icons**
   ```typescript
   const icons = {
     create: '📋',
     update: '✏️',
     delete: '🗑️',
     assign: '👤',
     complete: '✅',
     paid: '💰',
   };
   ```

### ❌ Don't

1. **Don't Log Sensitive Data**
   ```typescript
   // ❌ Bad
   await logActivity({
     metadata: { password: '...', apiKey: '...' },
   });

   // ✅ Good
   await logActivity({
     metadata: { fieldsUpdated: ['email', 'name'] },
   });
   ```

2. **Don't Log Too Frequently**
   ```typescript
   // ❌ Bad - logs every keystroke
   onInput={() => logActivity({ ... }));

   // ✅ Good - logs on save
   onSave(() => logActivity({ ... }));
   ```

3. **Don't Skip Error Handling**
   ```typescript
   // ❌ Bad
   await logActivity({ ... });

   // ✅ Good
   try {
     await logActivity({ ... });
   } catch (error) {
     console.error('Failed to log activity:', error);
   }
   ```

4. **Don't Modify Activity Logs**
   ```typescript
   // ❌ Activity logs are immutable
   await updateDoc(doc(db, 'activityFeed', activityId), { ... });
   ```

---

## Examples

### Example 1: Job Workflow Tracking

```typescript
// Complete job workflow
async function completeJobWorkflow(jobId: string) {
  const job = await getJob(jobId);
  const user = auth.currentUser!;
  const { userData } = useAuth();

  // 1. Assign workers
  for (const worker of selectedWorkers) {
    await assignWorker(jobId, worker.id);

    await logJobAssigned({
      userId: user.uid,
      userEmail: user.email!,
      userName: user.displayName!,
      companyId: userData.companyId,
      jobId,
      jobName: job.name,
      assignedToName: worker.name,
    });
  }

  // 2. Start job
  await updateJobStatus(jobId, 'in-progress');

  await logJobStatusChanged({
    userId: user.uid,
    userEmail: user.email!,
    userName: user.displayName!,
    companyId: userData.companyId,
    jobId,
    jobName: job.name,
    oldStatus: 'pending',
    newStatus: 'in-progress',
  });

  // 3. Complete job
  await updateJobStatus(jobId, 'completed');

  await logJobStatusChanged({
    userId: user.uid,
    userEmail: user.email!,
    userName: user.displayName!,
    companyId: userData.companyId,
    jobId,
    jobName: job.name,
    oldStatus: 'in-progress',
    newStatus: 'completed',
  });
}
```

### Example 2: Resource Activity Timeline

```typescript
// Show timeline for specific job
function JobDetailsPage({ jobId }: { jobId: string }) {
  return (
    <div>
      <h1>Job Details</h1>

      {/* Job information */}
      <JobInfo jobId={jobId} />

      {/* Activity timeline for this job */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Activity Timeline</h2>
        <ActivityTimeline
          resourceType="job"
          resourceId={jobId}
          limitCount={50}
        />
      </div>
    </div>
  );
}
```

### Example 3: Dashboard Activity Widget

```typescript
// Dashboard with recent activity
function Dashboard() {
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Stats */}
      <div className="col-span-2">
        <DashboardStats />
      </div>

      {/* Recent Activity */}
      <div className="col-span-1">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <ActivityFeedCompact limitCount={10} />
        </div>
      </div>
    </div>
  );
}
```

---

## Firestore Rules

```javascript
// Activity Feed Collection
match /activityFeed/{activityId} {
  // Users can read activities in their company
  allow read: if isAuthenticated()
              && userExists()
              && 'companyId' in resource.data
              && belongsToUserCompany(resource.data.companyId);

  // System can create activity logs
  allow create: if isAuthenticated()
                && userExists()
                && hasCompanyId()
                && request.resource.data.companyId == getUserData().companyId
                && request.resource.data.userId == request.auth.uid;

  // Activity logs are immutable
  allow update: if false;

  // Only admins can delete
  allow delete: if isAuthenticated()
                && userExists()
                && isAdmin()
                && 'companyId' in resource.data
                && belongsToUserCompany(resource.data.companyId);
}
```

---

## Future Enhancements

- [ ] **Activity Filtering**: Advanced filters (date range, multiple types)
- [ ] **Activity Search**: Full-text search across activities
- [ ] **Activity Exports**: Export activity logs as CSV/PDF
- [ ] **Activity Analytics**: Charts and insights from activity data
- [ ] **Activity Notifications**: Notify users of specific activities
- [ ] **Activity Retention**: Automatic cleanup of old activities
- [ ] **Activity Aggregation**: Combine similar activities
- [ ] **Activity Replay**: Visual replay of activities over time

---

## Resources

- **Activity Tracker**: `src/lib/activity/activity-tracker.ts`
- **Activity Feed**: `src/components/ActivityFeed.tsx`
- **Activity Timeline**: `src/components/ActivityTimeline.tsx`
- **Firestore Rules**: `firestore.rules` (lines 394-422)

---

**Last Updated**: 2025-10-17
**Maintained By**: Development Team
**Questions?**: See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

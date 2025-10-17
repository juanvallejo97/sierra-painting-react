# Notification System

**Date**: 2025-10-17
**Status**: ✅ Implemented
**Version**: 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Notification Types](#notification-types)
4. [Usage Guide](#usage-guide)
5. [React Hooks](#react-hooks)
6. [Components](#components)
7. [Creating Notifications](#creating-notifications)
8. [Notification Preferences](#notification-preferences)
9. [Best Practices](#best-practices)
10. [Examples](#examples)

---

## Overview

The Notification System provides comprehensive in-app notifications for users to receive real-time updates about jobs, invoices, time entries, and system events.

### Key Features

✅ **20+ Notification Types** - Jobs, invoices, time entries, users, system alerts
✅ **Real-time Updates** - Firestore subscriptions for instant notifications
✅ **Priority Levels** - Low, Normal, High, Urgent
✅ **User Preferences** - Customizable notification settings
✅ **Notification Bell** - Header component with unread count
✅ **Full Notification Center** - Dedicated page with filtering
✅ **Read/Archive/Delete** - Complete notification management
✅ **Grouped Display** - Today, Yesterday, This Week, Older
✅ **Action Buttons** - Clickable notifications with deep links
✅ **Quiet Hours** - Do not disturb mode

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  User Interface                          │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────┐  │
│  │NotificationBell  │ NotificationsScreen   ActivityFeed  │
│  └───────┬──────┘  └───────┬───────┘  └──────┬──────┘  │
│          │                  │                  │          │
│          └──────────────────┼──────────────────┘          │
│                             │                             │
└─────────────────────────────┼─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│              React Hooks Layer                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │  useNotifications()                               │    │
│  │  - Real-time subscription                         │    │
│  │  - Unread count                                   │    │
│  │  - Mark as read/archive/delete                    │    │
│  │  - Grouped notifications                          │    │
│  └──────────────────┬───────────────────────────────┘    │
└─────────────────────┼───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│           Notification Service Layer                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  notification-service.ts                          │  │
│  │  - createNotification()                           │  │
│  │  - getNotifications()                             │  │
│  │  - markAsRead(), archive(), delete()              │  │
│  │  - Convenience functions (notifyJobAssigned, etc) │  │
│  └──────────────────┬───────────────────────────────┘  │
└─────────────────────┼───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                Firestore Database                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  notifications/ collection                        │  │
│  │  - Real-time sync                                 │  │
│  │  - Security rules (user can only see own)         │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  notificationPreferences/ collection              │  │
│  │  - User preferences                               │  │
│  │  - Channel settings (in-app, email, push)         │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

---

## Notification Types

### Job Notifications

| Type | Description | Default Priority |
|------|-------------|-----------------|
| `JOB_ASSIGNED` | User assigned to a job | Normal |
| `JOB_STATUS_CHANGED` | Job status updated | Normal |
| `JOB_COMPLETED` | Job marked as complete | Normal |
| `JOB_CANCELLED` | Job cancelled | Normal |
| `JOB_COMMENT` | Comment added to job | Normal |

### Invoice Notifications

| Type | Description | Default Priority |
|------|-------------|-----------------|
| `INVOICE_CREATED` | New invoice created | Normal |
| `INVOICE_PAID` | Invoice payment received | High |
| `INVOICE_OVERDUE` | Invoice is overdue | High |
| `INVOICE_SENT` | Invoice sent to customer | Normal |
| `PAYMENT_RECEIVED` | Payment received | High |

### Time Entry Notifications

| Type | Description | Default Priority |
|------|-------------|-----------------|
| `TIME_ENTRY_APPROVED` | Time entry approved | Normal |
| `TIME_ENTRY_REJECTED` | Time entry rejected | Normal |
| `TIME_ENTRY_REMINDER` | Reminder to submit time | Normal |

### User Notifications

| Type | Description | Default Priority |
|------|-------------|-----------------|
| `USER_INVITED` | Invited to join company | Normal |
| `USER_ROLE_CHANGED` | User role updated | Normal |
| `USER_MENTIONED` | Mentioned in comment/note | Normal |

### System Notifications

| Type | Description | Default Priority |
|------|-------------|-----------------|
| `SYSTEM_UPDATE` | System update available | Normal |
| `SYSTEM_MAINTENANCE` | Scheduled maintenance | High |
| `SYSTEM_ALERT` | System alert/issue | Urgent |

### General Notifications

| Type | Description | Default Priority |
|------|-------------|-----------------|
| `MESSAGE` | General message | Normal |
| `REMINDER` | Generic reminder | Normal |
| `ANNOUNCEMENT` | Company announcement | Normal |

---

## Usage Guide

### In React Components

#### Basic Usage

```typescript
import { useNotifications } from '../hooks/useNotifications';

function NotificationExample() {
  const { notifications, unreadCount, markAsRead } = useNotifications();

  return (
    <div>
      <h2>Notifications ({unreadCount})</h2>
      {notifications.map((notification) => (
        <div key={notification.id} onClick={() => markAsRead(notification.id!)}>
          <h3>{notification.title}</h3>
          <p>{notification.message}</p>
        </div>
      ))}
    </div>
  );
}
```

#### Using Notification Bell

```typescript
import NotificationBell from '../components/NotificationBell';

function Header() {
  return (
    <header>
      <nav>
        {/* ... other nav items ... */}
        <NotificationBell />
      </nav>
    </header>
  );
}
```

---

## React Hooks

### useNotifications()

Main hook for notification management.

```typescript
const {
  // Data
  notifications,        // All notifications
  unreadCount,         // Unread count
  groupedNotifications, // Grouped by time period

  // State
  loading,             // Loading state
  error,               // Error state

  // Actions
  markAsRead,          // Mark single as read
  markMultipleAsRead,  // Mark multiple as read
  markAllAsRead,       // Mark all as read
  archive,             // Archive notification
  delete: deleteNotif, // Delete notification
  refresh,             // Manual refresh

  // Computed
  hasUnread,           // Boolean: has unread
  isEmpty,             // Boolean: no notifications
} = useNotifications({
  unreadOnly: false,
  type: NotificationType.JOB_ASSIGNED,
  priority: NotificationPriority.HIGH,
  limitCount: 50,
});
```

**Options**:
- `unreadOnly?: boolean` - Only show unread notifications
- `type?: NotificationType` - Filter by type
- `priority?: NotificationPriority` - Filter by priority
- `limitCount?: number` - Limit results

### useNotificationPreferences()

Hook for managing user notification preferences.

```typescript
const {
  // Data
  preferences,          // User preferences

  // State
  loading,             // Loading state
  error,               // Error state

  // Actions
  updatePreferences,   // Update preferences
  toggleNotificationType, // Toggle notification type
  isTypeEnabled,       // Check if type enabled
} = useNotificationPreferences();
```

### useNotificationSound()

Play sound when new notification arrives.

```typescript
useNotificationSound(true); // Enable sound
```

### useNotificationBadge()

Update page title with unread count.

```typescript
useNotificationBadge(); // Shows "(3) Page Title"
```

### useLatestNotification()

Get the most recent notification.

```typescript
const latest = useLatestNotification();
```

### useUnreadNotifications()

Get only unread notifications.

```typescript
const { notifications, unreadCount } = useUnreadNotifications();
```

---

## Components

### NotificationBell

Header component showing notification bell icon with unread count.

```typescript
import NotificationBell from '../components/NotificationBell';

<NotificationBell />
```

**Features**:
- Shows unread count badge
- Dropdown with recent notifications
- "Mark all read" button
- "View all" link to full page

### NotificationsScreen

Full-page notification center.

```typescript
import NotificationsScreen from '../pages/NotificationsScreen';

// In router
<Route path="/notifications" element={<NotificationsScreen />} />
```

**Features**:
- All, Unread, Preferences tabs
- Filter by notification type
- Grouped by time period
- Archive/delete actions
- Preference management

---

## Creating Notifications

### Service Functions

#### Basic Notification

```typescript
import { createNotification } from '../lib/notifications/notification-service';
import { NotificationType, NotificationPriority } from '../lib/notifications/notification-service';

await createNotification({
  type: NotificationType.MESSAGE,
  priority: NotificationPriority.NORMAL,
  userId: 'user-123',
  companyId: 'company-456',
  title: 'Hello!',
  message: 'This is a notification',
  icon: '👋',
  link: '/jobs/123',
});
```

#### Job Assignment Notification

```typescript
import { notifyJobAssigned } from '../lib/notifications/notification-service';

await notifyJobAssigned({
  userId: worker.id,
  companyId: job.companyId,
  jobId: job.id,
  jobName: job.name,
  assignedBy: currentUser.uid,
});
```

#### Job Status Change Notification

```typescript
import { notifyJobStatusChanged } from '../lib/notifications/notification-service';

await notifyJobStatusChanged({
  userId: worker.id,
  companyId: job.companyId,
  jobId: job.id,
  jobName: job.name,
  oldStatus: 'pending',
  newStatus: 'in-progress',
});
```

#### Invoice Payment Notification

```typescript
import { notifyInvoicePaid } from '../lib/notifications/notification-service';

await notifyInvoicePaid({
  userId: manager.id,
  companyId: invoice.companyId,
  invoiceId: invoice.id,
  invoiceNumber: invoice.invoiceNumber,
  amount: invoice.total,
});
```

#### Time Entry Approval Notification

```typescript
import { notifyTimeEntryApproved } from '../lib/notifications/notification-service';

await notifyTimeEntryApproved({
  userId: worker.id,
  companyId: timeEntry.companyId,
  timeEntryId: timeEntry.id,
  date: timeEntry.date,
  hours: timeEntry.hours,
});
```

#### Bulk Notifications (Announcements)

```typescript
import { sendAnnouncement } from '../lib/notifications/notification-service';

await sendAnnouncement({
  companyId: 'company-123',
  userIds: ['user1', 'user2', 'user3'],
  title: 'Company Update',
  message: 'We have a new feature!',
  priority: NotificationPriority.HIGH,
  expiresInDays: 7,
});
```

---

## Notification Preferences

### User Preferences Schema

```typescript
interface NotificationPreferences {
  userId: string;
  companyId: string;

  // Channel preferences
  inApp: boolean;      // In-app notifications
  email: boolean;      // Email notifications
  push: boolean;       // Push notifications (future)

  // Type preferences
  enabledTypes: NotificationType[];

  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // e.g., "22:00"
  quietHoursEnd?: string;   // e.g., "08:00"

  updatedAt: Timestamp;
}
```

### Managing Preferences

```typescript
const { preferences, updatePreferences, toggleNotificationType } =
  useNotificationPreferences();

// Toggle in-app notifications
await updatePreferences({ inApp: false });

// Enable email notifications
await updatePreferences({ email: true });

// Toggle specific notification type
await toggleNotificationType(NotificationType.JOB_ASSIGNED);

// Set quiet hours
await updatePreferences({
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
});
```

---

## Best Practices

### ✅ Do

1. **Always Set User & Company IDs**
   ```typescript
   await createNotification({
     userId: targetUser.uid,
     companyId: currentUser.companyId,
     // ... other fields
   });
   ```

2. **Use Appropriate Priority**
   ```typescript
   // Normal for most notifications
   priority: NotificationPriority.NORMAL,

   // High for important events
   priority: NotificationPriority.HIGH,

   // Urgent for critical issues
   priority: NotificationPriority.URGENT,
   ```

3. **Include Actionable Links**
   ```typescript
   await createNotification({
     title: 'New Job Assigned',
     message: 'You have been assigned to Kitchen Remodel',
     link: `/jobs/${jobId}`, // User can click to view
     // ...
   });
   ```

4. **Use Icons for Visual Context**
   ```typescript
   await createNotification({
     title: 'Invoice Paid',
     icon: '💰', // Visual indicator
     // ...
   });
   ```

5. **Set Expiration for Temporary Notifications**
   ```typescript
   const expiresAt = Timestamp.fromDate(
     new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
   );

   await createNotification({
     // ...
     expiresAt,
   });
   ```

### ❌ Don't

1. **Don't Spam Users**
   ```typescript
   // ❌ Bad - too many notifications
   workers.forEach(async (worker) => {
     await createNotification({ /* ... */ });
   });

   // ✅ Good - use bulk notifications
   await createBulkNotifications(workerIds, { /* ... */ });
   ```

2. **Don't Skip Error Handling**
   ```typescript
   // ❌ Bad
   await createNotification({ /* ... */ });

   // ✅ Good
   try {
     await createNotification({ /* ... */ });
   } catch (error) {
     console.error('Failed to create notification:', error);
   }
   ```

3. **Don't Hardcode User IDs**
   ```typescript
   // ❌ Bad
   await createNotification({
     userId: 'user-123',
     // ...
   });

   // ✅ Good
   await createNotification({
     userId: targetUser.uid,
     // ...
   });
   ```

4. **Don't Forget to Clean Up**
   ```typescript
   // Periodically clean up expired notifications
   import { cleanupExpiredNotifications } from '../lib/notifications/notification-service';

   // Run daily via cron job or Cloud Function
   await cleanupExpiredNotifications();
   ```

---

## Examples

### Example 1: Notify When Job is Assigned

```typescript
import { notifyJobAssigned } from '../lib/notifications/notification-service';

async function assignWorkerToJob(jobId: string, workerId: string) {
  const job = await getJob(jobId);

  // Update job
  await updateDoc(doc(db, 'jobs', jobId), {
    workers: arrayUnion(workerId),
  });

  // Send notification
  await notifyJobAssigned({
    userId: workerId,
    companyId: job.companyId,
    jobId: job.id,
    jobName: job.name,
    assignedBy: auth.currentUser!.uid,
  });
}
```

### Example 2: Notify Multiple Users

```typescript
async function notifyTeamAboutJobCompletion(jobId: string) {
  const job = await getJob(jobId);
  const workers = job.workers || [];

  // Create notifications for all workers
  await createBulkNotifications(workers, {
    type: NotificationType.JOB_COMPLETED,
    priority: NotificationPriority.NORMAL,
    companyId: job.companyId,
    title: 'Job Completed',
    message: `${job.name} has been completed`,
    link: `/jobs/${jobId}`,
    icon: '✅',
    relatedResourceType: 'job',
    relatedResourceId: jobId,
  });
}
```

### Example 3: System Announcement

```typescript
async function sendMaintenanceAnnouncement() {
  // Get all users in company
  const users = await getCompanyUsers(currentCompanyId);
  const userIds = users.map((u) => u.uid);

  // Send announcement
  await sendAnnouncement({
    companyId: currentCompanyId,
    userIds,
    title: 'Scheduled Maintenance',
    message: 'The system will be unavailable on Saturday 2-4 AM for maintenance',
    priority: NotificationPriority.HIGH,
    expiresInDays: 7,
  });
}
```

### Example 4: Real-time Notification Display

```typescript
function JobScreen({ jobId }: { jobId: string }) {
  const { notifications } = useNotificationsByType(NotificationType.JOB_COMMENT);

  // Filter to this job's comments
  const jobComments = notifications.filter(
    (n) => n.relatedResourceId === jobId
  );

  return (
    <div>
      <h1>Job Details</h1>

      {/* Show recent comments as notifications */}
      <div className="comments">
        <h2>Recent Comments</h2>
        {jobComments.map((notif) => (
          <div key={notif.id}>
            <p>{notif.message}</p>
            <small>{notif.createdAt?.toDate().toLocaleString()}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Example 5: Custom Notification with Actions

```typescript
await createNotification({
  type: NotificationType.JOB_ASSIGNED,
  priority: NotificationPriority.NORMAL,
  userId: worker.uid,
  companyId: job.companyId,
  title: 'New Job Assignment',
  message: `You have been assigned to "${job.name}"`,
  link: `/jobs/${job.id}`,
  icon: '📋',
  actions: [
    {
      label: 'View Job',
      action: 'view_job',
      data: { jobId: job.id },
    },
    {
      label: 'Accept',
      action: 'accept_job',
      data: { jobId: job.id },
    },
    {
      label: 'Decline',
      action: 'decline_job',
      data: { jobId: job.id },
    },
  ],
  metadata: {
    jobId: job.id,
    jobName: job.name,
    assignedBy: auth.currentUser!.uid,
    assignedAt: new Date().toISOString(),
  },
});
```

---

## Firestore Rules

```javascript
// Notifications Collection
match /notifications/{notificationId} {
  // Users can only read their own notifications
  allow read: if isAuthenticated()
              && 'userId' in resource.data
              && isSelf(resource.data.userId);

  // Create notifications for users in company
  allow create: if isAuthenticated()
                && userExists()
                && hasCompanyId()
                && request.resource.data.companyId == getUserData().companyId;

  // Users can update own notifications (mark as read)
  allow update: if isAuthenticated()
                && 'userId' in resource.data
                && isSelf(resource.data.userId);

  // Users can delete own notifications
  allow delete: if isAuthenticated()
                && 'userId' in resource.data
                && isSelf(resource.data.userId);

  // Admins can delete any notification in company
  allow delete: if isAuthenticated()
                && userExists()
                && isAdmin()
                && 'companyId' in resource.data
                && belongsToUserCompany(resource.data.companyId);
}

// Notification Preferences Collection
match /notificationPreferences/{userId} {
  // Users can manage own preferences
  allow read, create, update, delete: if isAuthenticated() && isSelf(userId);
}
```

---

## Integration Points

### When to Create Notifications

**Job Operations**:
- Job assigned to worker → `notifyJobAssigned()`
- Job status changed → `notifyJobStatusChanged()`
- Job completed → `notifyJobStatusChanged()`
- Comment added to job → Create notification with type `JOB_COMMENT`

**Invoice Operations**:
- Invoice created → `createNotification()` with type `INVOICE_CREATED`
- Invoice paid → `notifyInvoicePaid()`
- Invoice overdue → Create notification with type `INVOICE_OVERDUE`

**Time Entry Operations**:
- Time entry approved → `notifyTimeEntryApproved()`
- Time entry rejected → Create notification with type `TIME_ENTRY_REJECTED`

**User Operations**:
- User invited → Create notification with type `USER_INVITED`
- Role changed → Create notification with type `USER_ROLE_CHANGED`
- Mentioned in comment → `notifyUserMentioned()`

---

## Future Enhancements

- [ ] **Email Notifications**: Send email when notification created
- [ ] **Push Notifications**: Browser push notifications
- [ ] **SMS Notifications**: Text message alerts for urgent notifications
- [ ] **Notification Groups**: Group similar notifications
- [ ] **Notification Templates**: Predefined templates for common notifications
- [ ] **Scheduled Notifications**: Schedule notifications for future delivery
- [ ] **Notification Analytics**: Track notification engagement
- [ ] **Rich Notifications**: Support images, buttons, custom layouts

---

## Resources

- **Notification Service**: `src/lib/notifications/notification-service.ts`
- **React Hooks**: `src/hooks/useNotifications.ts`
- **Notification Bell**: `src/components/NotificationBell.tsx`
- **Notifications Screen**: `src/pages/NotificationsScreen.tsx`
- **Firestore Rules**: `firestore.rules` (lines 339-392)

---

**Last Updated**: 2025-10-17
**Maintained By**: Development Team
**Questions?**: See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

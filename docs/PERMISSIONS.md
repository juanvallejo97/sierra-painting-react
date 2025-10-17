# Advanced RBAC & Permissions System

**Date**: 2025-10-17
**Status**: ✅ Implemented
**Version**: 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Concepts](#core-concepts)
4. [Permission Definitions](#permission-definitions)
5. [Usage Guide](#usage-guide)
6. [React Components](#react-components)
7. [Permission Checking](#permission-checking)
8. [Role Comparison](#role-comparison)
9. [Best Practices](#best-practices)
10. [Examples](#examples)

---

## Overview

The Advanced RBAC (Role-Based Access Control) system provides fine-grained permission management beyond simple role checks. It enables:

- **Granular Permissions**: Control access at the resource and action level
- **Scope-Based Access**: Differentiate between own, team, and all resources
- **Resource Ownership**: Check permissions based on resource ownership
- **React Integration**: Seamless hooks and components for UI
- **Type Safety**: Full TypeScript support with strict typing

### Key Features

✅ **30+ Resources** - Jobs, invoices, users, reports, settings, etc.
✅ **8 Actions** - Create, read, update, delete, list, export, approve, assign
✅ **3 Scopes** - Own, team, all
✅ **4 Roles** - Admin, manager, worker, client (future)
✅ **React Hooks** - `usePermissions()`, `useResourcePermissions()`
✅ **Permission Gates** - Conditional rendering based on permissions
✅ **Admin UI** - Permission matrix viewer and role comparison

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Application Layer                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Components │  │    Hooks     │  │    Routes    │  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │           │
│         └─────────────────┼─────────────────┘           │
│                           │                             │
└───────────────────────────┼─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│              Permission Checking Layer                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │         usePermissions() Hook                     │  │
│  │  - can(resource, action, scope)                   │  │
│  │  - canAccess(resource, action, ownership)         │  │
│  │  - isAdmin, isManager, isWorker                   │  │
│  └──────────────────┬───────────────────────────────┘  │
└─────────────────────┼───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│              Permission Definition Layer                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │   ROLE_PERMISSIONS_MAP                            │  │
│  │   - ADMIN_PERMISSIONS (60+ permissions)           │  │
│  │   - MANAGER_PERMISSIONS (40+ permissions)         │  │
│  │   - WORKER_PERMISSIONS (20+ permissions)          │  │
│  └──────────────────┬───────────────────────────────┘  │
└─────────────────────┼───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                 Firestore Rules                          │
│  - Server-side validation                               │
│  - Multi-tenant isolation                                │
│  - Company-level access control                          │
└─────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### Resources

Resources are the entities in your system that require access control.

```typescript
export enum Resource {
  // Core Business
  JOBS = 'jobs',
  INVOICES = 'invoices',
  ESTIMATES = 'estimates',
  TIME_ENTRIES = 'timeEntries',

  // User Management
  USERS = 'users',
  EMPLOYEES = 'employees',
  ROLES = 'roles',

  // Administrative
  COMPANY = 'company',
  SETTINGS = 'settings',
  AUDIT_LOGS = 'auditLogs',

  // Reports & Analytics
  REPORTS = 'reports',
  ANALYTICS = 'analytics',
  EXPORTS = 'exports',

  // System
  NOTIFICATIONS = 'notifications',
  ACTIVITY_FEED = 'activityFeed',
}
```

### Actions

Actions define what can be done to a resource.

```typescript
export enum Action {
  CREATE = 'create',  // Create new resource
  READ = 'read',      // View resource
  UPDATE = 'update',  // Modify resource
  DELETE = 'delete',  // Remove resource
  LIST = 'list',      // View list of resources
  EXPORT = 'export',  // Export data
  APPROVE = 'approve', // Approve/reject (invoices, time entries)
  ASSIGN = 'assign',  // Assign resources to users
}
```

### Scopes

Scopes define the breadth of access for a permission.

```typescript
export enum Scope {
  OWN = 'own',   // User can only access their own resources
  TEAM = 'team', // User can access their team's resources
  ALL = 'all',   // User can access all resources in company
}
```

**Scope Hierarchy**: `ALL > TEAM > OWN`

- If you have `ALL` scope, you automatically have `TEAM` and `OWN`
- If you have `TEAM` scope, you automatically have `OWN`
- If you have `OWN` scope, you can only access your own resources

### Permissions

A permission is a combination of Resource + Action + Scope:

```typescript
interface Permission {
  resource: Resource;
  action: Action;
  scope: Scope;
  conditions?: PermissionCondition[]; // Future: Advanced conditions
}
```

**Permission String Format**: `"resource:action:scope"`

Examples:
- `"jobs:read:all"` - Can read all jobs
- `"jobs:create:own"` - Can only create own jobs
- `"invoices:delete:all"` - Can delete any invoice

### Roles

Roles are collections of permissions assigned to users.

```typescript
export enum UserRole {
  ADMIN = 'admin',     // Full access
  MANAGER = 'manager', // Operational management
  WORKER = 'worker',   // Limited to assigned work
  CLIENT = 'client',   // Future: Customer portal
}
```

---

## Permission Definitions

### Admin Role

**Description**: Full access to all resources and administrative functions

**Permissions**: 60+ permissions across all resources

Key capabilities:
- ✅ Full CRUD on jobs, invoices, estimates
- ✅ User & employee management
- ✅ Role & permission management
- ✅ Company settings & configuration
- ✅ Audit log access
- ✅ All reports & analytics
- ✅ System administration

### Manager Role

**Description**: Manage operations, jobs, invoices, and team members

**Permissions**: 40+ permissions

Key capabilities:
- ✅ Full CRUD on jobs, invoices, estimates
- ✅ View users, limited employee management
- ✅ Approve time entries and invoices
- ✅ Generate reports & analytics
- ✅ Export data
- ❌ Cannot delete invoices
- ❌ Cannot manage roles
- ❌ Cannot view audit logs
- ❌ Read-only company settings

### Worker Role

**Description**: Access to assigned jobs and own time entries

**Permissions**: 20+ permissions

Key capabilities:
- ✅ Read assigned jobs (TEAM scope)
- ✅ Update assigned jobs (TEAM scope)
- ✅ Full CRUD on own time entries (OWN scope)
- ✅ Read invoices/estimates (TEAM scope)
- ✅ Update own profile (OWN scope)
- ❌ Cannot create jobs
- ❌ Cannot delete anything
- ❌ Cannot access other users' data
- ❌ Read-only company info

### Client Role (Future)

**Description**: View own jobs, invoices, and estimates

**Permissions**: To be defined (customer portal feature)

---

## Usage Guide

### In React Components

#### Basic Permission Check

```typescript
import { usePermissions } from '../lib/permissions/permission-checker';
import { Resource, Action, Scope } from '../lib/permissions/permissions';

function JobActions() {
  const { can, isAdmin } = usePermissions();

  return (
    <div>
      {can(Resource.JOBS, Action.CREATE) && (
        <button>Create Job</button>
      )}

      {can(Resource.JOBS, Action.DELETE, Scope.ALL) && (
        <button>Delete Job</button>
      )}

      {isAdmin && (
        <button>Admin Actions</button>
      )}
    </div>
  );
}
```

#### With Resource Ownership

```typescript
function JobCard({ job }) {
  const { canAccess, user } = usePermissions();

  const ownership = {
    ownerId: job.createdBy,
    teamMembers: job.workers,
    companyId: job.companyId,
  };

  const canEdit = canAccess(Resource.JOBS, Action.UPDATE, ownership);

  return (
    <div>
      <h3>{job.name}</h3>
      {canEdit.allowed && (
        <button>Edit</button>
      )}
    </div>
  );
}
```

#### Using Permission Gates

```typescript
import { PermissionGate, AdminGate } from '../components/guards/PermissionGate';
import { Resource, Action, Scope } from '../lib/permissions/permissions';

function Dashboard() {
  return (
    <div>
      {/* Simple permission gate */}
      <PermissionGate resource={Resource.JOBS} action={Action.CREATE}>
        <CreateJobButton />
      </PermissionGate>

      {/* With scope */}
      <PermissionGate
        resource={Resource.JOBS}
        action={Action.DELETE}
        scope={Scope.ALL}
      >
        <DeleteAllJobsButton />
      </PermissionGate>

      {/* Admin only */}
      <AdminGate>
        <AdminPanel />
      </AdminGate>

      {/* With fallback */}
      <PermissionGate
        resource={Resource.REPORTS}
        action={Action.READ}
        fallback={<div>Access Denied</div>}
      >
        <ReportViewer />
      </PermissionGate>
    </div>
  );
}
```

### Outside React Components

```typescript
import { PermissionChecker } from '../lib/permissions/permission-checker';
import { Resource, Action } from '../lib/permissions/permissions';

// Create checker instance
const checker = new PermissionChecker('admin', userId, companyId);

// Check permissions
if (checker.can(Resource.JOBS, Action.DELETE)) {
  // Delete job
}

// Check with ownership
const canEdit = checker.canAccess(
  Resource.JOBS,
  Action.UPDATE,
  { ownerId: job.createdBy }
);

if (canEdit.allowed) {
  // Edit job
}
```

---

## React Components

### PermissionGate

Conditionally render content based on permissions.

```typescript
<PermissionGate
  resource={Resource.JOBS}
  action={Action.CREATE}
  scope={Scope.ALL}
  ownership={{ ownerId: userId }}
  fallback={<div>No access</div>}
>
  <ProtectedContent />
</PermissionGate>
```

**Props**:
- `resource` - Resource to check
- `action` - Action to check
- `scope` - Required scope (default: OWN)
- `ownership` - Resource ownership info
- `requireAll` - Array of permissions (AND logic)
- `requireAny` - Array of permissions (OR logic)
- `requireAdmin` - Admin-only
- `requireManager` - Manager+ only
- `fallback` - Content when denied
- `invert` - Invert logic (show when denied)

### AdminGate

Shortcut for admin-only content.

```typescript
<AdminGate fallback={<div>Admins only</div>}>
  <AdminPanel />
</AdminGate>
```

### ManagerGate

Shortcut for manager+ content.

```typescript
<ManagerGate>
  <ManagerDashboard />
</ManagerGate>
```

### RequirePermission

Permission gate with styled error message.

```typescript
<RequirePermission
  resource={Resource.AUDIT_LOGS}
  action={Action.READ}
  errorMessage="You need admin access to view audit logs"
>
  <AuditLogViewer />
</RequirePermission>
```

### PermissionButton

Button that's disabled when permission is lacking.

```typescript
<PermissionButton
  resource={Resource.JOBS}
  action={Action.DELETE}
  scope={Scope.ALL}
  disabledTooltip="You cannot delete jobs"
  onClick={handleDelete}
>
  Delete
</PermissionButton>
```

---

## Permission Checking

### usePermissions Hook

Primary hook for permission checking.

```typescript
const {
  // User info
  userRole,
  user,
  userData,
  userPermissions,

  // Permission checks
  can,
  cannot,
  canAccess,
  canAll,
  canAny,
  canByString,
  getScope,

  // Role checks
  isAdmin,
  isManager,
  isWorker,

  // Ownership checks
  owns,
  inSameCompany,
} = usePermissions();
```

**Methods**:

#### can(resource, action, scope?)

Check if user has permission.

```typescript
const canCreate = can(Resource.JOBS, Action.CREATE);
const canDeleteAll = can(Resource.JOBS, Action.DELETE, Scope.ALL);
```

#### cannot(resource, action, scope?)

Inverse of `can`.

```typescript
if (cannot(Resource.JOBS, Action.DELETE)) {
  // Show error
}
```

#### canAccess(resource, action, ownership?)

Check permission with resource ownership.

```typescript
const result = canAccess(Resource.JOBS, Action.UPDATE, {
  ownerId: job.createdBy,
  teamMembers: job.workers,
});

if (result.allowed) {
  console.log('Access granted with scope:', result.scope);
} else {
  console.log('Access denied:', result.reason);
}
```

#### canAll(checks)

Check multiple permissions (AND logic).

```typescript
const canDoAll = canAll([
  { resource: Resource.JOBS, action: Action.CREATE },
  { resource: Resource.INVOICES, action: Action.CREATE },
]);
```

#### canAny(checks)

Check multiple permissions (OR logic).

```typescript
const canDoAny = canAny([
  { resource: Resource.JOBS, action: Action.UPDATE, scope: Scope.ALL },
  { resource: Resource.JOBS, action: Action.UPDATE, scope: Scope.OWN },
]);
```

### useResourcePermissions Hook

Specialized hook for a specific resource.

```typescript
const {
  canCreate,
  canRead,
  canUpdate,
  canDelete,
  canList,
  canExport,
  // ... all usePermissions methods
} = useResourcePermissions(Resource.JOBS);
```

---

## Role Comparison

Compare permissions between roles:

```typescript
import { compareRolePermissions } from '../lib/permissions/permission-checker';
import { UserRole } from '../lib/permissions/permissions';

const comparison = compareRolePermissions(UserRole.ADMIN, UserRole.MANAGER);

console.log('Admin only:', comparison.role1Only);
console.log('Manager only:', comparison.role2Only);
console.log('Shared:', comparison.shared);
```

Generate permission matrix for a role:

```typescript
import { generatePermissionMatrix } from '../lib/permissions/permission-checker';
import { UserRole } from '../lib/permissions/permissions';

const matrix = generatePermissionMatrix(UserRole.MANAGER);

matrix.forEach(entry => {
  console.log(`Resource: ${entry.resource}`);
  entry.actions.forEach(action => {
    if (action.allowed) {
      console.log(`  - ${action.action}: ${action.scope}`);
    }
  });
});
```

---

## Best Practices

### ✅ Do

1. **Use Permission Gates for UI**
   ```typescript
   <PermissionGate resource={Resource.JOBS} action={Action.DELETE}>
     <DeleteButton />
   </PermissionGate>
   ```

2. **Check Ownership for Sensitive Operations**
   ```typescript
   const canEdit = canAccess(Resource.JOBS, Action.UPDATE, {
     ownerId: job.createdBy,
     teamMembers: job.workers,
   });
   ```

3. **Use Specific Scopes**
   ```typescript
   // Good - explicit scope
   can(Resource.JOBS, Action.DELETE, Scope.ALL)

   // Avoid - ambiguous
   can(Resource.JOBS, Action.DELETE)
   ```

4. **Combine with Firestore Rules**
   ```javascript
   // Client-side check
   if (can(Resource.JOBS, Action.DELETE, Scope.ALL)) {
     // Server-side enforcement
     await deleteDoc(doc(db, 'jobs', jobId));
   }
   ```

5. **Handle Edge Cases**
   ```typescript
   const result = canAccess(Resource.JOBS, Action.UPDATE, ownership);

   if (!result.allowed) {
     toast.error(result.reason || 'Access denied');
     return;
   }
   ```

### ❌ Don't

1. **Don't Skip Server-Side Validation**
   ```typescript
   // ❌ Client-side only
   if (can(Resource.JOBS, Action.DELETE)) {
     await deleteDoc(...); // Could be bypassed
   }

   // ✅ Client-side + Firestore rules
   if (can(Resource.JOBS, Action.DELETE)) {
     await deleteDoc(...); // Firestore rules enforce
   }
   ```

2. **Don't Hardcode Role Checks**
   ```typescript
   // ❌ Bad
   if (userRole === 'admin') {
     // Show button
   }

   // ✅ Good
   if (can(Resource.JOBS, Action.DELETE, Scope.ALL)) {
     // Show button
   }
   ```

3. **Don't Forget Loading States**
   ```typescript
   // ❌ Bad
   <PermissionGate resource={Resource.JOBS} action={Action.CREATE}>
     <Button />
   </PermissionGate>

   // ✅ Good
   <PermissionGate
     resource={Resource.JOBS}
     action={Action.CREATE}
     loading={<Skeleton />}
   >
     <Button />
   </PermissionGate>
   ```

---

## Examples

### Example 1: Conditional Button Rendering

```typescript
function JobActions({ job }) {
  const { can, owns, isAdmin } = usePermissions();

  return (
    <div className="flex gap-2">
      {/* Anyone who can update jobs */}
      {can(Resource.JOBS, Action.UPDATE) && (
        <button>Edit</button>
      )}

      {/* Only admins or owner can delete */}
      {(isAdmin || owns(job.createdBy)) && (
        <button>Delete</button>
      )}

      {/* Only admins can view audit log */}
      {isAdmin && (
        <button>View Audit Log</button>
      )}
    </div>
  );
}
```

### Example 2: Protected Route

```typescript
import { RequirePermission } from '../components/guards/PermissionGate';
import { Resource, Action, Scope } from '../lib/permissions/permissions';

function ReportsPage() {
  return (
    <RequirePermission
      resource={Resource.REPORTS}
      action={Action.READ}
      scope={Scope.ALL}
      errorMessage="You need manager or admin access to view reports"
    >
      <ReportsDashboard />
    </RequirePermission>
  );
}
```

### Example 3: Dynamic Menu Items

```typescript
function NavigationMenu() {
  const { can, isAdmin, isManager } = usePermissions();

  const menuItems = [
    {
      label: 'Dashboard',
      path: '/',
      show: true,
    },
    {
      label: 'Jobs',
      path: '/jobs',
      show: can(Resource.JOBS, Action.LIST),
    },
    {
      label: 'Invoices',
      path: '/invoices',
      show: can(Resource.INVOICES, Action.LIST),
    },
    {
      label: 'Reports',
      path: '/reports',
      show: isManager,
    },
    {
      label: 'Settings',
      path: '/settings',
      show: isAdmin,
    },
    {
      label: 'Permissions',
      path: '/admin/permissions',
      show: isAdmin,
    },
  ];

  return (
    <nav>
      {menuItems.filter(item => item.show).map(item => (
        <a key={item.path} href={item.path}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}
```

### Example 4: API Request with Permission Check

```typescript
async function deleteJob(jobId: string) {
  const { can, isAdmin, owns } = usePermissions();

  // Fetch job to check ownership
  const job = await getJob(jobId);

  // Check permission with ownership
  const canDelete = can(Resource.JOBS, Action.DELETE, Scope.ALL) ||
                    (can(Resource.JOBS, Action.DELETE, Scope.OWN) && owns(job.createdBy));

  if (!canDelete) {
    throw new Error('Permission denied: Cannot delete this job');
  }

  // Proceed with deletion
  await deleteDoc(doc(db, 'jobs', jobId));

  // Log audit event
  await logDataDelete('jobs', jobId, job);
}
```

### Example 5: Complex Permission Logic

```typescript
function InvoiceActions({ invoice }) {
  const { canAccess, isAdmin } = usePermissions();

  const ownership = {
    ownerId: invoice.createdBy,
    companyId: invoice.companyId,
  };

  // Check update permission
  const canUpdate = canAccess(Resource.INVOICES, Action.UPDATE, ownership);

  // Check approve permission
  const canApprove = canAccess(Resource.INVOICES, Action.APPROVE, ownership);

  // Check delete permission (admin only)
  const canDelete = isAdmin && canAccess(Resource.INVOICES, Action.DELETE, ownership);

  return (
    <div>
      {canUpdate.allowed && (
        <button>Edit Invoice</button>
      )}

      {canApprove.allowed && invoice.status === 'draft' && (
        <button>Approve Invoice</button>
      )}

      {canDelete.allowed && (
        <button className="text-red-600">Delete Invoice</button>
      )}

      {!canUpdate.allowed && (
        <p className="text-gray-500">
          {canUpdate.reason || 'You cannot edit this invoice'}
        </p>
      )}
    </div>
  );
}
```

---

## Admin Tools

### Permission Matrix Viewer

Access the admin panel to view permissions:

```
/admin/permissions
```

Features:
- **Permission Matrix**: View all permissions for each role
- **Role Details**: See grouped permissions by resource
- **Role Comparison**: Compare permissions between two roles
- **Export**: Download permission data as JSON or CSV

### Permission Debugging

```typescript
import { exportPermissionMatrix } from '../lib/permissions/permissions';

// Export full permission matrix
const matrix = exportPermissionMatrix();
console.log(matrix);

// Check specific permission
import { roleHasPermission } from '../lib/permissions/permissions';

const hasPermission = roleHasPermission(
  UserRole.MANAGER,
  Resource.JOBS,
  Action.DELETE,
  Scope.ALL
);
console.log('Manager can delete jobs (all scope):', hasPermission);
```

---

## Integration with Firestore Rules

The permission system works alongside Firestore security rules:

**Client-Side** (Performance):
```typescript
// Fast check - no server round-trip
if (can(Resource.JOBS, Action.DELETE, Scope.ALL)) {
  // Show delete button
}
```

**Server-Side** (Security):
```javascript
// firestore.rules
allow delete: if isAuthenticated()
               && userExists()
               && isAdmin()
               && belongsToUserCompany(resource.data.companyId);
```

**Always enforce permissions on both client and server!**

---

## Future Enhancements

- [ ] **Custom Permissions**: Allow creating custom permissions beyond roles
- [ ] **Permission Conditions**: Add conditional logic (time-based, location-based)
- [ ] **Permission Delegation**: Temporary permission grants
- [ ] **Permission Audit**: Track permission changes over time
- [ ] **Client Role**: Implement customer portal with client permissions
- [ ] **Field-Level Permissions**: Control access to specific fields
- [ ] **API Key Permissions**: Permissions for API integrations

---

## Resources

- **Permission System Code**: `src/lib/permissions/`
- **Permission Guards**: `src/components/guards/`
- **Admin Panel**: `src/pages/admin/PermissionsScreen.tsx`
- **Firestore Rules**: `firestore.rules`

---

**Last Updated**: 2025-10-17
**Maintained By**: Development Team
**Questions?**: See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

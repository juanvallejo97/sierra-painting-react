/**
 * Advanced RBAC (Role-Based Access Control) & Permissions System
 *
 * This module defines fine-grained permissions beyond basic role checks.
 * It provides:
 * - Granular permissions for each resource type
 * - Resource-level access control (own vs. all)
 * - Permission checking utilities
 * - Role-to-permission mapping
 */

/**
 * Resource Types in the System
 */
export enum Resource {
  // Core Business Resources
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

/**
 * Permission Actions
 */
export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  EXPORT = 'export',
  APPROVE = 'approve',
  ASSIGN = 'assign',
}

/**
 * Scope of Permission
 */
export enum Scope {
  OWN = 'own', // User can only access their own resources
  TEAM = 'team', // User can access their team's resources
  ALL = 'all', // User can access all resources in the company
}

/**
 * Permission Interface
 */
export interface Permission {
  resource: Resource;
  action: Action;
  scope: Scope;
  conditions?: PermissionCondition[];
}

/**
 * Permission Condition (for advanced rules)
 */
export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'notIn' | 'contains';
  value: unknown;
}

/**
 * User Role Enum
 */
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  WORKER = 'worker',
  CLIENT = 'client', // Future: For customer portal
}

/**
 * Complete Permission Set for a Role
 */
export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
  description: string;
}

/**
 * Permission String Format: "resource:action:scope"
 * Examples:
 * - "jobs:read:all" - Can read all jobs
 * - "jobs:create:own" - Can only create own jobs
 * - "users:delete:all" - Can delete any user
 */
export type PermissionString = string;

/**
 * Convert Permission to String
 */
export function permissionToString(permission: Permission): PermissionString {
  return `${permission.resource}:${permission.action}:${permission.scope}`;
}

/**
 * Parse Permission String
 */
export function parsePermissionString(permString: PermissionString): Permission | null {
  const parts = permString.split(':');
  if (parts.length !== 3) return null;

  const [resource, action, scope] = parts;

  if (
    !Object.values(Resource).includes(resource as Resource) ||
    !Object.values(Action).includes(action as Action) ||
    !Object.values(Scope).includes(scope as Scope)
  ) {
    return null;
  }

  return {
    resource: resource as Resource,
    action: action as Action,
    scope: scope as Scope,
  };
}

// ============================================================================
// ROLE PERMISSION DEFINITIONS
// ============================================================================

/**
 * ADMIN - Full Access to Everything
 */
const ADMIN_PERMISSIONS: Permission[] = [
  // Jobs - Full access
  { resource: Resource.JOBS, action: Action.CREATE, scope: Scope.ALL },
  { resource: Resource.JOBS, action: Action.READ, scope: Scope.ALL },
  { resource: Resource.JOBS, action: Action.UPDATE, scope: Scope.ALL },
  { resource: Resource.JOBS, action: Action.DELETE, scope: Scope.ALL },
  { resource: Resource.JOBS, action: Action.LIST, scope: Scope.ALL },
  { resource: Resource.JOBS, action: Action.EXPORT, scope: Scope.ALL },
  { resource: Resource.JOBS, action: Action.ASSIGN, scope: Scope.ALL },

  // Invoices - Full access
  { resource: Resource.INVOICES, action: Action.CREATE, scope: Scope.ALL },
  { resource: Resource.INVOICES, action: Action.READ, scope: Scope.ALL },
  { resource: Resource.INVOICES, action: Action.UPDATE, scope: Scope.ALL },
  { resource: Resource.INVOICES, action: Action.DELETE, scope: Scope.ALL },
  { resource: Resource.INVOICES, action: Action.LIST, scope: Scope.ALL },
  { resource: Resource.INVOICES, action: Action.EXPORT, scope: Scope.ALL },
  { resource: Resource.INVOICES, action: Action.APPROVE, scope: Scope.ALL },

  // Estimates - Full access
  { resource: Resource.ESTIMATES, action: Action.CREATE, scope: Scope.ALL },
  { resource: Resource.ESTIMATES, action: Action.READ, scope: Scope.ALL },
  { resource: Resource.ESTIMATES, action: Action.UPDATE, scope: Scope.ALL },
  { resource: Resource.ESTIMATES, action: Action.DELETE, scope: Scope.ALL },
  { resource: Resource.ESTIMATES, action: Action.LIST, scope: Scope.ALL },
  { resource: Resource.ESTIMATES, action: Action.EXPORT, scope: Scope.ALL },

  // Time Entries - Full access
  { resource: Resource.TIME_ENTRIES, action: Action.CREATE, scope: Scope.ALL },
  { resource: Resource.TIME_ENTRIES, action: Action.READ, scope: Scope.ALL },
  { resource: Resource.TIME_ENTRIES, action: Action.UPDATE, scope: Scope.ALL },
  { resource: Resource.TIME_ENTRIES, action: Action.DELETE, scope: Scope.ALL },
  { resource: Resource.TIME_ENTRIES, action: Action.LIST, scope: Scope.ALL },
  { resource: Resource.TIME_ENTRIES, action: Action.APPROVE, scope: Scope.ALL },

  // Users & Employees - Full access
  { resource: Resource.USERS, action: Action.CREATE, scope: Scope.ALL },
  { resource: Resource.USERS, action: Action.READ, scope: Scope.ALL },
  { resource: Resource.USERS, action: Action.UPDATE, scope: Scope.ALL },
  { resource: Resource.USERS, action: Action.DELETE, scope: Scope.ALL },
  { resource: Resource.USERS, action: Action.LIST, scope: Scope.ALL },
  { resource: Resource.EMPLOYEES, action: Action.CREATE, scope: Scope.ALL },
  { resource: Resource.EMPLOYEES, action: Action.READ, scope: Scope.ALL },
  { resource: Resource.EMPLOYEES, action: Action.UPDATE, scope: Scope.ALL },
  { resource: Resource.EMPLOYEES, action: Action.DELETE, scope: Scope.ALL },
  { resource: Resource.EMPLOYEES, action: Action.LIST, scope: Scope.ALL },

  // Roles & Permissions - Admin only
  { resource: Resource.ROLES, action: Action.CREATE, scope: Scope.ALL },
  { resource: Resource.ROLES, action: Action.READ, scope: Scope.ALL },
  { resource: Resource.ROLES, action: Action.UPDATE, scope: Scope.ALL },
  { resource: Resource.ROLES, action: Action.DELETE, scope: Scope.ALL },

  // Company & Settings - Full access
  { resource: Resource.COMPANY, action: Action.READ, scope: Scope.ALL },
  { resource: Resource.COMPANY, action: Action.UPDATE, scope: Scope.ALL },
  { resource: Resource.SETTINGS, action: Action.READ, scope: Scope.ALL },
  { resource: Resource.SETTINGS, action: Action.UPDATE, scope: Scope.ALL },

  // Audit Logs - Admin only
  { resource: Resource.AUDIT_LOGS, action: Action.READ, scope: Scope.ALL },
  { resource: Resource.AUDIT_LOGS, action: Action.EXPORT, scope: Scope.ALL },

  // Reports & Analytics - Full access
  { resource: Resource.REPORTS, action: Action.CREATE, scope: Scope.ALL },
  { resource: Resource.REPORTS, action: Action.READ, scope: Scope.ALL },
  { resource: Resource.REPORTS, action: Action.EXPORT, scope: Scope.ALL },
  { resource: Resource.ANALYTICS, action: Action.READ, scope: Scope.ALL },
  { resource: Resource.EXPORTS, action: Action.CREATE, scope: Scope.ALL },

  // Notifications & Activity
  { resource: Resource.NOTIFICATIONS, action: Action.READ, scope: Scope.ALL },
  { resource: Resource.ACTIVITY_FEED, action: Action.READ, scope: Scope.ALL },
];

/**
 * MANAGER - Can manage operations but limited user management
 */
const MANAGER_PERMISSIONS: Permission[] = [
  // Jobs - Full access
  { resource: Resource.JOBS, action: Action.CREATE, scope: Scope.ALL },
  { resource: Resource.JOBS, action: Action.READ, scope: Scope.ALL },
  { resource: Resource.JOBS, action: Action.UPDATE, scope: Scope.ALL },
  { resource: Resource.JOBS, action: Action.DELETE, scope: Scope.ALL },
  { resource: Resource.JOBS, action: Action.LIST, scope: Scope.ALL },
  { resource: Resource.JOBS, action: Action.EXPORT, scope: Scope.ALL },
  { resource: Resource.JOBS, action: Action.ASSIGN, scope: Scope.ALL },

  // Invoices - Full access
  { resource: Resource.INVOICES, action: Action.CREATE, scope: Scope.ALL },
  { resource: Resource.INVOICES, action: Action.READ, scope: Scope.ALL },
  { resource: Resource.INVOICES, action: Action.UPDATE, scope: Scope.ALL },
  { resource: Resource.INVOICES, action: Action.LIST, scope: Scope.ALL },
  { resource: Resource.INVOICES, action: Action.EXPORT, scope: Scope.ALL },
  { resource: Resource.INVOICES, action: Action.APPROVE, scope: Scope.ALL },
  // Note: Cannot delete invoices

  // Estimates - Full access
  { resource: Resource.ESTIMATES, action: Action.CREATE, scope: Scope.ALL },
  { resource: Resource.ESTIMATES, action: Action.READ, scope: Scope.ALL },
  { resource: Resource.ESTIMATES, action: Action.UPDATE, scope: Scope.ALL },
  { resource: Resource.ESTIMATES, action: Action.LIST, scope: Scope.ALL },
  { resource: Resource.ESTIMATES, action: Action.EXPORT, scope: Scope.ALL },

  // Time Entries - Full access
  { resource: Resource.TIME_ENTRIES, action: Action.CREATE, scope: Scope.ALL },
  { resource: Resource.TIME_ENTRIES, action: Action.READ, scope: Scope.ALL },
  { resource: Resource.TIME_ENTRIES, action: Action.UPDATE, scope: Scope.ALL },
  { resource: Resource.TIME_ENTRIES, action: Action.LIST, scope: Scope.ALL },
  { resource: Resource.TIME_ENTRIES, action: Action.APPROVE, scope: Scope.ALL },

  // Users - Read only
  { resource: Resource.USERS, action: Action.READ, scope: Scope.ALL },
  { resource: Resource.USERS, action: Action.LIST, scope: Scope.ALL },
  // Employees - Limited management
  { resource: Resource.EMPLOYEES, action: Action.READ, scope: Scope.ALL },
  { resource: Resource.EMPLOYEES, action: Action.UPDATE, scope: Scope.ALL },
  { resource: Resource.EMPLOYEES, action: Action.LIST, scope: Scope.ALL },

  // Company & Settings - Read only
  { resource: Resource.COMPANY, action: Action.READ, scope: Scope.ALL },
  { resource: Resource.SETTINGS, action: Action.READ, scope: Scope.ALL },

  // Reports & Analytics - Full access
  { resource: Resource.REPORTS, action: Action.CREATE, scope: Scope.ALL },
  { resource: Resource.REPORTS, action: Action.READ, scope: Scope.ALL },
  { resource: Resource.REPORTS, action: Action.EXPORT, scope: Scope.ALL },
  { resource: Resource.ANALYTICS, action: Action.READ, scope: Scope.ALL },
  { resource: Resource.EXPORTS, action: Action.CREATE, scope: Scope.ALL },

  // Notifications & Activity
  { resource: Resource.NOTIFICATIONS, action: Action.READ, scope: Scope.ALL },
  { resource: Resource.ACTIVITY_FEED, action: Action.READ, scope: Scope.ALL },
];

/**
 * WORKER - Limited to own work and assigned jobs
 */
const WORKER_PERMISSIONS: Permission[] = [
  // Jobs - Read assigned jobs only
  { resource: Resource.JOBS, action: Action.READ, scope: Scope.TEAM }, // Jobs assigned to them
  { resource: Resource.JOBS, action: Action.UPDATE, scope: Scope.TEAM }, // Update assigned jobs
  { resource: Resource.JOBS, action: Action.LIST, scope: Scope.TEAM },

  // Invoices - Read only (for reference)
  { resource: Resource.INVOICES, action: Action.READ, scope: Scope.TEAM },
  { resource: Resource.INVOICES, action: Action.LIST, scope: Scope.TEAM },

  // Estimates - Read only
  { resource: Resource.ESTIMATES, action: Action.READ, scope: Scope.TEAM },
  { resource: Resource.ESTIMATES, action: Action.LIST, scope: Scope.TEAM },

  // Time Entries - Full access to own
  { resource: Resource.TIME_ENTRIES, action: Action.CREATE, scope: Scope.OWN },
  { resource: Resource.TIME_ENTRIES, action: Action.READ, scope: Scope.OWN },
  { resource: Resource.TIME_ENTRIES, action: Action.UPDATE, scope: Scope.OWN },
  { resource: Resource.TIME_ENTRIES, action: Action.DELETE, scope: Scope.OWN },
  { resource: Resource.TIME_ENTRIES, action: Action.LIST, scope: Scope.OWN },

  // Users - Read own profile only
  { resource: Resource.USERS, action: Action.READ, scope: Scope.OWN },
  { resource: Resource.USERS, action: Action.UPDATE, scope: Scope.OWN },

  // Company - Read only (basic info)
  { resource: Resource.COMPANY, action: Action.READ, scope: Scope.ALL },

  // Notifications & Activity - Own only
  { resource: Resource.NOTIFICATIONS, action: Action.READ, scope: Scope.OWN },
  { resource: Resource.ACTIVITY_FEED, action: Action.READ, scope: Scope.OWN },
];

/**
 * All Role Permissions Mapped
 */
export const ROLE_PERMISSIONS_MAP: Record<UserRole, RolePermissions> = {
  [UserRole.ADMIN]: {
    role: UserRole.ADMIN,
    permissions: ADMIN_PERMISSIONS,
    description: 'Full access to all resources and administrative functions',
  },
  [UserRole.MANAGER]: {
    role: UserRole.MANAGER,
    permissions: MANAGER_PERMISSIONS,
    description: 'Manage operations, jobs, invoices, and team members',
  },
  [UserRole.WORKER]: {
    role: UserRole.WORKER,
    permissions: WORKER_PERMISSIONS,
    description: 'Access to assigned jobs and own time entries',
  },
  [UserRole.CLIENT]: {
    role: UserRole.CLIENT,
    permissions: [], // Future: Client portal permissions
    description: 'View own jobs, invoices, and estimates (future feature)',
  },
};

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS_MAP[role]?.permissions || [];
}

/**
 * Get all permission strings for a role
 */
export function getPermissionStringsForRole(role: UserRole): PermissionString[] {
  return getPermissionsForRole(role).map(permissionToString);
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(
  role: UserRole,
  resource: Resource,
  action: Action,
  requiredScope: Scope = Scope.ALL
): boolean {
  const rolePermissions = getPermissionsForRole(role);

  return rolePermissions.some((perm) => {
    if (perm.resource !== resource || perm.action !== action) {
      return false;
    }

    // Check scope hierarchy: ALL > TEAM > OWN
    if (requiredScope === Scope.OWN) {
      return perm.scope === Scope.OWN || perm.scope === Scope.TEAM || perm.scope === Scope.ALL;
    }
    if (requiredScope === Scope.TEAM) {
      return perm.scope === Scope.TEAM || perm.scope === Scope.ALL;
    }
    if (requiredScope === Scope.ALL) {
      return perm.scope === Scope.ALL;
    }

    return false;
  });
}

/**
 * Get the maximum scope a role has for a resource/action
 */
export function getMaxScope(role: UserRole, resource: Resource, action: Action): Scope | null {
  const rolePermissions = getPermissionsForRole(role);

  const matchingPerms = rolePermissions.filter(
    (perm) => perm.resource === resource && perm.action === action
  );

  if (matchingPerms.length === 0) return null;

  // Return highest scope
  if (matchingPerms.some((p) => p.scope === Scope.ALL)) return Scope.ALL;
  if (matchingPerms.some((p) => p.scope === Scope.TEAM)) return Scope.TEAM;
  if (matchingPerms.some((p) => p.scope === Scope.OWN)) return Scope.OWN;

  return null;
}

/**
 * Permission Comparison - Utility to check if permission is sufficient
 */
export function isPermissionSufficient(
  userPermission: Permission,
  requiredPermission: Permission
): boolean {
  // Must match resource and action
  if (
    userPermission.resource !== requiredPermission.resource ||
    userPermission.action !== requiredPermission.action
  ) {
    return false;
  }

  // Check scope hierarchy
  const scopeHierarchy: Record<Scope, number> = {
    [Scope.OWN]: 1,
    [Scope.TEAM]: 2,
    [Scope.ALL]: 3,
  };

  return scopeHierarchy[userPermission.scope] >= scopeHierarchy[requiredPermission.scope];
}

/**
 * Get all resources a role can access
 */
export function getAccessibleResources(role: UserRole): Resource[] {
  const permissions = getPermissionsForRole(role);
  const resources = new Set<Resource>();

  permissions.forEach((perm) => {
    resources.add(perm.resource);
  });

  return Array.from(resources);
}

/**
 * Get all actions a role can perform on a resource
 */
export function getAvailableActions(role: UserRole, resource: Resource): Action[] {
  const permissions = getPermissionsForRole(role);
  const actions = new Set<Action>();

  permissions
    .filter((perm) => perm.resource === resource)
    .forEach((perm) => {
      actions.add(perm.action);
    });

  return Array.from(actions);
}

/**
 * Check if user role can perform action (simple check)
 */
export function canPerformAction(
  role: UserRole,
  resource: Resource,
  action: Action
): boolean {
  return roleHasPermission(role, resource, action, Scope.OWN);
}

/**
 * Export permission matrix for documentation
 */
export function exportPermissionMatrix(): Record<string, Record<string, string[]>> {
  const matrix: Record<string, Record<string, string[]>> = {};

  Object.values(UserRole).forEach((role) => {
    matrix[role] = {};
    const permissions = getPermissionsForRole(role);

    permissions.forEach((perm) => {
      const resource = perm.resource;
      if (!matrix[role][resource]) {
        matrix[role][resource] = [];
      }
      matrix[role][resource].push(`${perm.action}:${perm.scope}`);
    });
  });

  return matrix;
}

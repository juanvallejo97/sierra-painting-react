/**
 * Permission Checker
 *
 * Runtime permission checking with React hooks integration
 * Provides utilities to check permissions against current user
 */

import { useCallback, useMemo } from 'react';
import { useAuth } from '../auth-context';
import {
  Resource,
  Action,
  Scope,
  UserRole,
  Permission,
  getPermissionsForRole,
  roleHasPermission,
  getMaxScope,
  canPerformAction as canPerformActionUtil,
  PermissionString,
  parsePermissionString,
} from './permissions';

/**
 * Permission Check Result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  scope?: Scope;
}

/**
 * Resource Ownership Check
 */
export interface ResourceOwnership {
  ownerId?: string;
  teamMembers?: string[];
  companyId?: string;
}

/**
 * usePermissions Hook
 *
 * Primary hook for permission checking in components
 */
export function usePermissions() {
  const { user, userData } = useAuth();

  const userRole = useMemo((): UserRole | null => {
    if (!userData?.role) return null;
    return userData.role as UserRole;
  }, [userData?.role]);

  const userPermissions = useMemo((): Permission[] => {
    if (!userRole) return [];
    return getPermissionsForRole(userRole);
  }, [userRole]);

  /**
   * Check if user can perform an action on a resource
   */
  const can = useCallback(
    (resource: Resource, action: Action, scope: Scope = Scope.OWN): boolean => {
      if (!userRole) return false;
      return roleHasPermission(userRole, resource, action, scope);
    },
    [userRole]
  );

  /**
   * Check if user cannot perform an action (inverse of can)
   */
  const cannot = useCallback(
    (resource: Resource, action: Action, scope: Scope = Scope.OWN): boolean => {
      return !can(resource, action, scope);
    },
    [can]
  );

  /**
   * Check permission with resource ownership
   */
  const canAccess = useCallback(
    (resource: Resource, action: Action, ownership?: ResourceOwnership): PermissionCheckResult => {
      if (!user || !userRole) {
        return { allowed: false, reason: 'Not authenticated' };
      }

      // Get maximum scope user has for this action
      const maxScope = getMaxScope(userRole, resource, action);

      if (!maxScope) {
        return { allowed: false, reason: 'No permission for this action' };
      }

      // If user has ALL scope, always allow
      if (maxScope === Scope.ALL) {
        return { allowed: true, scope: Scope.ALL };
      }

      // If no ownership info provided, check if user has permission at ANY scope
      if (!ownership) {
        return { allowed: maxScope !== null, scope: maxScope || undefined };
      }

      // Check TEAM scope
      if (maxScope === Scope.TEAM) {
        const isTeamMember = ownership.teamMembers?.includes(user.uid);
        const isOwner = ownership.ownerId === user.uid;

        if (isOwner || isTeamMember) {
          return { allowed: true, scope: Scope.TEAM };
        }

        return { allowed: false, reason: 'Not in team or not owner' };
      }

      // Check OWN scope
      if (maxScope === Scope.OWN) {
        if (ownership.ownerId === user.uid) {
          return { allowed: true, scope: Scope.OWN };
        }

        return { allowed: false, reason: 'Not the owner' };
      }

      return { allowed: false, reason: 'Unknown scope' };
    },
    [user, userRole]
  );

  /**
   * Check multiple permissions (AND logic - all must pass)
   */
  const canAll = useCallback(
    (checks: Array<{ resource: Resource; action: Action; scope?: Scope }>): boolean => {
      return checks.every((check) => can(check.resource, check.action, check.scope || Scope.OWN));
    },
    [can]
  );

  /**
   * Check multiple permissions (OR logic - at least one must pass)
   */
  const canAny = useCallback(
    (checks: Array<{ resource: Resource; action: Action; scope?: Scope }>): boolean => {
      return checks.some((check) => can(check.resource, check.action, check.scope || Scope.OWN));
    },
    [can]
  );

  /**
   * Check permission by string format "resource:action:scope"
   */
  const canByString = useCallback(
    (permissionString: PermissionString): boolean => {
      const perm = parsePermissionString(permissionString);
      if (!perm) return false;
      return can(perm.resource, perm.action, perm.scope);
    },
    [can]
  );

  /**
   * Get user's maximum scope for a resource/action
   */
  const getScope = useCallback(
    (resource: Resource, action: Action): Scope | null => {
      if (!userRole) return null;
      return getMaxScope(userRole, resource, action);
    },
    [userRole]
  );

  /**
   * Check if user is admin
   */
  const isAdmin = useMemo((): boolean => {
    return userRole === UserRole.ADMIN;
  }, [userRole]);

  /**
   * Check if user is manager or admin
   */
  const isManager = useMemo((): boolean => {
    return userRole === UserRole.ADMIN || userRole === UserRole.MANAGER;
  }, [userRole]);

  /**
   * Check if user is worker
   */
  const isWorker = useMemo((): boolean => {
    return userRole === UserRole.WORKER;
  }, [userRole]);

  /**
   * Check if user owns a resource
   */
  const owns = useCallback(
    (resourceOwnerId: string): boolean => {
      return user?.uid === resourceOwnerId;
    },
    [user]
  );

  /**
   * Check if user is in same company as resource
   */
  const inSameCompany = useCallback(
    (resourceCompanyId: string): boolean => {
      return userData?.companyId === resourceCompanyId;
    },
    [userData?.companyId]
  );

  return {
    // Current user info
    userRole,
    user,
    userData,

    // All permissions for current role
    userPermissions,

    // Permission checking
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
  };
}

/**
 * useResourcePermissions Hook
 *
 * Specialized hook for checking permissions on a specific resource type
 */
export function useResourcePermissions(resource: Resource) {
  const permissions = usePermissions();

  const canCreate = useMemo(() => permissions.can(resource, Action.CREATE), [permissions, resource]);
  const canRead = useMemo(() => permissions.can(resource, Action.READ), [permissions, resource]);
  const canUpdate = useMemo(() => permissions.can(resource, Action.UPDATE), [permissions, resource]);
  const canDelete = useMemo(() => permissions.can(resource, Action.DELETE), [permissions, resource]);
  const canList = useMemo(() => permissions.can(resource, Action.LIST), [permissions, resource]);
  const canExport = useMemo(() => permissions.can(resource, Action.EXPORT), [permissions, resource]);

  return {
    ...permissions,
    resource,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canList,
    canExport,
  };
}

/**
 * Non-hook permission checker (for use outside components)
 */
export class PermissionChecker {
  private role: UserRole;
  private userId: string;
  private companyId: string;

  constructor(role: UserRole, userId: string, companyId: string) {
    this.role = role;
    this.userId = userId;
    this.companyId = companyId;
  }

  can(resource: Resource, action: Action, scope: Scope = Scope.OWN): boolean {
    return roleHasPermission(this.role, resource, action, scope);
  }

  cannot(resource: Resource, action: Action, scope: Scope = Scope.OWN): boolean {
    return !this.can(resource, action, scope);
  }

  canAccess(resource: Resource, action: Action, ownership?: ResourceOwnership): PermissionCheckResult {
    const maxScope = getMaxScope(this.role, resource, action);

    if (!maxScope) {
      return { allowed: false, reason: 'No permission for this action' };
    }

    if (maxScope === Scope.ALL) {
      return { allowed: true, scope: Scope.ALL };
    }

    if (!ownership) {
      return { allowed: maxScope !== null, scope: maxScope || undefined };
    }

    if (maxScope === Scope.TEAM) {
      const isTeamMember = ownership.teamMembers?.includes(this.userId);
      const isOwner = ownership.ownerId === this.userId;

      if (isOwner || isTeamMember) {
        return { allowed: true, scope: Scope.TEAM };
      }

      return { allowed: false, reason: 'Not in team or not owner' };
    }

    if (maxScope === Scope.OWN) {
      if (ownership.ownerId === this.userId) {
        return { allowed: true, scope: Scope.OWN };
      }

      return { allowed: false, reason: 'Not the owner' };
    }

    return { allowed: false, reason: 'Unknown scope' };
  }

  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  isManager(): boolean {
    return this.role === UserRole.ADMIN || this.role === UserRole.MANAGER;
  }

  isWorker(): boolean {
    return this.role === UserRole.WORKER;
  }

  owns(resourceOwnerId: string): boolean {
    return this.userId === resourceOwnerId;
  }

  inSameCompany(resourceCompanyId: string): boolean {
    return this.companyId === resourceCompanyId;
  }
}

/**
 * Helper to create permission checker from user data
 */
export function createPermissionChecker(
  role: string,
  userId: string,
  companyId: string
): PermissionChecker {
  return new PermissionChecker(role as UserRole, userId, companyId);
}

/**
 * Permission check for simple resource access (convenience function)
 */
export function checkPermission(
  role: UserRole,
  resource: Resource,
  action: Action,
  scope: Scope = Scope.ALL
): boolean {
  return roleHasPermission(role, resource, action, scope);
}

/**
 * Batch permission check
 */
export function checkPermissions(
  role: UserRole,
  checks: Array<{ resource: Resource; action: Action; scope?: Scope }>
): boolean[] {
  return checks.map((check) =>
    roleHasPermission(role, check.resource, check.action, check.scope || Scope.OWN)
  );
}

/**
 * Permission matrix for UI display
 */
export interface PermissionMatrixEntry {
  resource: Resource;
  actions: {
    action: Action;
    allowed: boolean;
    scope?: Scope;
  }[];
}

/**
 * Generate permission matrix for a role (useful for admin UI)
 */
export function generatePermissionMatrix(role: UserRole): PermissionMatrixEntry[] {
  const matrix: PermissionMatrixEntry[] = [];

  Object.values(Resource).forEach((resource) => {
    const entry: PermissionMatrixEntry = {
      resource,
      actions: [],
    };

    Object.values(Action).forEach((action) => {
      const scope = getMaxScope(role, resource, action);
      entry.actions.push({
        action,
        allowed: scope !== null,
        scope: scope || undefined,
      });
    });

    matrix.push(entry);
  });

  return matrix;
}

/**
 * Compare two roles' permissions
 */
export function compareRolePermissions(
  role1: UserRole,
  role2: UserRole
): {
  role1Only: Permission[];
  role2Only: Permission[];
  shared: Permission[];
} {
  const perms1 = getPermissionsForRole(role1);
  const perms2 = getPermissionsForRole(role2);

  const role1Only: Permission[] = [];
  const role2Only: Permission[] = [];
  const shared: Permission[] = [];

  perms1.forEach((perm1) => {
    const hasMatch = perms2.some(
      (perm2) =>
        perm2.resource === perm1.resource &&
        perm2.action === perm1.action &&
        perm2.scope === perm1.scope
    );

    if (hasMatch) {
      shared.push(perm1);
    } else {
      role1Only.push(perm1);
    }
  });

  perms2.forEach((perm2) => {
    const hasMatch = perms1.some(
      (perm1) =>
        perm1.resource === perm2.resource &&
        perm1.action === perm2.action &&
        perm1.scope === perm2.scope
    );

    if (!hasMatch) {
      role2Only.push(perm2);
    }
  });

  return { role1Only, role2Only, shared };
}

/**
 * Utility: Require permission (throw error if not allowed)
 */
export function requirePermission(
  role: UserRole,
  resource: Resource,
  action: Action,
  scope: Scope = Scope.ALL
): void {
  if (!roleHasPermission(role, resource, action, scope)) {
    throw new Error(
      `Permission denied: ${role} cannot ${action} ${resource} with scope ${scope}`
    );
  }
}

/**
 * Simple permission check (non-hook, backward compatibility)
 */
export function canPerformAction(
  role: UserRole,
  resource: Resource,
  action: Action
): boolean {
  return canPerformActionUtil(role, resource, action);
}

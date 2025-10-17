/**
 * useGuard Hook
 *
 * Programmatic permission checks with navigation
 */

import { Resource, Action, Scope } from '../lib/permissions/permissions';
import { usePermissions } from '../lib/permissions/permission-checker';

/**
 * useGuard Hook - Programmatic permission checks with navigation
 */
export function useGuard() {
  const permissions = usePermissions();

  const guardRoute = (
    resource: Resource,
    action: Action,
    scope: Scope = Scope.ALL,
    redirectPath = '/unauthorized'
  ): boolean => {
    const allowed = permissions.can(resource, action, scope);

    if (!allowed) {
      // In a real app, use react-router or your routing solution
      window.location.href = redirectPath;
      return false;
    }

    return true;
  };

  const guardAction = (
    resource: Resource,
    action: Action,
    scope: Scope = Scope.ALL,
    onDenied?: () => void
  ): boolean => {
    const allowed = permissions.can(resource, action, scope);

    if (!allowed && onDenied) {
      onDenied();
      return false;
    }

    return allowed;
  };

  return {
    guardRoute,
    guardAction,
    ...permissions,
  };
}

/**
 * PermissionGate Component
 *
 * Conditional rendering based on permissions
 * Only renders children if user has required permission
 */

import { ReactNode } from 'react';
import { Resource, Action, Scope, PermissionString } from '../../lib/permissions/permissions';
import {
  usePermissions,
  ResourceOwnership,
} from '../../lib/permissions/permission-checker';

/**
 * Permission Gate Props
 */
interface PermissionGateProps {
  children: ReactNode;

  // Permission check (choose one method)
  resource?: Resource;
  action?: Action;
  scope?: Scope;
  permission?: PermissionString; // Alternative: "resource:action:scope"

  // Resource ownership (for OWN/TEAM scope checks)
  ownership?: ResourceOwnership;

  // Multiple permissions (choose one)
  requireAll?: Array<{ resource: Resource; action: Action; scope?: Scope }>; // AND logic
  requireAny?: Array<{ resource: Resource; action: Action; scope?: Scope }>; // OR logic

  // Role-based rendering
  requireAdmin?: boolean;
  requireManager?: boolean;

  // Fallback content
  fallback?: ReactNode;

  // Loading state
  loading?: ReactNode;

  // Invert logic (render when NOT allowed)
  invert?: boolean;
}

/**
 * PermissionGate Component
 *
 * @example
 * // Basic usage
 * <PermissionGate resource={Resource.JOBS} action={Action.CREATE}>
 *   <Button>Create Job</Button>
 * </PermissionGate>
 *
 * @example
 * // With scope
 * <PermissionGate resource={Resource.JOBS} action={Action.DELETE} scope={Scope.ALL}>
 *   <Button>Delete Job</Button>
 * </PermissionGate>
 *
 * @example
 * // Using permission string
 * <PermissionGate permission="jobs:create:all">
 *   <Button>Create Job</Button>
 * </PermissionGate>
 *
 * @example
 * // Admin only
 * <PermissionGate requireAdmin>
 *   <AdminPanel />
 * </PermissionGate>
 *
 * @example
 * // Require all permissions (AND logic)
 * <PermissionGate requireAll={[
 *   { resource: Resource.JOBS, action: Action.CREATE },
 *   { resource: Resource.INVOICES, action: Action.CREATE }
 * ]}>
 *   <Button>Create Job & Invoice</Button>
 * </PermissionGate>
 *
 * @example
 * // Require any permission (OR logic)
 * <PermissionGate requireAny={[
 *   { resource: Resource.JOBS, action: Action.UPDATE, scope: Scope.ALL },
 *   { resource: Resource.JOBS, action: Action.UPDATE, scope: Scope.OWN }
 * ]}>
 *   <Button>Edit Job</Button>
 * </PermissionGate>
 *
 * @example
 * // With fallback
 * <PermissionGate
 *   resource={Resource.REPORTS}
 *   action={Action.READ}
 *   fallback={<div>You don't have access to reports</div>}
 * >
 *   <ReportViewer />
 * </PermissionGate>
 *
 * @example
 * // With resource ownership
 * <PermissionGate
 *   resource={Resource.JOBS}
 *   action={Action.UPDATE}
 *   ownership={{ ownerId: job.createdBy, teamMembers: job.workers }}
 * >
 *   <Button>Edit Job</Button>
 * </PermissionGate>
 *
 * @example
 * // Inverted (show when NOT allowed)
 * <PermissionGate resource={Resource.ADMIN} action={Action.READ} invert>
 *   <Alert>You don't have admin access</Alert>
 * </PermissionGate>
 */
export function PermissionGate({
  children,
  resource,
  action,
  scope = Scope.OWN,
  permission,
  ownership,
  requireAll,
  requireAny,
  requireAdmin,
  requireManager,
  fallback = null,
  loading = null,
  invert = false,
}: PermissionGateProps): JSX.Element | null {
  const permissions = usePermissions();

  // Show loading state if user data hasn't loaded yet
  if (!permissions.userRole) {
    return loading as JSX.Element | null;
  }

  let isAllowed = false;

  // Check admin requirement
  if (requireAdmin !== undefined) {
    isAllowed = permissions.isAdmin;
  }
  // Check manager requirement
  else if (requireManager !== undefined) {
    isAllowed = permissions.isManager;
  }
  // Check requireAll (AND logic)
  else if (requireAll) {
    isAllowed = permissions.canAll(requireAll);
  }
  // Check requireAny (OR logic)
  else if (requireAny) {
    isAllowed = permissions.canAny(requireAny);
  }
  // Check permission string
  else if (permission) {
    isAllowed = permissions.canByString(permission);
  }
  // Check resource/action/scope
  else if (resource && action) {
    if (ownership) {
      // Check with ownership
      const result = permissions.canAccess(resource, action, ownership);
      isAllowed = result.allowed;
    } else {
      // Simple permission check
      isAllowed = permissions.can(resource, action, scope);
    }
  }
  // No valid check provided - default to deny
  else {
    console.warn('[PermissionGate] No permission check provided');
    isAllowed = false;
  }

  // Invert logic if requested
  if (invert) {
    isAllowed = !isAllowed;
  }

  // Render children or fallback
  if (isAllowed) {
    return <>{children}</>;
  }

  return fallback as JSX.Element | null;
}

/**
 * RequirePermission - Alias for PermissionGate with error on deny
 */
interface RequirePermissionProps extends Omit<PermissionGateProps, 'fallback'> {
  errorMessage?: string;
}

export function RequirePermission({
  errorMessage = 'You do not have permission to access this.',
  ...props
}: RequirePermissionProps): JSX.Element | null {
  return (
    <PermissionGate
      {...props}
      fallback={
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-600">{errorMessage}</p>
          </div>
        </div>
      }
    />
  );
}

/**
 * AdminGate - Shortcut for admin-only content
 */
interface AdminGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminGate({ children, fallback }: AdminGateProps): JSX.Element | null {
  return (
    <PermissionGate requireAdmin fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/**
 * ManagerGate - Shortcut for manager-only content (includes admins)
 */
interface ManagerGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ManagerGate({ children, fallback }: ManagerGateProps): JSX.Element | null {
  return (
    <PermissionGate requireManager fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/**
 * ConditionalRender - Render different content based on permission
 */
interface ConditionalRenderProps {
  resource: Resource;
  action: Action;
  scope?: Scope;
  ownership?: ResourceOwnership;

  // Render functions
  allowed: () => ReactNode;
  denied: () => ReactNode;
}

export function ConditionalRender({
  resource,
  action,
  scope = Scope.OWN,
  ownership,
  allowed,
  denied,
}: ConditionalRenderProps): JSX.Element {
  const permissions = usePermissions();

  let isAllowed = false;

  if (ownership) {
    const result = permissions.canAccess(resource, action, ownership);
    isAllowed = result.allowed;
  } else {
    isAllowed = permissions.can(resource, action, scope);
  }

  return <>{isAllowed ? allowed() : denied()}</>;
}

/**
 * PermissionButton - Button that's disabled when user lacks permission
 */
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  resource: Resource;
  action: Action;
  scope?: Scope;
  ownership?: ResourceOwnership;
  disabledTooltip?: string;
}

export function PermissionButton({
  resource,
  action,
  scope = Scope.OWN,
  ownership,
  disabledTooltip = 'You do not have permission for this action',
  children,
  disabled,
  ...buttonProps
}: PermissionButtonProps): JSX.Element {
  const permissions = usePermissions();

  let isAllowed = false;

  if (ownership) {
    const result = permissions.canAccess(resource, action, ownership);
    isAllowed = result.allowed;
  } else {
    isAllowed = permissions.can(resource, action, scope);
  }

  const isDisabled = disabled || !isAllowed;

  return (
    <button
      {...buttonProps}
      disabled={isDisabled}
      title={!isAllowed ? disabledTooltip : buttonProps.title}
    >
      {children}
    </button>
  );
}

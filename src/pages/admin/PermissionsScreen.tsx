/**
 * Permissions Screen
 *
 * Admin-only screen to view and understand the permission system
 * Shows permission matrix for all roles
 */

import { useState, useMemo } from 'react';
import {
  Resource,
  Action,
  Scope,
  UserRole,
  ROLE_PERMISSIONS_MAP,
  getPermissionsForRole,
  exportPermissionMatrix,
} from '../../lib/permissions/permissions';
import {
  generatePermissionMatrix,
  compareRolePermissions,
} from '../../lib/permissions/permission-checker';
import { RequirePermission } from '../../components/guards/PermissionGate';

/**
 * Badge component for scope display
 */
function ScopeBadge({ scope }: { scope: Scope }) {
  const colors = {
    [Scope.ALL]: 'bg-green-100 text-green-800',
    [Scope.TEAM]: 'bg-blue-100 text-blue-800',
    [Scope.OWN]: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded ${colors[scope]}`}>
      {scope.toUpperCase()}
    </span>
  );
}

/**
 * Permission Matrix View
 */
function PermissionMatrixView({ role }: { role: UserRole }) {
  const matrix = useMemo(() => generatePermissionMatrix(role), [role]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Resource
            </th>
            {Object.values(Action).map((action) => (
              <th
                key={action}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {action}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {matrix.map((entry) => (
            <tr key={entry.resource}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {entry.resource}
              </td>
              {Object.values(Action).map((action) => {
                const actionEntry = entry.actions.find((a) => a.action === action);
                return (
                  <td key={action} className="px-6 py-4 whitespace-nowrap text-sm">
                    {actionEntry?.allowed && actionEntry.scope ? (
                      <ScopeBadge scope={actionEntry.scope} />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Role Comparison View
 */
function RoleComparisonView() {
  const [role1, setRole1] = useState<UserRole>(UserRole.ADMIN);
  const [role2, setRole2] = useState<UserRole>(UserRole.MANAGER);

  const comparison = useMemo(
    () => compareRolePermissions(role1, role2),
    [role1, role2]
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role 1
          </label>
          <select
            value={role1}
            onChange={(e) => setRole1(e.target.value as UserRole)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.values(UserRole).map((role) => (
              <option key={role} value={role}>
                {role.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role 2
          </label>
          <select
            value={role2}
            onChange={(e) => setRole2(e.target.value as UserRole)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.values(UserRole).map((role) => (
              <option key={role} value={role}>
                {role.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Role 1 Only */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-medium mb-3">
            {role1.toUpperCase()} Only ({comparison.role1Only.length})
          </h3>
          <div className="space-y-2">
            {comparison.role1Only.map((perm, index) => (
              <div key={index} className="text-sm">
                <span className="font-medium">{perm.resource}</span>
                <span className="text-gray-500"> : {perm.action}</span>
                <span className="ml-2">
                  <ScopeBadge scope={perm.scope} />
                </span>
              </div>
            ))}
            {comparison.role1Only.length === 0 && (
              <p className="text-gray-400 text-sm">No unique permissions</p>
            )}
          </div>
        </div>

        {/* Shared */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-medium mb-3">
            Shared ({comparison.shared.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {comparison.shared.map((perm, index) => (
              <div key={index} className="text-sm">
                <span className="font-medium">{perm.resource}</span>
                <span className="text-gray-500"> : {perm.action}</span>
                <span className="ml-2">
                  <ScopeBadge scope={perm.scope} />
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Role 2 Only */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-medium mb-3">
            {role2.toUpperCase()} Only ({comparison.role2Only.length})
          </h3>
          <div className="space-y-2">
            {comparison.role2Only.map((perm, index) => (
              <div key={index} className="text-sm">
                <span className="font-medium">{perm.resource}</span>
                <span className="text-gray-500"> : {perm.action}</span>
                <span className="ml-2">
                  <ScopeBadge scope={perm.scope} />
                </span>
              </div>
            ))}
            {comparison.role2Only.length === 0 && (
              <p className="text-gray-400 text-sm">No unique permissions</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Role Details View
 */
function RoleDetailsView({ role }: { role: UserRole }) {
  const rolePermissions = ROLE_PERMISSIONS_MAP[role];
  const permissions = getPermissionsForRole(role);

  // Group permissions by resource
  const groupedPermissions = useMemo(() => {
    const grouped: Record<string, typeof permissions> = {};

    permissions.forEach((perm) => {
      if (!grouped[perm.resource]) {
        grouped[perm.resource] = [];
      }
      grouped[perm.resource].push(perm);
    });

    return grouped;
  }, [permissions]);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900 mb-2">
          {role.toUpperCase()}
        </h3>
        <p className="text-blue-700">{rolePermissions.description}</p>
        <p className="text-sm text-blue-600 mt-2">
          Total Permissions: {permissions.length}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(groupedPermissions).map(([resource, perms]) => (
          <div key={resource} className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">{resource}</h4>
            <div className="space-y-2">
              {perms.map((perm, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{perm.action}</span>
                  <ScopeBadge scope={perm.scope} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Export Permission Data
 */
function ExportSection() {
  const handleExportJSON = () => {
    const matrix = exportPermissionMatrix();
    const json = JSON.stringify(matrix, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `permissions-matrix-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const matrix = exportPermissionMatrix();

    // Build CSV
    const headers = ['Role', 'Resource', 'Permissions'];
    const rows: string[][] = [];

    Object.entries(matrix).forEach(([role, resources]) => {
      Object.entries(resources).forEach(([resource, permissions]) => {
        rows.push([role, resource, permissions.join(', ')]);
      });
    });

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `permissions-matrix-${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-50 border rounded-lg p-4">
      <h3 className="text-lg font-medium mb-4">Export Permission Data</h3>
      <div className="flex gap-3">
        <button
          onClick={handleExportJSON}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Export as JSON
        </button>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          Export as CSV
        </button>
      </div>
    </div>
  );
}

/**
 * Main Permissions Screen Component
 */
export default function PermissionsScreen() {
  const [activeTab, setActiveTab] = useState<'matrix' | 'details' | 'comparison'>(
    'matrix'
  );
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.ADMIN);

  return (
    <RequirePermission
      requireAdmin
      errorMessage="Only administrators can view the permissions system"
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Permissions Management</h1>
          <p className="text-gray-600">
            View and understand the role-based access control (RBAC) system
          </p>
        </div>

        {/* Export Section */}
        <div className="mb-6">
          <ExportSection />
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'matrix'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Permission Matrix
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Role Details
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'comparison'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Compare Roles
            </button>
          </nav>
        </div>

        {/* Role Selector (for matrix and details tabs) */}
        {(activeTab === 'matrix' || activeTab === 'details') && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              className="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.values(UserRole).map((role) => (
                <option key={role} value={role}>
                  {role.toUpperCase()} - {ROLE_PERMISSIONS_MAP[role].description}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-white shadow rounded-lg p-6">
          {activeTab === 'matrix' && <PermissionMatrixView role={selectedRole} />}
          {activeTab === 'details' && <RoleDetailsView role={selectedRole} />}
          {activeTab === 'comparison' && <RoleComparisonView />}
        </div>

        {/* Legend */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Permission Scopes</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center">
              <ScopeBadge scope={Scope.ALL} />
              <span className="ml-3 text-gray-600">
                Can access all resources in the company
              </span>
            </div>
            <div className="flex items-center">
              <ScopeBadge scope={Scope.TEAM} />
              <span className="ml-3 text-gray-600">
                Can access resources assigned to them or their team
              </span>
            </div>
            <div className="flex items-center">
              <ScopeBadge scope={Scope.OWN} />
              <span className="ml-3 text-gray-600">
                Can only access their own resources
              </span>
            </div>
          </div>
        </div>

        {/* Resources & Actions Reference */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Available Resources
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              {Object.values(Resource).map((resource) => (
                <div key={resource} className="px-2 py-1 bg-white rounded">
                  {resource}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Available Actions
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              {Object.values(Action).map((action) => (
                <div key={action} className="px-2 py-1 bg-white rounded">
                  {action}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </RequirePermission>
  );
}

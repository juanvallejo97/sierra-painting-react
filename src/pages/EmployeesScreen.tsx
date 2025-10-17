import { useState } from 'react';
import { Plus, Mail, Phone, UserPlus, Pencil, Trash2 } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { DataTable, type Column } from '../components/ui/data-table';
import { EmptyState } from '../components/ui/empty-state';
import { SearchBar } from '../components/ui/search-bar';
import { Skeleton } from '../components/ui/skeleton';
import {
  useEmployees,
  useDeleteEmployee,
  type Employee,
} from '../hooks/useEmployees';
import { Alert, AlertDescription } from '../components/ui/alert';
import { InviteEmployeeDialog } from '../components/dialogs/InviteEmployeeDialog';
import { EditEmployeeDialog } from '../components/dialogs/EditEmployeeDialog';
import { ConfirmDeleteDialog } from '../components/dialogs/ConfirmDeleteDialog';

export function EmployeesScreen() {
  const [search, setSearch] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const { data: employees = [], isLoading, error } = useEmployees();
  const deleteEmployee = useDeleteEmployee();

  // Filter employees by search
  const filteredEmployees = employees.filter((employee) => {
    const searchLower = search.toLowerCase();
    return (
      employee.name.toLowerCase().includes(searchLower) ||
      employee.email.toLowerCase().includes(searchLower) ||
      employee.phone.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'invited':
        return 'secondary';
      case 'inactive':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getRoleBadge = (role: string) => {
    const roleLabels: Record<string, string> = {
      admin: 'Admin',
      manager: 'Manager',
      worker: 'Worker',
      staff: 'Staff',
      crew: 'Crew',
    };
    return roleLabels[role] || role;
  };

  const columns: Column<Employee>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (employee) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-full bg-primary/10 text-primary font-semibold">
            {employee.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium">{employee.name}</p>
            <p className="text-sm text-muted-foreground">{employee.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contact',
      render: (employee) => (
        <div className="flex flex-col gap-1">
          <a
            href={`tel:${employee.phone}`}
            className="flex items-center gap-2 text-sm hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="size-3" />
            {employee.phone || 'N/A'}
          </a>
          <a
            href={`mailto:${employee.email}`}
            className="flex items-center gap-2 text-sm hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            <Mail className="size-3" />
            {employee.email}
          </a>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (employee) => (
        <Badge variant="outline">{getRoleBadge(employee.role)}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (employee) => (
        <Badge variant={getStatusColor(employee.status)}>
          {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Added',
      sortable: true,
      render: (employee) => (
        <span className="text-sm text-muted-foreground">
          {employee.createdAt.toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (employee) => (
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditTarget(employee)}
          >
            <Pencil className="size-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteTarget(employee)}
          >
            <Trash2 className="size-4 mr-1" />
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1>Employees</h1>
            <p className="text-muted-foreground">Manage your team members</p>
          </div>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <Plus className="size-4 mr-2" />
            Invite Employee
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load employees. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Search Bar */}
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email, or phone..."
          className="max-w-md"
        />

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          /* Data Table */
          <DataTable
            data={filteredEmployees}
            columns={columns}
            keyExtractor={(employee) => employee.id}
            emptyState={
              <EmptyState
                icon={UserPlus}
                title="No employees found"
                description={
                  search
                    ? 'Try adjusting your search to find what you\'re looking for.'
                    : 'Get started by inviting your first team member.'
                }
                action={
                  !search
                    ? {
                        label: 'Invite Employee',
                        onClick: () => setInviteDialogOpen(true),
                      }
                    : undefined
                }
              />
            }
          />
        )}

        {/* Stats Footer */}
        {!isLoading && employees.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>
              Showing {filteredEmployees.length} of {employees.length} employees
            </p>
            <div className="flex gap-4">
              <span>
                Active: {employees.filter((e) => e.status === 'active').length}
              </span>
              <span>
                Invited: {employees.filter((e) => e.status === 'invited').length}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Invite Employee Dialog */}
      <InviteEmployeeDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />

      {/* Edit Employee Dialog */}
      <EditEmployeeDialog
        employee={editTarget}
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => deleteEmployee.mutateAsync(deleteTarget!.id)}
        title="Remove Employee"
        description={`Are you sure you want to remove ${deleteTarget?.name} from your team? This will revoke their access to the system.`}
        isLoading={deleteEmployee.isPending}
      />
    </AppLayout>
  );
}

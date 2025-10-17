import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserCog } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useUpdateEmployee, type Employee } from '../../hooks/useEmployees';
import {
  updateEmployeeSchema,
  type UpdateEmployeeFormData,
} from '../../schemas/employee.schema';

interface EditEmployeeDialogProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEmployeeDialog({
  employee,
  open,
  onOpenChange,
}: EditEmployeeDialogProps) {
  const [role, setRole] = useState<string>('worker');
  const [status, setStatus] = useState<string>('active');
  const updateEmployee = useUpdateEmployee();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<UpdateEmployeeFormData>({
    resolver: zodResolver(updateEmployeeSchema),
  });

  // Reset form when employee changes
  useEffect(() => {
    if (employee) {
      setValue('name', employee.name);
      setValue('phone', employee.phone);
      setRole(employee.role);
      setStatus(employee.status);
    }
  }, [employee, setValue]);

  const onSubmit = async (data: UpdateEmployeeFormData) => {
    if (!employee) return;

    try {
      await updateEmployee.mutateAsync({
        id: employee.id,
        data: {
          ...data,
          role: role as any,
          status: status as any,
        },
      });

      reset();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to update employee:', err);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="size-5" />
            Edit Employee
          </DialogTitle>
          <DialogDescription>
            Update employee details. Email cannot be changed as it's used for authentication.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Error Alert */}
          {updateEmployee.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to update employee. Please try again.
              </AlertDescription>
            </Alert>
          )}

          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name" required>
              Full Name
            </Label>
            <Input
              id="name"
              placeholder="John Doe"
              error={!!errors.name}
              disabled={updateEmployee.isPending}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Email Field (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={employee.email}
              disabled
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed. It's used for authentication.
            </p>
          </div>

          {/* Phone Field */}
          <div className="space-y-2">
            <Label htmlFor="phone" required>
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              error={!!errors.phone}
              disabled={updateEmployee.isPending}
              {...register('phone')}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          {/* Role Field */}
          <div className="space-y-2">
            <Label htmlFor="role" required>
              Role
            </Label>
            <Select
              value={role}
              onValueChange={setRole}
              disabled={updateEmployee.isPending}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="worker">Worker</SelectItem>
                <SelectItem value="crew">Crew</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Determines access level and permissions
            </p>
          </div>

          {/* Status Field */}
          <div className="space-y-2">
            <Label htmlFor="status" required>
              Status
            </Label>
            <Select
              value={status}
              onValueChange={setStatus}
              disabled={updateEmployee.isPending}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Active users can log in. Inactive users are locked out.
            </p>
          </div>

          {/* Footer */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={updateEmployee.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateEmployee.isPending}
              loading={updateEmployee.isPending}
              loadingText="Updating..."
            >
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

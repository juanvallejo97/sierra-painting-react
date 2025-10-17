import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
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
import { useCreateEmployee } from '../../hooks/useEmployees';
import {
  createEmployeeSchema,
  type CreateEmployeeFormData,
} from '../../schemas/employee.schema';

interface InviteEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteEmployeeDialog({
  open,
  onOpenChange,
}: InviteEmployeeDialogProps) {
  const [role, setRole] = useState<string>('worker');
  const createEmployee = useCreateEmployee();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateEmployeeFormData>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      role: 'worker',
    },
  });

  const onSubmit = async (data: CreateEmployeeFormData) => {
    try {
      await createEmployee.mutateAsync({
        ...data,
        role: role as any,
      });

      reset();
      setRole('worker');
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to invite employee:', err);
    }
  };

  const handleClose = () => {
    reset();
    setRole('worker');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5" />
            Invite Employee
          </DialogTitle>
          <DialogDescription>
            Send an invitation to a new team member. They'll receive an email to set up
            their account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Error Alert */}
          {createEmployee.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to invite employee. Please try again.
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
              disabled={createEmployee.isPending}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" required>
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              error={!!errors.email}
              disabled={createEmployee.isPending}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
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
              disabled={createEmployee.isPending}
              {...register('phone')}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Format: (555) 123-4567 or 555-123-4567
            </p>
          </div>

          {/* Role Field */}
          <div className="space-y-2">
            <Label htmlFor="role" required>
              Role
            </Label>
            <Select
              value={role}
              onValueChange={setRole}
              disabled={createEmployee.isPending}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="worker">Worker</SelectItem>
                <SelectItem value="crew">Crew</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Determines access level and permissions
            </p>
          </div>

          {/* Footer */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createEmployee.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createEmployee.isPending}
              loading={createEmployee.isPending}
              loadingText="Sending invitation..."
            >
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase } from 'lucide-react';
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
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { useCreateJob } from '../../hooks/useJobs';
import { useEmployees } from '../../hooks/useEmployees';
import {
  createJobSchema,
  type CreateJobFormData,
} from '../../schemas/job.schema';

interface CreateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateJobDialog({
  open,
  onOpenChange,
}: CreateJobDialogProps) {
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const createJob = useCreateJob();
  const { data: employees = [] } = useEmployees();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<any>({
    resolver: zodResolver(createJobSchema) as any,
    defaultValues: {
      workers: [],
    },
  });

  const startDate = watch('startDate');

  const onSubmit = async (data: CreateJobFormData) => {
    try {
      await createJob.mutateAsync({
        ...data,
        workers: selectedWorkers,
      });

      reset();
      setSelectedWorkers([]);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to create job:', err);
    }
  };

  const handleClose = () => {
    reset();
    setSelectedWorkers([]);
    onOpenChange(false);
  };

  const handleWorkerToggle = (workerId: string) => {
    setSelectedWorkers((prev) =>
      prev.includes(workerId)
        ? prev.filter((id) => id !== workerId)
        : [...prev, workerId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="size-5" />
            Create New Job
          </DialogTitle>
          <DialogDescription>
            Add a new painting job to your schedule. Assign workers and set dates.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
          {/* Error Alert */}
          {createJob.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to create job. Please try again.
              </AlertDescription>
            </Alert>
          )}

          {/* Job Name */}
          <div className="space-y-2">
            <Label htmlFor="name" required>
              Job Name
            </Label>
            <Input
              id="name"
              placeholder="Exterior house painting - 123 Main St"
              error={!!errors.name}
              disabled={createJob.isPending}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Client */}
          <div className="space-y-2">
            <Label htmlFor="client" required>
              Client / Customer
            </Label>
            <Input
              id="client"
              placeholder="John Smith"
              error={!!errors.client}
              disabled={createJob.isPending}
              {...register('client')}
            />
            {errors.client && (
              <p className="text-sm text-destructive">{errors.client.message}</p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" required>
              Address
            </Label>
            <Input
              id="address"
              placeholder="123 Main Street, City, State 12345"
              error={!!errors.address}
              disabled={createJob.isPending}
              {...register('address')}
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address.message}</p>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" required>
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                error={!!errors.startDate}
                disabled={createJob.isPending}
                {...register('startDate')}
              />
              {errors.startDate && (
                <p className="text-sm text-destructive">
                  {errors.startDate.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">
                End Date <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="endDate"
                type="date"
                min={startDate}
                error={!!errors.endDate}
                disabled={createJob.isPending}
                {...register('endDate')}
              />
              {errors.endDate && (
                <p className="text-sm text-destructive">
                  {errors.endDate.message}
                </p>
              )}
            </div>
          </div>

          {/* Worker Selection */}
          <div className="space-y-2">
            <Label>
              Assign Workers <span className="text-muted-foreground">(optional)</span>
              {selectedWorkers.length > 0 && (
                <span className="text-muted-foreground ml-2">
                  ({selectedWorkers.length} selected)
                </span>
              )}
            </Label>
            <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-3">
              {employees.filter(e => e.status === 'active').length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No active workers available. Invite employees first.
                </p>
              ) : (
                employees
                  .filter(e => e.status === 'active')
                  .map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center space-x-3"
                    >
                      <Checkbox
                        id={`worker-${employee.id}`}
                        checked={selectedWorkers.includes(employee.id)}
                        onCheckedChange={() => handleWorkerToggle(employee.id)}
                        disabled={createJob.isPending}
                      />
                      <label
                        htmlFor={`worker-${employee.id}`}
                        className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        <div>
                          <p>{employee.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {employee.email}
                          </p>
                        </div>
                      </label>
                    </div>
                  ))
              )}
            </div>
            {selectedWorkers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Workers can be assigned later if needed
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Scope of work, materials needed, special requirements..."
              rows={3}
              disabled={createJob.isPending}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Internal Notes <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Private notes for team members..."
              rows={2}
              disabled={createJob.isPending}
              {...register('notes')}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>

          {/* Footer */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createJob.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createJob.isPending}
              loading={createJob.isPending}
              loadingText="Creating job..."
            >
              Create Job
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

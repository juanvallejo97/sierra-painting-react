import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useUpdateJob, type Job, type JobStatus } from '../../hooks/useJobs';
import { useEmployees } from '../../hooks/useEmployees';
import {
  updateJobSchema,
  type UpdateJobFormData,
} from '../../schemas/job.schema';

interface EditJobDialogProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditJobDialog({
  job,
  open,
  onOpenChange,
}: EditJobDialogProps) {
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [status, setStatus] = useState<JobStatus>('scheduled');
  const updateJob = useUpdateJob();
  const { data: employees = [] } = useEmployees();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<UpdateJobFormData>({
    resolver: zodResolver(updateJobSchema),
  });

  const startDate = watch('startDate');

  // Reset form when job changes
  useEffect(() => {
    if (job) {
      setValue('name', job.name);
      setValue('address', job.address);
      setValue('startDate', job.startDate);
      setValue('endDate', job.endDate || '');
      setValue('description', job.description || '');
      setValue('notes', job.notes || '');
      setSelectedWorkers(job.workers || []);
      setStatus(job.status);
    }
  }, [job, setValue]);

  const onSubmit = async (data: UpdateJobFormData) => {
    if (!job) return;

    try {
      await updateJob.mutateAsync({
        id: job.id,
        data: {
          ...data,
          status,
          workers: selectedWorkers,
        },
      });

      reset();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to update job:', err);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleWorkerToggle = (workerId: string) => {
    setSelectedWorkers((prev) =>
      prev.includes(workerId)
        ? prev.filter((id) => id !== workerId)
        : [...prev, workerId]
    );
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="size-5" />
            Edit Job
          </DialogTitle>
          <DialogDescription>
            Update job details, worker assignments, and status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Error Alert */}
          {updateJob.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to update job. Please try again.
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
              disabled={updateJob.isPending}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
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
              disabled={updateJob.isPending}
              {...register('address')}
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address.message}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status" required>
              Status
            </Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as JobStatus)}
              disabled={updateJob.isPending}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
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
                disabled={updateJob.isPending}
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
                disabled={updateJob.isPending}
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
            <Label required>
              Assign Workers
              {selectedWorkers.length > 0 && (
                <span className="text-muted-foreground ml-2">
                  ({selectedWorkers.length} selected)
                </span>
              )}
            </Label>
            <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-3">
              {employees.filter(e => e.status === 'active').length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No active workers available.
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
                        disabled={updateJob.isPending}
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
              <p className="text-sm text-destructive">
                At least one worker must be assigned
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
              disabled={updateJob.isPending}
              {...register('description')}
            />
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
              disabled={updateJob.isPending}
              {...register('notes')}
            />
          </div>

          {/* Footer */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={updateJob.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateJob.isPending || selectedWorkers.length === 0}
              loading={updateJob.isPending}
              loadingText="Updating job..."
            >
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

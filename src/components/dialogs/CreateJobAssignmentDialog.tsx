/**
 * Create Job Assignment Dialog
 *
 * Dialog for assigning employees to jobs with conflict detection
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';
import { Briefcase, User, Clock, AlertTriangle } from 'lucide-react';
import { useCreateJobAssignment } from '../../hooks/useScheduler';
import { useJobs } from '../../hooks/useJobs';
import { useEmployees } from '../../hooks/useEmployees';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CreateJobAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedDate?: Date | null;
  preselectedEmployee?: string | null;
}

export function CreateJobAssignmentDialog({
  open,
  onOpenChange,
  preselectedDate,
  preselectedEmployee,
}: CreateJobAssignmentDialogProps) {
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(preselectedEmployee || '');
  const [assignedDate, setAssignedDate] = useState(
    preselectedDate ? format(preselectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  );
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('15:00');
  const [role, setRole] = useState('');

  // Update date when preselectedDate changes
  useEffect(() => {
    if (preselectedDate) {
      setAssignedDate(format(preselectedDate, 'yyyy-MM-dd'));
    }
  }, [preselectedDate]);

  const { data: jobs } = useJobs();
  const { data: employees } = useEmployees();
  const createAssignment = useCreateJobAssignment();

  // Filter active jobs
  const activeJobs = jobs?.filter((job) => job.status !== 'completed' && job.status !== 'cancelled');

  const selectedJob = activeJobs?.find((j) => j.id === selectedJobId);
  const selectedEmployee = employees?.find((e) => e.id === selectedEmployeeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedJobId) {
      toast.error('Please select a job');
      return;
    }

    if (!selectedEmployeeId) {
      toast.error('Please select an employee');
      return;
    }

    if (!assignedDate) {
      toast.error('Please select a date');
      return;
    }

    try {
      await createAssignment.mutateAsync({
        jobId: selectedJobId,
        jobTitle: selectedJob?.name || '',
        employeeId: selectedEmployeeId,
        employeeName: selectedEmployee?.name || '',
        assignedDate,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        role: role || undefined,
      });

      toast.success('Job assignment created successfully');
      onOpenChange(false);

      // Reset form
      setSelectedJobId('');
      setSelectedEmployeeId(preselectedEmployee || '');
      setAssignedDate(preselectedDate ? format(preselectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setStartTime('07:00');
      setEndTime('15:00');
      setRole('');
    } catch (error: any) {
      console.error('Failed to create assignment:', error);
      if (error.message?.includes('conflicts')) {
        toast.error(error.message);
      } else {
        toast.error('Failed to create assignment');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Create Job Assignment
          </DialogTitle>
          <DialogDescription>
            Assign an employee to a job for a specific date
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Job Selection */}
          <div className="space-y-2">
            <Label htmlFor="job" required>
              Job
            </Label>
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger id="job">
                <SelectValue placeholder="Select a job" />
              </SelectTrigger>
              <SelectContent>
                {activeJobs && activeJobs.length > 0 ? (
                  activeJobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      <div className="flex items-center gap-2">
                        <span>{job.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({job.client})
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-jobs" disabled>
                    No active jobs available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {selectedJob && (
              <div className="text-xs text-muted-foreground">
                Status: <span className="capitalize">{selectedJob.status}</span> •{' '}
                {selectedJob.address}
              </div>
            )}
          </div>

          {/* Employee Selection */}
          <div className="space-y-2">
            <Label htmlFor="employee" required>
              Employee
            </Label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger id="employee">
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees && employees.length > 0 ? (
                  employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      <div className="flex items-center gap-2">
                        <span>{employee.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          ({employee.role})
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-employees" disabled>
                    No employees available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date" required>
              Date
            </Label>
            <Input
              id="date"
              type="date"
              value={assignedDate}
              onChange={(e) => setAssignedDate(e.target.value)}
              required
            />
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Role on Job</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="painter">Painter</SelectItem>
                <SelectItem value="helper">Helper</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conflict Warning */}
          {createAssignment.isError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {createAssignment.error?.message || 'Failed to create assignment'}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createAssignment.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createAssignment.isPending || !selectedJobId || !selectedEmployeeId}
              loading={createAssignment.isPending}
            >
              Create Assignment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

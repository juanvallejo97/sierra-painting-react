/**
 * View Job Dialog
 *
 * Displays complete job details with worker assignments and status history
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  X,
  MapPin,
  Calendar,
  Users,
  FileText,
  Briefcase,
  Clock,
  CheckCircle2,
  PlayCircle,
  XCircle,
} from 'lucide-react';
import type { Job, JobStatus } from '../../hooks/useJobs';
import { format } from 'date-fns';

interface ViewJobDialogProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (jobId: string, newStatus: JobStatus) => void;
}

export function ViewJobDialog({
  job,
  open,
  onOpenChange,
  onStatusChange,
}: ViewJobDialogProps) {
  if (!job) return null;

  const getStatusVariant = (status: JobStatus) => {
    switch (status) {
      case 'completed':
        return 'default' as const;
      case 'in-progress':
        return 'secondary' as const;
      case 'scheduled':
        return 'outline' as const;
      case 'cancelled':
        return 'destructive' as const;
      default:
        return 'secondary' as const;
    }
  };

  const formatStatus = (status: JobStatus) => {
    return status.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getStatusIcon = (status: JobStatus) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-4 w-4" />;
      case 'in-progress':
        return <PlayCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Status transition options based on current status
  const getAvailableStatusTransitions = (currentStatus: JobStatus): JobStatus[] => {
    switch (currentStatus) {
      case 'scheduled':
        return ['in-progress', 'cancelled'];
      case 'in-progress':
        return ['completed', 'cancelled'];
      case 'completed':
        return [];
      case 'cancelled':
        return [];
      default:
        return [];
    }
  };

  const availableTransitions = getAvailableStatusTransitions(job.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Briefcase className="h-6 w-6" />
                {job.name}
              </DialogTitle>
              <DialogDescription>
                Complete job details and team information
              </DialogDescription>
            </div>
            <Badge variant={getStatusVariant(job.status)} className="ml-2 flex items-center gap-1">
              {getStatusIcon(job.status)}
              {formatStatus(job.status)}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Job Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">
                    {job.address}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Start Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(job.startDate), 'MMMM dd, yyyy')}
                  </p>
                </div>
              </div>

              {job.endDate && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">End Date</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(job.endDate), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Team Members</p>
                  <p className="text-sm text-muted-foreground">
                    {job.workerNames && job.workerNames.length > 0
                      ? job.workerNames.join(', ')
                      : `${job.workers.length} worker(s) assigned`}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {format(job.createdAt, 'MMMM dd, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Last Updated</p>
                  <p className="text-sm text-muted-foreground">
                    {format(job.updatedAt, 'MMMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Description */}
          {job.description && (
            <>
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Description
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {job.description}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Notes */}
          {job.notes && (
            <>
              <div className="space-y-2">
                <h3 className="font-semibold">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {job.notes}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Status Change Actions */}
          {availableTransitions.length > 0 && onStatusChange && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold">Quick Actions</h3>
                <div className="flex gap-2">
                  {availableTransitions.map((status) => (
                    <Button
                      key={status}
                      variant={status === 'cancelled' ? 'destructive' : 'default'}
                      size="sm"
                      onClick={() => {
                        onStatusChange(job.id, status);
                        onOpenChange(false);
                      }}
                      className="flex items-center gap-2"
                    >
                      {getStatusIcon(status)}
                      Mark as {formatStatus(status)}
                    </Button>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

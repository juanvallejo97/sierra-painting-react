import { useState } from 'react';
import { Clock, CheckCircle, XCircle, User, Briefcase } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { DataTable, type Column } from '../../components/ui/data-table';
import { EmptyState } from '../../components/ui/empty-state';
import { Skeleton } from '../../components/ui/skeleton';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  usePendingTimeEntries,
  useApproveTimeEntries,
  useRejectTimeEntry,
  type TimeEntry,
} from '../../hooks/useTimeEntries';

export function AdminReviewScreen() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isApproving, setIsApproving] = useState(false);

  const { data: pendingEntries = [], isLoading, error } = usePendingTimeEntries();
  const approveEntries = useApproveTimeEntries();
  const rejectEntry = useRejectTimeEntry();

  const handleSelectAll = () => {
    if (selectedIds.size === pendingEntries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingEntries.map(e => e.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleApproveSelected = async () => {
    if (selectedIds.size === 0) return;

    try {
      setIsApproving(true);
      await approveEntries.mutateAsync(Array.from(selectedIds));
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed to approve entries:', err);
    } finally {
      setIsApproving(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveEntries.mutateAsync([id]);
    } catch (err) {
      console.error('Failed to approve entry:', err);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Reason for rejection (optional):');
    try {
      await rejectEntry.mutateAsync({ id, reason: reason || undefined });
    } catch (err) {
      console.error('Failed to reject entry:', err);
    }
  };

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(2);
  };

  const columns: Column<TimeEntry>[] = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={selectedIds.size === pendingEntries.length && pendingEntries.length > 0}
          onChange={handleSelectAll}
          className="size-4 cursor-pointer"
        />
      ) as any,
      render: (entry) => (
        <input
          type="checkbox"
          checked={selectedIds.has(entry.id)}
          onChange={() => handleSelectOne(entry.id)}
          className="size-4 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: 'userName',
      header: 'Worker',
      sortable: true,
      render: (entry) => (
        <div className="flex items-center gap-2">
          <User className="size-4 text-muted-foreground" />
          <span className="font-medium">{entry.userName || 'Unknown'}</span>
        </div>
      ),
    },
    {
      key: 'jobName',
      header: 'Job',
      sortable: true,
      render: (entry) => (
        <div className="flex items-center gap-2">
          <Briefcase className="size-4 text-muted-foreground" />
          <span>{entry.jobName || entry.jobId}</span>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (entry) => (
        <span className="text-sm">
          {new Date(entry.date).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'time',
      header: 'Time',
      render: (entry) => (
        <div className="flex flex-col text-sm">
          <span>In: {formatTime(entry.clockIn)}</span>
          {entry.clockOut && <span>Out: {formatTime(entry.clockOut)}</span>}
        </div>
      ),
    },
    {
      key: 'hours',
      header: 'Hours',
      sortable: true,
      render: (entry) => (
        <Badge variant="outline" className="font-mono">
          {formatHours(entry.hours)} hrs
        </Badge>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (entry) => (
        <span className="text-sm text-muted-foreground">
          {entry.notes || '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (entry) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleApprove(entry.id);
            }}
            className="text-green-600 hover:text-green-700"
          >
            <CheckCircle className="size-4 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleReject(entry.id);
            }}
            className="text-red-600 hover:text-red-700"
          >
            <XCircle className="size-4 mr-1" />
            Reject
          </Button>
        </div>
      ),
    },
  ];

  const totalHours = pendingEntries.reduce((sum, entry) => sum + entry.hours, 0);

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1>Time Entry Review</h1>
            <p className="text-muted-foreground">
              Approve or reject worker time entries
            </p>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
              <Button
                onClick={handleApproveSelected}
                disabled={isApproving}
                loading={isApproving}
              >
                <CheckCircle className="size-4 mr-2" />
                Approve Selected
              </Button>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load time entries. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Card */}
        {!isLoading && pendingEntries.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Clock className="size-4" />
                Pending Entries
              </div>
              <p className="text-2xl font-bold">{pendingEntries.length}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Clock className="size-4" />
                Total Hours
              </div>
              <p className="text-2xl font-bold">{formatHours(totalHours)}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <User className="size-4" />
                Unique Workers
              </div>
              <p className="text-2xl font-bold">
                {new Set(pendingEntries.map(e => e.userId)).size}
              </p>
            </div>
          </div>
        )}

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
            data={pendingEntries}
            columns={columns}
            keyExtractor={(entry) => entry.id}
            emptyState={
              <EmptyState
                icon={CheckCircle}
                title="All caught up!"
                description="There are no pending time entries to review at the moment."
              />
            }
          />
        )}

        {/* Instructions */}
        {!isLoading && pendingEntries.length > 0 && (
          <Alert>
            <AlertDescription>
              <strong>Tip:</strong> Select multiple entries using the checkboxes to
              approve them all at once. Review each entry carefully before approving.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </AppLayout>
  );
}

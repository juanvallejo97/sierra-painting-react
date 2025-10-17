import { useState } from 'react';
// import { Link } from 'react-router-dom';
import { Plus, MapPin, Calendar, Users, Briefcase, Trash2, Pencil, Eye } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { DataTable, type Column } from '../components/ui/data-table';
import { EmptyState } from '../components/ui/empty-state';
import { SearchBar } from '../components/ui/search-bar';
import { Skeleton } from '../components/ui/skeleton';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useJobs, useDeleteJob, useUpdateJob, type Job, type JobStatus } from '../hooks/useJobs';
import { CreateJobDialog } from '../components/dialogs/CreateJobDialog';
import { EditJobDialog } from '../components/dialogs/EditJobDialog';
import { ConfirmDeleteDialog } from '../components/dialogs/ConfirmDeleteDialog';
import { ViewJobDialog } from '../components/dialogs/ViewJobDialog';

export function JobsScreen() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Job | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);
  const [viewTarget, setViewTarget] = useState<Job | null>(null);

  const { data: jobs = [], isLoading, error } = useJobs(
    statusFilter === 'all' ? undefined : statusFilter
  );
  const deleteJob = useDeleteJob();
  const updateJob = useUpdateJob();

  // Filter jobs by search
  const filteredJobs = jobs.filter((job) => {
    const searchLower = search.toLowerCase();
    return (
      job.name.toLowerCase().includes(searchLower) ||
      job.address.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case 'in-progress':
        return 'default';
      case 'scheduled':
        return 'secondary';
      case 'completed':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatStatus = (status: JobStatus) => {
    return status.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const handleStatusChange = async (jobId: string, newStatus: JobStatus) => {
    try {
      await updateJob.mutateAsync({
        id: jobId,
        data: { status: newStatus },
      });
    } catch (error) {
      console.error('Failed to update job status:', error);
    }
  };

  const columns: Column<Job>[] = [
    {
      key: 'name',
      header: 'Job Name',
      sortable: true,
      render: (job) => (
        <div>
          <p className="font-medium">{job.name}</p>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
            <MapPin className="size-3" />
            {job.address}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (job) => (
        <Badge variant={getStatusColor(job.status)}>
          {formatStatus(job.status)}
        </Badge>
      ),
    },
    {
      key: 'startDate',
      header: 'Start Date',
      sortable: true,
      render: (job) => (
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="size-4 text-muted-foreground" />
          {new Date(job.startDate).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: 'workers',
      header: 'Team',
      render: (job) => (
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <span className="text-sm">
            {job.workerNames && job.workerNames.length > 0
              ? job.workerNames.join(', ')
              : `${job.workers.length} worker(s)`}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (job) => (
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewTarget(job)}
          >
            <Eye className="size-3 mr-1" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditTarget(job)}
          >
            <Pencil className="size-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteTarget(job)}
          >
            <Trash2 className="size-4 mr-1" />
            Delete
          </Button>
        </div>
      ),
    },
  ];

  // Count jobs by status
  const statusCounts = {
    all: jobs.length,
    scheduled: jobs.filter(j => j.status === 'scheduled').length,
    'in-progress': jobs.filter(j => j.status === 'in-progress').length,
    completed: jobs.filter(j => j.status === 'completed').length,
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1>Jobs</h1>
            <p className="text-muted-foreground">Manage all painting jobs</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="size-4 mr-2" />
            New Job
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load jobs. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Status Tabs */}
          <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as JobStatus | 'all')}>
            <TabsList>
              <TabsTrigger value="all">
                All ({statusCounts.all})
              </TabsTrigger>
              <TabsTrigger value="scheduled">
                Scheduled ({statusCounts.scheduled})
              </TabsTrigger>
              <TabsTrigger value="in-progress">
                In Progress ({statusCounts['in-progress']})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({statusCounts.completed})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search jobs by name or address..."
            className="sm:max-w-md sm:ml-auto"
          />
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          /* Data Table */
          <DataTable
            data={filteredJobs}
            columns={columns}
            keyExtractor={(job) => job.id}
            emptyState={
              <EmptyState
                icon={Briefcase}
                title="No jobs found"
                description={
                  search
                    ? 'Try adjusting your search to find what you\'re looking for.'
                    : statusFilter === 'all'
                    ? 'Get started by creating your first job.'
                    : `No ${formatStatus(statusFilter as JobStatus).toLowerCase()} jobs at the moment.`
                }
                action={
                  !search && statusFilter === 'all'
                    ? {
                        label: 'Create Job',
                        onClick: () => setCreateDialogOpen(true),
                      }
                    : undefined
                }
              />
            }
          />
        )}

        {/* Stats Footer */}
        {!isLoading && jobs.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>
              Showing {filteredJobs.length} of {jobs.length} jobs
            </p>
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <div className="size-2 rounded-full bg-blue-500" />
                Scheduled: {statusCounts.scheduled}
              </span>
              <span className="flex items-center gap-1">
                <div className="size-2 rounded-full bg-green-500" />
                In Progress: {statusCounts['in-progress']}
              </span>
              <span className="flex items-center gap-1">
                <div className="size-2 rounded-full bg-gray-500" />
                Completed: {statusCounts.completed}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Create Job Dialog */}
      <CreateJobDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {/* Edit Job Dialog */}
      <EditJobDialog
        job={editTarget}
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => deleteJob.mutateAsync(deleteTarget!.id)}
        title="Delete Job"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? All associated data including time entries and assignments will be lost.`}
        isLoading={deleteJob.isPending}
      />

      {/* View Job Dialog */}
      <ViewJobDialog
        job={viewTarget}
        open={!!viewTarget}
        onOpenChange={(open) => !open && setViewTarget(null)}
        onStatusChange={handleStatusChange}
      />
    </AppLayout>
  );
}

# React Query + Firebase Integration Guide

Complete guide for using React Query with Firebase in the Sierra Painting React application.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Query Keys](#query-keys)
- [Hooks](#hooks)
- [Optimistic Updates](#optimistic-updates)
- [Offline Persistence](#offline-persistence)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Overview

Our React Query integration provides a robust data layer with:

- **Type-safe queries** with automatic validation
- **Optimistic updates** for instant UI feedback
- **Offline persistence** for working without network
- **Smart retry logic** for transient failures
- **Standardized cache keys** for easy invalidation

## Key Features

### 1. Type-Safe Data Converters

All Firestore operations use Zod-validated converters:

```typescript
import { jobConverter } from '@/lib/converters';

// Automatic validation and type conversion
const jobRef = doc(db, 'jobs', jobId).withConverter(jobConverter);
const snapshot = await getDoc(jobRef);
const job = snapshot.data(); // Fully typed JobDocument
```

### 2. Standardized Query Keys

Consistent, hierarchical query keys:

```typescript
import { queryKeys } from '@/lib/query-keys';

// List queries
queryKeys.jobs.list({ status: 'scheduled' });
// ['data', 'jobs', 'list', { status: 'scheduled' }]

// Detail queries
queryKeys.jobs.detail('job-001');
// ['data', 'jobs', 'detail', 'job-001']

// Invalidate all jobs
queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all() });
```

### 3. Optimistic Updates

Instant UI feedback with automatic rollback:

```typescript
const updateJob = useUpdateJobEnhanced();

// UI updates immediately, rolls back on error
updateJob.mutate({
  id: 'job-001',
  data: { status: 'completed' },
});
```

### 4. Offline Persistence

Data persists in localStorage for offline access:

```typescript
// Automatic persistence configuration
setupPersistence(queryClient);

// Works offline!
const { data: jobs } = useJobsEnhanced();
```

## Query Keys

### Structure

All query keys follow a hierarchical structure:

```
['data'] <- Root
  └─ ['data', 'jobs'] <- Collection
      ├─ ['data', 'jobs', 'list'] <- All lists
      │   └─ ['data', 'jobs', 'list', { status: 'scheduled' }] <- Filtered list
      └─ ['data', 'jobs', 'detail'] <- All details
          └─ ['data', 'jobs', 'detail', 'job-001'] <- Specific detail
```

### Available Keys

**Jobs**:
```typescript
queryKeys.jobs.all()                    // All job queries
queryKeys.jobs.lists()                  // All list queries
queryKeys.jobs.list(filters)            // Filtered list
queryKeys.jobs.details()                // All detail queries
queryKeys.jobs.detail(id)               // Single job
queryKeys.jobs.byWorker(workerId)       // Jobs by worker
queryKeys.jobs.byStatus(status)         // Jobs by status
```

**Invoices**:
```typescript
queryKeys.invoices.all()
queryKeys.invoices.list(filters)
queryKeys.invoices.detail(id)
queryKeys.invoices.byJob(jobId)
queryKeys.invoices.byClient(client)
```

**Users**:
```typescript
queryKeys.users.all()
queryKeys.users.list(filters)
queryKeys.users.detail(id)
queryKeys.users.current()
queryKeys.users.byRole(role)
```

### Cache Invalidation

```typescript
// Invalidate all jobs (lists and details)
queryClient.invalidateQueries({
  queryKey: queryKeys.jobs.all()
});

// Invalidate only job lists (not details)
queryClient.invalidateQueries({
  queryKey: queryKeys.jobs.lists()
});

// Invalidate specific job
queryClient.invalidateQueries({
  queryKey: queryKeys.jobs.detail('job-001')
});
```

## Hooks

### Basic Query Hooks

#### useJobsEnhanced

Fetch all jobs with optional filters:

```typescript
import { useJobsEnhanced } from '@/hooks/useJobs.enhanced';

function JobsList() {
  const { data: jobs, isLoading, error } = useJobsEnhanced({
    status: 'scheduled',
    workerId: 'worker-001',
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {jobs.map((job) => (
        <li key={job.id}>{job.name}</li>
      ))}
    </ul>
  );
}
```

**Filters**:
- `status`: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'all'
- `workerId`: Filter by assigned worker
- `startDate`: Filter by start date
- `endDate`: Filter by end date

#### useJobEnhanced

Fetch a single job:

```typescript
import { useJobEnhanced } from '@/hooks/useJobs.enhanced';

function JobDetail({ jobId }: { jobId: string }) {
  const { data: job, isLoading } = useJobEnhanced(jobId);

  if (isLoading) return <div>Loading...</div>;
  if (!job) return <div>Job not found</div>;

  return (
    <div>
      <h1>{job.name}</h1>
      <p>{job.address}</p>
      <p>Status: {job.status}</p>
    </div>
  );
}
```

### Mutation Hooks

#### useCreateJobEnhanced

Create a new job:

```typescript
import { useCreateJobEnhanced } from '@/hooks/useJobs.enhanced';

function CreateJobForm() {
  const createJob = useCreateJobEnhanced();

  const handleSubmit = async (data) => {
    try {
      const jobId = await createJob.mutateAsync(data);
      console.log('Created job:', jobId);
    } catch (error) {
      console.error('Failed to create job:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button
        type="submit"
        disabled={createJob.isPending}
      >
        {createJob.isPending ? 'Creating...' : 'Create Job'}
      </button>
      {createJob.isError && (
        <div>Error: {createJob.error.message}</div>
      )}
    </form>
  );
}
```

#### useUpdateJobEnhanced

Update a job with optimistic updates:

```typescript
import { useUpdateJobEnhanced } from '@/hooks/useJobs.enhanced';

function JobStatusButton({ jobId, currentStatus }) {
  const updateJob = useUpdateJobEnhanced();

  const handleComplete = () => {
    // UI updates instantly, rolls back on error
    updateJob.mutate({
      id: jobId,
      data: { status: 'completed' },
    });
  };

  return (
    <button onClick={handleComplete} disabled={updateJob.isPending}>
      {currentStatus === 'completed' ? 'Completed ✓' : 'Mark Complete'}
    </button>
  );
}
```

#### useDeleteJobEnhanced

Delete a job with optimistic removal:

```typescript
import { useDeleteJobEnhanced } from '@/hooks/useJobs.enhanced';

function DeleteJobButton({ jobId }) {
  const deleteJob = useDeleteJobEnhanced();

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this job?')) {
      return;
    }

    try {
      await deleteJob.mutateAsync(jobId);
      // Job removed from list instantly
    } catch (error) {
      alert('Failed to delete job: ' + error.message);
    }
  };

  return (
    <button onClick={handleDelete} disabled={deleteJob.isPending}>
      {deleteJob.isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
```

### Convenience Hooks

#### useJobsByStatus

Get jobs filtered by status:

```typescript
import { useJobsByStatus } from '@/hooks/useJobs.enhanced';

function ScheduledJobsList() {
  const { data: scheduledJobs } = useJobsByStatus('scheduled');

  return (
    <div>
      <h2>Scheduled Jobs ({scheduledJobs?.length || 0})</h2>
      {/* Render jobs */}
    </div>
  );
}
```

#### useJobsByWorker

Get jobs assigned to a worker:

```typescript
import { useJobsByWorker } from '@/hooks/useJobs.enhanced';

function WorkerJobsList({ workerId }) {
  const { data: workerJobs } = useJobsByWorker(workerId);

  return (
    <div>
      <h2>Your Jobs ({workerJobs?.length || 0})</h2>
      {/* Render jobs */}
    </div>
  );
}
```

## Optimistic Updates

Optimistic updates provide instant UI feedback by updating the cache immediately, then rolling back if the mutation fails.

### How It Works

1. **Before mutation**: Update cache with optimistic data
2. **On success**: Keep optimistic data, refetch for consistency
3. **On error**: Rollback to previous data, show error

### Example: Update Job Status

```typescript
const updateJob = useUpdateJobEnhanced();

// Clicking this button updates UI instantly
const handleComplete = () => {
  updateJob.mutate({
    id: 'job-001',
    data: { status: 'completed' },
  }, {
    onSuccess: () => {
      toast.success('Job marked as completed');
    },
    onError: (error) => {
      toast.error('Failed to update job');
      // UI automatically reverted
    },
  });
};
```

### Custom Optimistic Updates

For custom mutations, use `createOptimisticMutation`:

```typescript
import { createOptimisticMutation } from '@/lib/mutation-utils';
import { queryKeys } from '@/lib/query-keys';

const updateMultipleJobs = useMutation(
  createOptimisticMutation(
    async (jobIds: string[]) => {
      // Mutation logic
    },
    queryClient,
    {
      queryKey: queryKeys.jobs.lists(),
      queryClient,
      updater: (oldData, jobIds) => {
        // Update logic
        return oldData.map((job) =>
          jobIds.includes(job.id)
            ? { ...job, status: 'completed' }
            : job
        );
      },
    },
    [queryKeys.jobs.all()]
  )
);
```

## Offline Persistence

Data is automatically persisted to localStorage for offline access.

### Configuration

Persistence is configured in `query-client-config.ts`:

```typescript
import { setupPersistence } from '@/lib/query-client-config';

setupPersistence(queryClient);
```

### What Gets Persisted

- ✅ Successful queries less than 1 hour old
- ✅ All job, invoice, and user data
- ❌ Failed queries
- ❌ Stale data (> 1 hour old)

### Cache Duration

- **Max age**: 24 hours
- **Stale time**: 2 minutes (queries)
- **GC time**: 5 minutes (inactive queries)

### Clear Cache

```typescript
import { clearPersistedCache } from '@/lib/query-client-config';

clearPersistedCache();
```

### Cache Statistics

```typescript
import { getCacheStats } from '@/lib/query-client-config';

const stats = getCacheStats(queryClient);
console.log('Cache stats:', stats);
```

## Error Handling

### Retry Logic

Automatic retry for transient errors:

```typescript
// Retryable errors:
- unavailable
- deadline-exceeded
- resource-exhausted
- network errors
- timeout errors

// Non-retryable errors:
- permission-denied
- not-found
- invalid-argument
```

### Retry Strategy

```typescript
import { RetryStrategy } from '@/lib/mutation-utils';

// Exponential backoff: 1s, 2s, 4s (max 30s)
retryStrategy: RetryStrategy.EXPONENTIAL

// Immediate retry (2 attempts)
retryStrategy: RetryStrategy.IMMEDIATE

// Retry only network errors
retryStrategy: RetryStrategy.NETWORK_ONLY

// No retry
retryStrategy: RetryStrategy.NONE
```

### Error Messages

All errors are logged and can be displayed to users:

```typescript
const { error, isError } = useJobsEnhanced();

if (isError) {
  return <div className="error">
    {error.message}
  </div>;
}
```

## Best Practices

### 1. Use Query Keys Consistently

```typescript
// ✅ Good
queryClient.invalidateQueries({
  queryKey: queryKeys.jobs.all()
});

// ❌ Bad
queryClient.invalidateQueries({
  queryKey: ['jobs']
});
```

### 2. Handle Loading States

```typescript
// ✅ Good
const { data, isLoading, isError } = useJobsEnhanced();

if (isLoading) return <Spinner />;
if (isError) return <ErrorMessage />;
if (!data) return null;

return <JobsList jobs={data} />;
```

### 3. Use Optimistic Updates for Better UX

```typescript
// ✅ Good - instant feedback
updateJob.mutate({ id, data: { status: 'completed' } });

// ❌ Bad - waits for server
updateJob.mutateAsync({ id, data })
  .then(() => setStatus('completed'));
```

### 4. Leverage Cache Invalidation

```typescript
// ✅ Good - invalidate related queries
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all() });
  queryClient.invalidateQueries({ queryKey: queryKeys.invoices.byJob(jobId) });
}

// ❌ Bad - only invalidate one query
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['jobs', 'list'] });
}
```

### 5. Validate Data at Boundaries

```typescript
// ✅ Good - validate before mutation
const createJob = useCreateJobEnhanced();

const handleSubmit = (data) => {
  try {
    const validated = validateCreateJob(data);
    createJob.mutate(validated);
  } catch (error) {
    showValidationError(error);
  }
};
```

### 6. Use Filters for Specific Queries

```typescript
// ✅ Good - specific query
const { data: scheduledJobs } = useJobsEnhanced({
  status: 'scheduled'
});

// ❌ Bad - filter client-side
const { data: allJobs } = useJobsEnhanced();
const scheduledJobs = allJobs?.filter(j => j.status === 'scheduled');
```

### 7. Handle Mutations Properly

```typescript
// ✅ Good - handle success/error
createJob.mutate(data, {
  onSuccess: (id) => {
    toast.success('Job created');
    navigate(`/jobs/${id}`);
  },
  onError: (error) => {
    toast.error(error.message);
  },
});

// ❌ Bad - fire and forget
createJob.mutate(data);
```

## Performance Tips

### 1. Set Appropriate Stale Times

```typescript
// Frequently changing data
staleTime: 30 * 1000 // 30 seconds

// Rarely changing data
staleTime: 10 * 60 * 1000 // 10 minutes

// Static data
staleTime: Infinity
```

### 2. Use Prefetching for Better UX

```typescript
import { useQueryClient } from '@tanstack/react-query';

function JobListItem({ jobId }) {
  const queryClient = useQueryClient();

  const prefetchJob = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.jobs.detail(jobId),
      queryFn: () => fetchJob(jobId),
    });
  };

  return (
    <div onMouseEnter={prefetchJob}>
      {/* Job preview */}
    </div>
  );
}
```

### 3. Enable Persistence for Offline Support

Already configured! Data persists automatically.

### 4. Batch Updates

```typescript
import { useBulkUpdateJobs } from '@/hooks/useJobs.enhanced';

const bulkUpdate = useBulkUpdateJobs();

// Update multiple jobs at once
bulkUpdate.mutate([
  { id: 'job-1', data: { status: 'completed' } },
  { id: 'job-2', data: { status: 'completed' } },
  { id: 'job-3', data: { status: 'completed' } },
]);
```

## Migration Guide

### From Old Hooks to Enhanced Hooks

**Before**:
```typescript
import { useJobs, useCreateJob } from '@/hooks/useJobs';

const { data: jobs } = useJobs('scheduled');
const createJob = useCreateJob();
```

**After**:
```typescript
import { useJobsEnhanced, useCreateJobEnhanced } from '@/hooks/useJobs.enhanced';

const { data: jobs } = useJobsEnhanced({ status: 'scheduled' });
const createJob = useCreateJobEnhanced();
```

### Key Differences

1. **Filters as object**: `useJobsEnhanced({ status: 'scheduled' })`
2. **Type-safe data**: Full TypeScript support with converters
3. **Optimistic updates**: Instant UI feedback
4. **Better error handling**: Standardized retry logic
5. **Offline support**: Automatic persistence

## Troubleshooting

### Query Not Updating

Check query key:
```typescript
// Make sure you're using the same key for invalidation
queryClient.invalidateQueries({ queryKey: queryKeys.jobs.list({ status: 'scheduled' }) });
```

### Optimistic Update Not Working

Ensure updater function is correct:
```typescript
updater: (oldData, variables) => {
  // Must return new data
  return oldData.map(item =>
    item.id === variables.id ? { ...item, ...variables.data } : item
  );
}
```

### Persistence Not Working

Check localStorage:
```typescript
// Clear and try again
clearPersistedCache();
setupPersistence(queryClient);
```

### Type Errors

Ensure converters are used:
```typescript
// ✅ With converter
const jobRef = doc(db, 'jobs', id).withConverter(jobConverter);

// ❌ Without converter
const jobRef = doc(db, 'jobs', id); // No type safety
```

## Additional Resources

- [React Query Docs](https://tanstack.com/query/latest)
- [Firebase Docs](https://firebase.google.com/docs)
- [Zod Validation](https://zod.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Support

For questions or issues:
- Check this documentation
- Review code examples in `src/hooks/useJobs.enhanced.ts`
- Check console logs for detailed error messages
- Review query cache with React Query DevTools

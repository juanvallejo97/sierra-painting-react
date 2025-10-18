# UX Improvements Guide

**Phase 3, Days 14-15: UX Polish Implementation**

This guide shows how to use the new UX improvements for consistent, professional user feedback.

---

## Table of Contents

1. [Toast Notifications](#toast-notifications)
2. [Loading States & Skeletons](#loading-states--skeletons)
3. [Error Handling with Recovery](#error-handling-with-recovery)
4. [Success Feedback](#success-feedback)
5. [Best Practices](#best-practices)

---

## Toast Notifications

### Setup

The `Toaster` component is already added to `App.tsx`. Import toast utilities:

```typescript
import { showSuccess, showError, toastMessages } from '@/lib/toast-utils';
```

### Basic Usage

```typescript
// Success
showSuccess('Invoice created successfully');

// Error
showError('Failed to create invoice');

// Info
showInfo('Processing your request');

// Warning
showWarning('This action cannot be undone');
```

### With Descriptions

```typescript
showSuccess('Invoice sent', {
  description: 'The invoice has been emailed to the client.',
});

showError('Network error', {
  description: 'Please check your internet connection and try again.',
});
```

### With Recovery Actions

```typescript
showError('Failed to save changes', {
  description: 'An error occurred while saving your changes.',
  action: {
    label: 'Retry',
    onClick: () => {
      // Retry the operation
      saveChanges();
    },
  },
});
```

### Promise-based Toasts

Automatically show loading → success/error:

```typescript
import { showPromise } from '@/lib/toast-utils';

const createInvoice = async (data: InvoiceData) => {
  return showPromise(invoiceService.create(data), {
    loading: 'Creating invoice...',
    success: 'Invoice created successfully!',
    error: (err) => `Failed to create invoice: ${err.message}`,
  });
};
```

---

## Loading States & Skeletons

### Page-Level Loading

Use the `PageSkeleton` for initial page loads:

```typescript
import { PageSkeleton } from '@/components/ui/skeleton';

export function MyScreen() {
  const { data, isLoading } = useMyData();

  if (isLoading) {
    return <PageSkeleton />;
  }

  return <div>{/* Your content */}</div>;
}
```

### List Loading States

#### Invoice/Estimate Lists

```typescript
import { InvoiceListSkeleton } from '@/components/ui/skeleton';

export function InvoiceList() {
  const { invoices, isLoading } = useInvoices();

  if (isLoading) {
    return <InvoiceListSkeleton rows={5} />;
  }

  return (
    <div>
      {invoices.map(invoice => (
        <InvoiceCard key={invoice.id} invoice={invoice} />
      ))}
    </div>
  );
}
```

#### Employee Lists

```typescript
import { EmployeeListSkeleton } from '@/components/ui/skeleton';

export function EmployeeList() {
  const { employees, isLoading } = useEmployees();

  if (isLoading) {
    return <EmployeeListSkeleton rows={5} />;
  }

  return <div>{/* Employee cards */}</div>;
}
```

#### Job Cards (Grid Layout)

```typescript
import { JobCardSkeleton } from '@/components/ui/skeleton';

export function JobsGrid() {
  const { jobs, isLoading } = useJobs();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <JobCardSkeleton />
        <JobCardSkeleton />
        <JobCardSkeleton />
      </div>
    );
  }

  return <div>{/* Job cards */}</div>;
}
```

### Table Loading States

```typescript
import { TableSkeleton } from '@/components/ui/skeleton';

export function DataTableView() {
  const { data, isLoading } = useTableData();

  if (isLoading) {
    return (
      <table>
        <tbody>
          <TableSkeleton rows={10} columns={5} />
        </tbody>
      </table>
    );
  }

  return <DataTable data={data} />;
}
```

### Form Loading States

```typescript
import { FormSkeleton } from '@/components/ui/skeleton';

export function EditDialog({ open, itemId }) {
  const { data, isLoading } = useItem(itemId);

  return (
    <Dialog open={open}>
      <DialogContent>
        {isLoading ? (
          <FormSkeleton fields={5} />
        ) : (
          <form>{/* Form fields */}</form>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### Dashboard Stats

```typescript
import { StatsCardSkeleton } from '@/components/ui/skeleton';

export function Dashboard() {
  const { stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
    );
  }

  return <div>{/* Stats cards */}</div>;
}
```

---

## Error Handling with Recovery

### React Query Mutations

```typescript
import { toastMessages } from '@/lib/toast-utils';

export function useCreateInvoice() {
  const mutation = useMutation({
    mutationFn: (data: InvoiceData) => invoiceService.create(data),
    onSuccess: () => {
      toastMessages.created('Invoice');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      toastMessages.createError('invoice', () => {
        // Retry logic
        mutation.mutate(lastAttemptedData);
      });
    },
  });

  return mutation;
}
```

### Network Errors

```typescript
import { toastMessages } from '@/lib/toast-utils';

const handleSubmit = async (data: FormData) => {
  try {
    await api.post('/invoices', data);
    toastMessages.created('Invoice');
  } catch (error) {
    if (error.code === 'NETWORK_ERROR') {
      toastMessages.networkError(() => handleSubmit(data));
    } else {
      toastMessages.createError('invoice', () => handleSubmit(data));
    }
  }
};
```

### Permission Errors

```typescript
const handleDelete = async (id: string) => {
  try {
    await api.delete(`/invoices/${id}`);
    toastMessages.deleted('Invoice');
  } catch (error) {
    if (error.status === 403) {
      toastMessages.permissionError();
    } else {
      toastMessages.deleteError('invoice', () => handleDelete(id));
    }
  }
};
```

### Validation Errors

```typescript
const handleSubmit = async (data: FormData) => {
  try {
    await schema.validate(data);
    await api.post('/invoices', data);
    toastMessages.saved();
  } catch (error) {
    if (error instanceof ValidationError) {
      toastMessages.validationError(error.message);
    } else {
      toastMessages.createError('invoice', () => handleSubmit(data));
    }
  }
};
```

---

## Success Feedback

### CRUD Operations

```typescript
import { toastMessages } from '@/lib/toast-utils';

// Create
const createInvoice = useMutation({
  onSuccess: () => toastMessages.created('Invoice'),
});

// Update
const updateInvoice = useMutation({
  onSuccess: () => toastMessages.updated('Invoice'),
});

// Delete
const deleteInvoice = useMutation({
  onSuccess: () => toastMessages.deleted('Invoice'),
});
```

### Custom Success Messages

```typescript
import { showSuccess } from '@/lib/toast-utils';

// Sending email
const sendInvoice = async () => {
  await api.post('/send-invoice');
  showSuccess('Invoice sent', {
    description: 'The invoice has been emailed to the client.',
  });
};

// Copying to clipboard
const copyLink = () => {
  navigator.clipboard.writeText(link);
  toastMessages.copied();
};

// Generic save
const saveSettings = async () => {
  await api.patch('/settings');
  toastMessages.saved();
};
```

### Multi-step Operations

```typescript
import { showInfo, showSuccess } from '@/lib/toast-utils';

const processPayroll = async () => {
  // Step 1
  showInfo('Calculating payroll...');
  await api.post('/payroll/calculate');

  // Step 2
  showInfo('Generating reports...');
  await api.post('/payroll/reports');

  // Complete
  showSuccess('Payroll processed successfully', {
    description: '5 employees have been paid.',
  });
};
```

---

## Best Practices

### 1. Loading States

**DO:**

```typescript
// Show skeleton matching content structure
{isLoading ? <InvoiceListSkeleton /> : <InvoiceList data={invoices} />}
```

**DON'T:**

```typescript
// Generic spinner doesn't match content
{isLoading ? <Spinner /> : <InvoiceList data={invoices} />}
```

### 2. Error Messages

**DO:**

```typescript
// Provide recovery action
showError('Failed to save', {
  description: 'Please try again.',
  action: { label: 'Retry', onClick: retry },
});
```

**DON'T:**

```typescript
// Just show error without help
showError('Failed to save');
```

### 3. Success Feedback

**DO:**

```typescript
// Confirm action completed
toastMessages.created('Invoice');
```

**DON'T:**

```typescript
// Silent success (user doesn't know what happened)
// No feedback
```

### 4. Toast Timing

**DO:**

```typescript
// Longer duration for errors
showError('Failed', { duration: 6000 });

// Standard for success
showSuccess('Done', { duration: 4000 });
```

**DON'T:**

```typescript
// Too short (user might miss it)
showSuccess('Done', { duration: 1000 });
```

### 5. Promise Toasts

**DO:**

```typescript
// Show loading → success/error automatically
showPromise(api.post(), {
  loading: 'Saving...',
  success: 'Saved!',
  error: 'Failed to save',
});
```

**DON'T:**

```typescript
// Manual loading state management
showInfo('Saving...');
try {
  await api.post();
  dismissToast(id);
  showSuccess('Saved!');
} catch {
  dismissToast(id);
  showError('Failed');
}
```

---

## Complete Example

Here's a full example combining all improvements:

```typescript
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { InvoiceListSkeleton } from '@/components/ui/skeleton';
import { toastMessages, showPromise } from '@/lib/toast-utils';

export function InvoicesScreen() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Fetch invoices
  const {
    data: invoices,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.get('/invoices'),
  });

  // Create invoice mutation
  const createInvoice = useMutation({
    mutationFn: (data: InvoiceData) => api.post('/invoices', data),
    onSuccess: () => {
      toastMessages.created('Invoice');
      setCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      if (error.code === 'NETWORK_ERROR') {
        toastMessages.networkError(() => createInvoice.mutate(lastData));
      } else {
        toastMessages.createError('invoice', () => createInvoice.mutate(lastData));
      }
    },
  });

  // Delete invoice mutation
  const deleteInvoice = useMutation({
    mutationFn: (id: string) => api.delete(`/invoices/${id}`),
    onSuccess: () => {
      toastMessages.deleted('Invoice');
      refetch();
    },
    onError: (error) => {
      toastMessages.deleteError('invoice', () => deleteInvoice.mutate(invoiceId));
    },
  });

  // Send invoice with promise toast
  const handleSend = async (invoice: Invoice) => {
    await showPromise(
      api.post(`/invoices/${invoice.id}/send`),
      {
        loading: 'Sending invoice...',
        success: 'Invoice sent successfully!',
        error: (err) => `Failed to send: ${err.message}`,
      }
    );
    refetch();
  };

  // Loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <InvoiceListSkeleton rows={5} />
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AppLayout>
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load invoices.{' '}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => refetch()}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Invoices</h1>
          <Button onClick={() => setCreateDialogOpen(true)}>
            Create Invoice
          </Button>
        </div>

        <div className="space-y-4">
          {invoices.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              onSend={() => handleSend(invoice)}
              onDelete={() => deleteInvoice.mutate(invoice.id)}
            />
          ))}
        </div>

        <CreateInvoiceDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={(data) => createInvoice.mutate(data)}
          isLoading={createInvoice.isPending}
        />
      </div>
    </AppLayout>
  );
}
```

---

## Migration Checklist

When updating existing components:

- [ ] Replace generic spinners with appropriate skeletons
- [ ] Add toast feedback for all mutations
- [ ] Include retry actions for errors
- [ ] Use promise toasts for async operations
- [ ] Show success confirmation after actions
- [ ] Handle network errors gracefully
- [ ] Test loading states on slow connections
- [ ] Verify toast accessibility (screen reader announcements)

---

## Resources

**Files:**

- `src/components/ui/toaster.tsx` - Toast provider
- `src/lib/toast-utils.ts` - Toast utilities
- `src/components/ui/skeleton.tsx` - Skeleton components

**Dependencies:**

- `sonner` - Toast library

**Documentation:**

- Sonner docs: https://sonner.emilkowal.ski/
- React Query error handling: https://tanstack.com/query/latest/docs/framework/react/guides/mutations

---

**Last Updated:** October 17, 2025
**Phase:** 3 - Accessibility & UX (Days 14-15)

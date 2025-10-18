# Screen Migration Status

## Overview

Migration of 11 Figma-exported screens to production-ready React components with full data integration, validation, and enhanced UX.

## ✅ Infrastructure Complete (Phase A)

### Data Hooks (6)

- `src/hooks/useEmployees.ts` - Full CRUD with company isolation
- `src/hooks/useJobs.ts` - Job management with worker assignment
- `src/hooks/useInvoices.ts` - Invoice workflow with auto-numbering (INV-YYYYMM-XXXX)
- `src/hooks/useEstimates.ts` - Estimate management with line items
- `src/hooks/useTimeEntries.ts` - Time tracking with admin approval workflow
- `src/hooks/useSchedule.ts` - Worker schedule with filtering (today/week/all)

### Validation Schemas (4)

- `src/schemas/employee.schema.ts` - E.164 phone validation, role validation
- `src/schemas/job.schema.ts` - Date validation, worker assignment
- `src/schemas/invoice.schema.ts` - Payment recording, tax calculation
- `src/schemas/estimate.schema.ts` - Line items, conversion to job/invoice

### UI Components (5 new)

- `src/components/ui/logo.tsx` - Reusable logo component (sm/md/lg)
- `src/components/ui/separator.tsx` - Horizontal divider
- `src/components/ui/data-table.tsx` - Sortable table with empty states
- `src/components/ui/empty-state.tsx` - Consistent empty state pattern
- `src/components/ui/search-bar.tsx` - Debounced search with clear button

## ✅ Screens Completed (3/11)

### 1. SignupScreen (/src/pages/auth/SignupScreen.tsx)

**Status:** ✅ Complete
**Features:**

- React Hook Form + Zod validation
- Password strength indicator (5 levels)
- Show/hide password toggles
- Real-time validation feedback
- Logo integration
- Error handling from auth context

### 2. EmployeesScreen (/src/pages/EmployeesScreen.tsx)

**Status:** ✅ Complete
**Features:**

- DataTable with sortable columns
- Search by name, email, phone
- Role and status badges with color coding
- Click-to-call and click-to-email
- Empty state with invite action
- Loading skeletons
- Stats footer (Active/Invited counts)
- Uses `useEmployees` hook

### 3. SettingsScreen (/src/pages/SettingsScreen.tsx)

**Status:** ✅ Complete
**Features:**

- Profile editing with validation
- Notification preferences with switches
- Security section (change password stub)
- Success toast on save
- Email field disabled (requires verification flow)
- Separator component usage

## ⏳ Remaining Screens (8/11)

### 4. NoRoleScreen (/src/pages/NoRoleScreen.tsx)

**Status:** Ready for migration
**Required Changes:**

- Replace logo placeholder with `<Logo />` component
- Implement `refreshClaims()` method in auth-context.tsx
  - Alternative: Use existing `refreshUser()` method
- Add loading state during refresh
- Enhance with better copy for administrators

**Pattern:**

```tsx
import { Logo } from '../components/ui/logo';
const { user, signOut, refreshUser } = useAuth();

const handleRefresh = async () => {
  await refreshUser();
  window.location.reload();
};
```

### 5. ForgotPasswordScreen (/src/pages/auth/ForgotPasswordScreen.tsx)

**Status:** Needs minor fixes
**Required Changes:**

- Fix method name: `sendPasswordReset` → `resetPassword`
- Add Logo component
- Add countdown timer for resend (60 seconds)
- Add auto-focus on email field
- Use Button loading prop instead of manual Loader2

**Pattern:**

```tsx
import { Logo } from '../../components/ui/logo';
const { resetPassword, loading } = useAuth();

await resetPassword(email);
```

### 6. JobsScreen (/src/pages/JobsScreen.tsx)

**Status:** Ready for full enhancement
**Required Changes:**

- Replace mock data with `useJobs()` hook
- Add Tabs component for status filtering (All, Scheduled, In Progress, Completed)
- Convert card list to DataTable
- Add SearchBar for filtering
- Add worker avatars
- Add Dialog for job creation with react-hook-form
- Implement job status transitions
- Add loading states with Skeleton

**Data Hook:**

```tsx
import { useJobs } from '../hooks/useJobs';
const { data: jobs, isLoading } = useJobs();
```

**Columns:**

- Name (sortable)
- Address
- Status badge
- Start Date (sortable)
- Workers (avatars)
- Actions button

### 7. InvoicesScreen (/src/pages/InvoicesScreen.tsx)

**Status:** Ready for full enhancement
**Required Changes:**

- Replace mock data with `useInvoices()` hook
- Add Tabs for status filtering (All, Draft, Sent, Paid, Overdue)
- Convert to DataTable
- Add SearchBar (by client name, invoice number)
- Add Dialog for payment recording
- Implement PDF export with jsPDF
- Add email sending capability
- Show computed overdue status

**Data Hook:**

```tsx
import { useInvoices, useUpdateInvoice } from '../hooks/useInvoices';
const { data: invoices, isLoading } = useInvoices();
const updateInvoice = useUpdateInvoice();
```

**Status Workflow:**

```
draft → sent → paid
              ↓ (computed)
           overdue (if past dueDate)
```

### 8. EstimatesScreen (/src/pages/EstimatesScreen.tsx)

**Status:** Ready for full enhancement
**Required Changes:**

- Replace mock data with `useEstimates()` hook
- Add Tabs for status filtering
- Convert to DataTable
- Add Dialog for creating estimates with line items
- Implement "Convert to Job" functionality
- Implement "Convert to Invoice" functionality
- Add email sending
- Show computed expired status

**Data Hook:**

```tsx
import { useEstimates } from '../hooks/useEstimates';
const { data: estimates, isLoading } = useEstimates();
```

**Actions:**

- Edit estimate
- Send to client (email)
- Convert to Job (Dialog with worker selection)
- Convert to Invoice (Dialog with tax rate, due date)
- Delete (draft only)

### 9. AdminReviewScreen (/src/pages/admin/AdminReviewScreen.tsx)

**Status:** Ready for full enhancement
**Required Changes:**

- Replace mock data with `usePendingTimeEntries()` hook
- Convert to DataTable with row selection (checkboxes)
- Add bulk approve/reject actions
- Add filters: date range, worker selection
- Add GPS location display (if available)
- Add notes/rejection reason dialog
- Implement approval workflow
- Add pagination (if >50 entries)

**Data Hook:**

```tsx
import {
  usePendingTimeEntries,
  useApproveTimeEntries,
  useRejectTimeEntry,
} from '../hooks/useTimeEntries';
const { data: pendingEntries, isLoading } = usePendingTimeEntries();
const approveEntries = useApproveTimeEntries();
const rejectEntry = useRejectTimeEntry();
```

**Columns:**

- Checkbox (for bulk selection)
- Worker name
- Job name
- Date
- Clock In / Clock Out
- Hours (calculated)
- Location (GPS coordinates)
- Actions (Approve/Reject)

### 10. WorkerScheduleScreen (/src/pages/worker/WorkerScheduleScreen.tsx)

**Status:** Ready for full enhancement
**Required Changes:**

- Replace mock data with `useSchedule()` hook
- Add Tabs for filtering (Today, This Week, All Upcoming)
- Add Calendar view toggle (list vs calendar)
- Add pull-to-refresh functionality
- Add "Get Directions" button with Google Maps integration
- Add weather forecast for job location
- Group by date with date labels
- Show "TODAY" badge for current jobs

**Data Hook:**

```tsx
import { useSchedule, useTodaysSchedule } from '../hooks/useSchedule';
const { data: schedule, isLoading } = useTodaysSchedule();
```

**Schedule Item Display:**

- Date label (Today, Tomorrow, or formatted date)
- Job name and address
- Time range
- Status badge (upcoming, in-progress, completed)
- Action buttons (Get Directions, View Details)

### 11. AdminHomeScreen (/src/pages/admin/AdminHomeScreen.tsx)

**Status:** Partially complete (from previous session)
**Required Changes:**

- Verify all Quick Action buttons are wired correctly
- Ensure logout button works
- Update KPI cards to use real data from hooks
- Fix any remaining styling issues
- Add version indicator (already implemented)

## Implementation Priority

### High Priority (Core Business Functions)

1. **JobsScreen** - Core job management
2. **InvoicesScreen** - Revenue tracking
3. **AdminReviewScreen** - Time approval workflow
4. **WorkerScheduleScreen** - Worker daily operations

### Medium Priority (Important but can wait)

5. **EstimatesScreen** - Sales pipeline
6. **NoRoleScreen** - User onboarding fix
7. **ForgotPasswordScreen** - Password recovery fix

### Low Priority (Minor fixes)

8. **AdminHomeScreen** - Dashboard polish

## Key Patterns to Follow

### 1. Screen Structure

```tsx
import { AppLayout } from '../components/layout/AppLayout';
import { DataTable } from '../components/ui/data-table';
import { EmptyState } from '../components/ui/empty-state';
import { SearchBar } from '../components/ui/search-bar';
import { Skeleton } from '../components/ui/skeleton';
import { useDataHook } from '../hooks/useDataHook';

export function Screen() {
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useDataHook();

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header with title and action */}
        {/* Error alert */}
        {/* Search/Filters */}
        {/* Loading state with Skeletons */}
        {/* DataTable or content */}
        {/* Footer with stats */}
      </div>
    </AppLayout>
  );
}
```

### 2. DataTable Columns

```tsx
const columns: Column<DataType>[] = [
  {
    key: 'field',
    header: 'Column Name',
    sortable: true,
    render: (item) => <CustomCell />,
  },
];
```

### 3. Empty States

```tsx
<EmptyState
  icon={IconComponent}
  title="No items found"
  description="Helpful message here"
  action={{
    label: 'Create Item',
    onClick: () => navigate('/create'),
  }}
/>
```

### 4. Form Dialogs

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent } from '../components/ui/dialog';
import { createSchema } from '../schemas/schema';

const { register, handleSubmit } = useForm({
  resolver: zodResolver(createSchema),
});
```

### 5. Loading States

```tsx
{
  isLoading ? (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  ) : (
    <DataTable {...props} />
  );
}
```

## Testing Checklist

For each completed screen:

- [ ] Data loads correctly from Firestore
- [ ] Search/filtering works
- [ ] Sorting works on sortable columns
- [ ] Empty state displays when no data
- [ ] Loading state shows skeletons
- [ ] Error state shows alert
- [ ] CRUD operations work (if applicable)
- [ ] Company isolation enforced (can only see own company data)
- [ ] Role-based permissions enforced
- [ ] Mobile responsive
- [ ] Accessibility: keyboard navigation, ARIA labels
- [ ] No console errors
- [ ] Logo displays correctly
- [ ] Navigation works

## Next Steps

1. **Continue screen migration** in priority order (JobsScreen → InvoicesScreen → AdminReviewScreen)
2. **Add Dialog components** for CRUD operations (CreateJobDialog, RecordPaymentDialog, etc.)
3. **Implement PDF export** for invoices using jsPDF
4. **Add email sending** capability via Cloud Functions
5. **Implement calendar view** for WorkerScheduleScreen
6. **Add route definitions** in router.tsx for all new screens
7. **Run full test suite** to ensure no regressions
8. **Deploy to staging** for user acceptance testing

## Notes

- All data hooks include company-scoped security
- Invoice numbers auto-generate: INV-YYYYMM-XXXX
- Estimate numbers auto-generate: EST-YYYYMM-XXXX
- Overdue/Expired statuses are computed client-side
- Time entry approval requires admin/manager role
- All forms use Zod validation with react-hook-form
- Search bars have 300ms debounce
- DataTables support sorting and custom renderers

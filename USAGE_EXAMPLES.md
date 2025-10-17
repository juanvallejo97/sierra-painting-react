# Usage Examples - Enterprise Features

This guide provides practical examples of using the enterprise features integrated into Sierra Painting React.

## Table of Contents

- [Structured Logging](#structured-logging)
- [Error Handling](#error-handling)
- [Environment Configuration](#environment-configuration)
- [Feature Flags](#feature-flags)
- [Testing Utilities](#testing-utilities)
- [Pre-commit Hooks](#pre-commit-hooks)

---

## Structured Logging

The `logger` service provides structured logging with context tracking, levels, and analytics integration.

### Basic Usage

```typescript
import { logger } from '@/services/logger';

// Debug information (development only)
logger.debug('Component rendered', { componentName: 'InvoiceList' });

// General information
logger.info('Invoice created successfully', { invoiceId: 'inv-001' });

// Warnings
logger.warn('Large invoice amount detected', { amount: 50000 });

// Errors
try {
  await createInvoice(data);
} catch (error) {
  logger.error('Failed to create invoice', error as Error, {
    data: data.invoiceNumber,
  });
}

// Critical errors (always reported)
logger.critical('Database connection lost', error as Error);
```

### Context Tracking

Set user/company context once, and it's automatically included in all logs:

```typescript
// In auth-context.tsx (already integrated)
logger.setContext({
  userId: user.uid,
  companyId: user.companyId,
});

// Later, anywhere in your app:
logger.info('User created invoice');
// Output includes: { userId: 'xxx', companyId: 'yyy', message: 'User created invoice' }

// Clear context on logout
logger.clearContext(['userId', 'companyId']);
```

### Action Tracking

Track user actions for analytics:

```typescript
// Button clicks
const handleExportInvoice = () => {
  logger.trackAction('export_invoice', {
    format: 'pdf',
    invoiceId: invoice.id,
  });
  exportToPDF(invoice);
};

// Form submissions
const handleCreateJob = async (data: JobData) => {
  logger.trackAction('create_job', {
    jobType: data.type,
    estimatedDuration: data.duration,
  });
  await createJob(data);
};
```

### Performance Measurement

Track operation performance:

```typescript
const fetchInvoices = async () => {
  const startTime = Date.now();

  try {
    const invoices = await getDocs(invoicesQuery);
    logger.performance('fetch_invoices', startTime, {
      count: invoices.docs.length,
    });
    return invoices;
  } catch (error) {
    logger.error('Failed to fetch invoices', error as Error);
    throw error;
  }
};
```

---

## Error Handling

The `ErrorHandler` provides centralized error handling with user-friendly messages.

### Basic Usage

```typescript
import { ErrorHandler } from '@/services/errors';

try {
  await signInWithEmailAndPassword(auth, email, password);
} catch (error) {
  const { message, shouldReport } = ErrorHandler.handle(error);

  // Show user-friendly message
  toast.error(message);

  // Optionally send to monitoring service
  if (shouldReport) {
    Sentry.captureException(error);
  }
}
```

### Custom Business Errors

```typescript
import { BusinessError, ValidationError, NotFoundError } from '@/services/errors';

// Validation errors
if (!invoice.client) {
  throw new ValidationError('Client name is required');
}

// Business logic errors
if (invoice.status === 'paid') {
  throw new BusinessError('Cannot delete a paid invoice', 'INVOICE_PAID');
}

// Not found errors
const invoice = await getInvoice(id);
if (!invoice) {
  throw new NotFoundError('Invoice', id);
}
```

### Firebase Error Mapping

The error handler automatically maps Firebase error codes to user-friendly messages:

```typescript
// Firebase: auth/wrong-password
// User sees: "Invalid email or password. Please try again."

// Firebase: permission-denied
// User sees: "Access denied. Please check your account permissions."

// Firebase: auth/email-already-in-use
// User sees: "This email is already registered. Please sign in or use a different email."
```

---

## Environment Configuration

The `envConfig` provides type-safe environment variable access with validation.

### Basic Usage

```typescript
import { envConfig } from '@/lib/env-config';

// Access configuration
const apiKey = envConfig.firebaseApiKey;
const projectId = envConfig.firebaseProjectId;

// Check environment
if (envConfig.isDevelopment) {
  console.log('Running in development mode');
}

if (envConfig.isProduction) {
  // Production-only code
  initializeAnalytics();
}

// Use emulators
if (envConfig.useFirebaseEmulators) {
  connectAuthEmulator(auth, `http://${envConfig.firebaseEmulatorHost}:9099`);
}
```

### Environment Variables

Create a `.env` file with your configuration:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-ABC123

# Environment
VITE_ENVIRONMENT=development

# Emulators
VITE_USE_FIREBASE_EMULATORS=true
VITE_FIREBASE_EMULATOR_HOST=localhost

# Feature Flags
VITE_FEATURE_ESTIMATES=true
VITE_FEATURE_TIME_TRACKING=false
VITE_FEATURE_SCHEDULING=true
VITE_FEATURE_ANALYTICS=true

# Monitoring
VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=development

# Debug
VITE_DEBUG=false
VITE_LOG_LEVEL=info
```

---

## Feature Flags

Control feature availability using environment-based feature flags.

### Checking Feature Flags

```typescript
import { isFeatureEnabled } from '@/lib/env-config';

// Conditionally render features
const InvoiceScreen = () => {
  return (
    <div>
      <InvoiceList />

      {isFeatureEnabled('estimates') && (
        <EstimatesSection />
      )}

      {isFeatureEnabled('timeTracking') && (
        <TimeTrackingPanel />
      )}
    </div>
  );
};

// Conditionally enable functionality
const handleCreateJob = async (data: JobData) => {
  await createJob(data);

  if (isFeatureEnabled('scheduling')) {
    await scheduleJobAutomatically(data);
  }
};

// Guard routes
const AppRouter = () => (
  <Routes>
    <Route path="/invoices" element={<InvoicesScreen />} />
    {isFeatureEnabled('estimates') && (
      <Route path="/estimates" element={<EstimatesScreen />} />
    )}
  </Routes>
);
```

### Available Feature Flags

- `estimates` - Estimates module
- `timeTracking` - Time tracking functionality
- `scheduling` - Automatic job scheduling
- `analytics` - Analytics dashboard

---

## Testing Utilities

Comprehensive testing utilities for unit and integration tests.

### Test Data Factories

```typescript
import { testData } from '@/test/mocks/firebase';

describe('InvoiceComponent', () => {
  it('should display invoice details', () => {
    const invoice = testData.invoice({
      invoiceNumber: 'INV-202510-0001',
      client: 'Test Client',
      amount: 1500,
      status: 'sent',
    });

    render(<InvoiceCard invoice={invoice} />);
    expect(screen.getByText('INV-202510-0001')).toBeInTheDocument();
  });
});
```

### Mock Firebase Services

```typescript
import {
  createMockUser,
  createMockQuerySnapshot,
  createMockDocumentSnapshot,
} from '@/test/mocks/firebase';

describe('useInvoices', () => {
  it('should fetch invoices', async () => {
    const mockInvoices = [testData.invoice(), testData.invoice({ id: 'inv-002' })];

    const { getDocs } = await import('firebase/firestore');
    vi.mocked(getDocs).mockResolvedValue(createMockQuerySnapshot(mockInvoices) as any);

    const { result } = renderHook(() => useInvoices(), {
      wrapper: QueryWrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });
});
```

### Custom Test Utilities

```typescript
import { renderWithProviders } from '@/test/utils/test-utils';

describe('InvoiceScreen', () => {
  it('should render with all providers', () => {
    const { getByText } = renderWithProviders(<InvoiceScreen />);
    expect(getByText('Invoices')).toBeInTheDocument();
  });
});
```

### Testing Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateInvoice } from '@/hooks/useInvoices';

describe('useCreateInvoice', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it('should create invoice', async () => {
    const { addDoc } = await import('firebase/firestore');
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-inv' } as any);

    const { result } = renderHook(() => useCreateInvoice(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    result.current.mutate({
      client: 'Test Client',
      subtotal: 1000,
      taxRate: 10,
      dueDate: '2025-11-17',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(addDoc).toHaveBeenCalled();
  });
});
```

### Fixing Mock Interference

Always clear mocks between tests to avoid interference:

```typescript
describe('useRecordPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should record payment', async () => {
    const { getDoc, updateDoc } = await import('firebase/firestore');

    // Clear any previous mocks
    vi.mocked(getDoc).mockClear();
    vi.mocked(updateDoc).mockClear();

    // Set up fresh mocks
    vi.mocked(getDoc).mockResolvedValueOnce({...});
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);

    // Test logic...
  });
});
```

---

## Pre-commit Hooks

Husky and lint-staged automatically run quality checks before commits.

### What Runs Automatically

When you commit:

1. ESLint fixes auto-fixable issues
2. Prettier formats code
3. Only modified files are checked
4. Commit is blocked if issues remain

### Configuration

In `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,css,md}": ["prettier --write"]
  }
}
```

### Manual Validation

Run all quality checks manually:

```bash
# Full validation (type-check, lint, format, tests)
npm run validate

# Individual checks
npm run type-check
npm run lint
npm run format:check
npm test -- --run
```

### Bypassing Hooks (Not Recommended)

Only in emergencies:

```bash
git commit --no-verify -m "Emergency fix"
```

---

## Real-World Examples

### Example 1: Creating an Invoice with Full Logging

```typescript
const CreateInvoiceForm = () => {
  const createInvoice = useCreateInvoice();

  const handleSubmit = async (data: InvoiceData) => {
    const startTime = Date.now();

    try {
      logger.info('Creating invoice', {
        client: data.client,
        amount: data.subtotal
      });

      await createInvoice.mutateAsync(data);

      logger.performance('create_invoice', startTime);
      logger.trackAction('invoice_created', {
        amount: data.subtotal
      });

      toast.success('Invoice created successfully');
    } catch (error) {
      const { message } = ErrorHandler.handle(error);
      logger.error('Failed to create invoice', error as Error, {
        client: data.client
      });
      toast.error(message);
    }
  };

  return <InvoiceForm onSubmit={handleSubmit} />;
};
```

### Example 2: Conditional Feature Rendering

```typescript
const SettingsScreen = () => {
  return (
    <div>
      <h1>Settings</h1>

      <GeneralSettings />

      {isFeatureEnabled('analytics') && (
        <section>
          <h2>Analytics Settings</h2>
          <AnalyticsConfiguration />
        </section>
      )}

      {isFeatureEnabled('timeTracking') && (
        <section>
          <h2>Time Tracking</h2>
          <TimeTrackingSettings />
        </section>
      )}

      {envConfig.isDevelopment && (
        <section>
          <h2>Developer Tools</h2>
          <DeveloperSettings />
        </section>
      )}
    </div>
  );
};
```

### Example 3: Comprehensive Error Handling

```typescript
const JobScheduler = () => {
  const scheduleJob = useScheduleJob();

  const handleSchedule = async (jobId: string, date: Date) => {
    try {
      // Business validation
      if (!isFeatureEnabled('scheduling')) {
        throw new BusinessError(
          'Job scheduling is not enabled',
          'FEATURE_DISABLED'
        );
      }

      const job = await getJob(jobId);
      if (!job) {
        throw new NotFoundError('Job', jobId);
      }

      if (job.status === 'completed') {
        throw new BusinessError(
          'Cannot reschedule completed jobs',
          'JOB_COMPLETED'
        );
      }

      // Perform operation
      await scheduleJob.mutateAsync({ jobId, date });

      logger.trackAction('job_scheduled', { jobId, date });
      toast.success('Job scheduled successfully');

    } catch (error) {
      const { message, shouldReport } = ErrorHandler.handle(error);

      if (shouldReport) {
        logger.critical('Job scheduling failed', error as Error, {
          jobId,
          date
        });
      }

      toast.error(message);
    }
  };

  return <SchedulingCalendar onSchedule={handleSchedule} />;
};
```

---

## Best Practices

### Logging

1. Use appropriate log levels (debug for development, info for general, error for failures)
2. Include relevant context (IDs, user actions, amounts)
3. Avoid logging sensitive data (passwords, tokens, personal info)
4. Use `trackAction` for user analytics, not regular logs

### Error Handling

1. Always use `ErrorHandler.handle()` for user-facing errors
2. Create custom error classes for domain-specific errors
3. Log errors before showing to user
4. Provide actionable error messages

### Testing

1. Clear mocks between tests to avoid interference
2. Use test data factories for consistency
3. Test both success and error cases
4. Mock external dependencies (Firebase, APIs)

### Environment Configuration

1. Never commit `.env` files to version control
2. Use feature flags for gradual rollouts
3. Validate environment variables on startup
4. Document all environment variables in `.env.example`

---

## Troubleshooting

### Tests Failing with "toDate is not a function"

Use `createMockTimestamp()` for Firestore timestamps:

```typescript
import { createMockTimestamp } from '@/test/mocks/firebase';

const mockData = {
  createdAt: createMockTimestamp(),
  updatedAt: createMockTimestamp(),
};
```

### Mock Interference Between Tests

Clear mocks explicitly:

```typescript
beforeEach(() => {
  vi.clearAllMocks();
});

// Or in the test:
vi.mocked(getDoc).mockClear();
vi.mocked(getDoc).mockResolvedValueOnce({...});
```

### ESLint Errors in Tests

Test files can use `any` - this is configured in `eslint.config.js`:

```javascript
{
  files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
  },
}
```

### Pre-commit Hook Too Slow

Lint-staged only runs on changed files. If still slow:

```bash
# Temporarily disable
HUSKY=0 git commit -m "message"
```

---

## Next Steps

1. Review [INTEGRATION_COMPLETE.md](./INTEGRATION_COMPLETE.md) for integration details
2. Read [ENTERPRISE_PATCH_GUIDE.md](./ENTERPRISE_PATCH_GUIDE.md) for comprehensive guide
3. Check [CLAUDE.md](./CLAUDE.md) for architecture and development patterns
4. Run `npm run validate` to ensure everything works

---

**Questions or Issues?**

- Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Review test examples in `src/hooks/__tests__/`
- Consult service implementations in `src/services/`

# Sentry Error Tracking Integration

Complete guide for Sentry error tracking and monitoring in the Sierra Painting React application with comprehensive PII protection.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [PII Protection](#pii-protection)
- [Error Tracking](#error-tracking)
- [Performance Monitoring](#performance-monitoring)
- [Session Replay](#session-replay)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

Sentry provides real-time error tracking and performance monitoring with:

- ✅ **PII Scrubbing**: Automatic redaction of sensitive data
- ✅ **Error Boundary**: Catch React component errors
- ✅ **Performance Monitoring**: Track slow operations
- ✅ **Session Replay**: Debug user sessions (with privacy)
- ✅ **Source Maps**: Debug minified production code
- ✅ **Firebase Integration**: Track Firebase-specific errors

## Setup

### 1. Create Sentry Account

1. Go to [sentry.io](https://sentry.io) and create an account
2. Create a new project (select "React" as platform)
3. Copy your DSN (looks like: `https://abc123@o123.ingest.sentry.io/456`)

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Sentry Configuration
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
VITE_SENTRY_ENABLED=true  # Enable in production
VITE_APP_VERSION=1.0.0    # Your app version
```

**Production `.env.production`**:
```bash
VITE_SENTRY_DSN=https://your-production-dsn@sentry.io/project-id
VITE_SENTRY_ENABLED=true
VITE_APP_VERSION=1.0.0
```

**Development** (optional):
```bash
# Leave disabled in development
VITE_SENTRY_ENABLED=false
```

### 3. Verify Installation

Sentry is automatically initialized when the app starts.

Check console for:
```
Sentry initialized { environment: 'production', release: '1.0.0', ... }
```

### 4. Test Error Reporting

Trigger a test error:

```typescript
import { captureException } from '@/lib/sentry-config';

// Manually trigger error
captureException(new Error('Test error'));

// Or throw an error in a component
function TestButton() {
  const handleClick = () => {
    throw new Error('Test error from button');
  };

  return <button onClick={handleClick}>Trigger Error</button>;
}
```

Check your Sentry dashboard for the error report.

## PII Protection

### What Gets Scrubbed

The PII scrubber automatically removes:

**Identity Information**:
- Email addresses
- Names (first, last, display, user)
- Usernames

**Contact Information**:
- Phone numbers (all formats)
- Addresses, cities, zip codes
- Street addresses

**Authentication**:
- Passwords
- Tokens (access, refresh, API keys)
- Session IDs

**Financial**:
- Credit card numbers
- CVV/CVC codes
- SSN
- Bank account numbers

**Identifiers**:
- User IDs (anonymized hash sent)
- Company IDs (anonymized hash sent)
- Firebase UIDs

### How It Works

#### Automatic Field-Based Scrubbing

Fields matching PII patterns are automatically redacted:

```typescript
// Before
{
  user: {
    email: 'john@example.com',
    name: 'John Doe',
    phone: '555-123-4567',
    role: 'admin'
  }
}

// After (sent to Sentry)
{
  user: {
    email: '[REDACTED]',
    name: '[REDACTED]',
    phone: '[REDACTED]',
    role: 'admin'  // Safe field
  }
}
```

#### Pattern-Based Scrubbing

Values matching PII patterns are redacted:

```typescript
// Before
const message = 'User john@example.com failed to login';

// After
const message = 'User [REDACTED] failed to login';
```

#### User Context Anonymization

```typescript
// Your code
setSentryUser({
  uid: 'firebase-uid-abc123',
  email: 'user@example.com',
  role: 'admin',
  companyId: 'company-xyz'
});

// Sent to Sentry
{
  id: 'anon_7f8a9',  // Hashed UID
  // role sent as tag (non-PII)
}
```

### Manual PII Scrubbing

For custom scenarios:

```typescript
import { scrubPII } from '@/lib/pii-scrubber';

const sensitiveData = {
  user: { email: 'user@example.com' },
  payment: { card: '4111-1111-1111-1111' },
};

const scrubbed = scrubPII(sensitiveData);
// All PII removed
```

### Testing PII Scrubbing

```typescript
import { testPIIScrubbing } from '@/lib/pii-scrubber';

// Run in console
testPIIScrubbing();
// Logs original and scrubbed data
```

## Error Tracking

### Automatic Error Capture

Errors are automatically captured by:

1. **Error Boundary**: Catches React component errors
2. **Global Handlers**: Catches unhandled promise rejections
3. **Firebase Errors**: Special handling for Firebase errors

### Manual Error Capture

#### Capture Exception

```typescript
import { captureException } from '@/lib/sentry-config';

try {
  await riskyOperation();
} catch (error) {
  captureException(error, {
    tags: {
      operation: 'user-creation',
      critical: 'true',
    },
    extra: {
      attemptCount: 3,
      lastAttempt: Date.now(),
    },
    level: 'error',
  });
}
```

#### Capture Message

```typescript
import { captureMessage } from '@/lib/sentry-config';

captureMessage('Payment processed successfully', 'info', {
  tags: {
    payment: 'success',
    amount: '1000',
  },
});
```

### Add Breadcrumbs

Track user actions leading to errors:

```typescript
import { addSentryBreadcrumb } from '@/lib/sentry-config';

function JobsList() {
  const handleJobClick = (jobId: string) => {
    addSentryBreadcrumb(
      'navigation',
      'User clicked job',
      { jobId },
      'info'
    );

    navigate(`/jobs/${jobId}`);
  };

  // ... rest of component
}
```

### Set User Context

```typescript
import { setSentryUser, clearSentryUser } from '@/lib/sentry-config';

// On login
const handleLogin = async (user) => {
  await signIn(email, password);

  setSentryUser({
    uid: user.uid,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
  });
  // PII automatically scrubbed before sending
};

// On logout
const handleLogout = async () => {
  await signOut();
  clearSentryUser();
};
```

## Performance Monitoring

### Automatic Performance Tracking

Sentry automatically tracks:

- Page load times
- Route transitions
- API calls to Firebase
- Component render times

### Manual Performance Tracking

```typescript
import { startTransaction } from '@/lib/sentry-config';

async function expensiveOperation() {
  const transaction = startTransaction(
    'expensive-operation',
    'task'
  );

  try {
    // Do work
    await processData();

    transaction?.setStatus('ok');
  } catch (error) {
    transaction?.setStatus('internal_error');
    throw error;
  } finally {
    transaction?.finish();
  }
}
```

### Component Performance

```typescript
import { SentryProfiler } from '@/lib/sentry-config';

function MyComponent() {
  return (
    <SentryProfiler name="MyComponent">
      {/* Component content */}
    </SentryProfiler>
  );
}
```

## Session Replay

### Configuration

Session Replay is enabled by default with privacy-first settings:

- ✅ **All text masked**: User data not visible in replays
- ✅ **All media blocked**: Images and videos not recorded
- ✅ **Network requests filtered**: Only Firebase requests included

### Viewing Replays

1. Go to Sentry dashboard
2. Click on an error
3. If a replay is available, click "Replay" tab
4. Watch what the user did before the error

### Disable for Specific Components

```typescript
<div data-sentry-mask>
  {/* This content will be masked in replays */}
</div>

<div data-sentry-block>
  {/* This content will not be recorded */}
</div>
```

## Best Practices

### 1. Use Error Boundaries

Wrap components with error boundaries:

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        {/* Your app */}
      </Router>
    </ErrorBoundary>
  );
}
```

### 2. Add Context to Errors

```typescript
// ✅ Good - provides context
captureException(error, {
  tags: {
    feature: 'job-creation',
    userRole: user.role,
  },
  extra: {
    jobData: scrubPII(jobData),
    attemptNumber: 3,
  },
});

// ❌ Bad - no context
captureException(error);
```

### 3. Use Appropriate Severity Levels

```typescript
// Critical errors
captureException(error, { level: 'fatal' });

// Expected errors
captureException(error, { level: 'warning' });

// Info messages
captureMessage('Operation completed', 'info');

// Debug messages
captureMessage('Debug info', 'debug');
```

### 4. Filter Noise

Don't report expected errors:

```typescript
try {
  await fetchData();
} catch (error) {
  // Don't report quota errors
  if (error.code === 'quota-exceeded') {
    showUserMessage('Rate limit exceeded');
    return;
  }

  // Report unexpected errors
  captureException(error);
}
```

### 5. Add Breadcrumbs for Context

```typescript
// Track user flow
addSentryBreadcrumb('user', 'Clicked create job button');
addSentryBreadcrumb('form', 'Filled job form');
addSentryBreadcrumb('api', 'Submitted job creation');
// If error occurs, breadcrumbs show what led to it
```

### 6. Test Error Handling

```typescript
// Test error boundary
function TestErrorButton() {
  const triggerError = () => {
    throw new Error('Test error');
  };

  return <button onClick={triggerError}>Trigger Error</button>;
}

// Verify error appears in Sentry dashboard
```

## Troubleshooting

### Errors Not Appearing in Sentry

**Check DSN Configuration**:
```typescript
// In browser console
console.log(import.meta.env.VITE_SENTRY_DSN);
```

**Verify Sentry is Initialized**:
```typescript
import { isSentryEnabled } from '@/lib/sentry-config';

console.log('Sentry enabled:', isSentryEnabled());
```

**Check Network Tab**:
- Look for requests to `sentry.io`
- Check for errors in network requests

### Source Maps Not Working

**Vite Configuration** (already configured):
```typescript
// vite.config.ts
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig({
  plugins: [
    sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: 'your-org',
      project: 'your-project',
    }),
  ],
  build: {
    sourcemap: true,
  },
});
```

**Generate Auth Token**:
1. Go to Sentry → Settings → Auth Tokens
2. Create new token with "project:releases" scope
3. Add to `.env`:
   ```
   SENTRY_AUTH_TOKEN=your-token-here
   ```

### PII Still Leaking

**Test PII Scrubbing**:
```typescript
import { testPIIScrubbing } from '@/lib/pii-scrubber';

testPIIScrubbing();
// Check console output
```

**Add Custom PII Fields**:
```typescript
// In pii-scrubber.ts
const PII_FIELD_PATTERNS = [
  ...existing,
  'customFieldName',
  'anotherSensitiveField',
];
```

### Too Many Errors

**Increase Sample Rate** (to reduce volume):
```typescript
// In sentry-config.ts
Sentry.init({
  tracesSampleRate: 0.05,  // 5% instead of 10%
  replaysSessionSampleRate: 0.05,
});
```

**Filter Errors**:
```typescript
beforeSend: (event) => {
  // Drop non-critical errors
  if (event.level === 'warning') {
    return null;
  }
  return scrubEvent(event);
}
```

## Monitoring Best Practices

### 1. Set Up Alerts

In Sentry dashboard:
- Alert on new issues
- Alert on regression (fixed issues returning)
- Alert on spike in error rate
- Set up Slack/email notifications

### 2. Review Errors Regularly

- Daily: Check for new critical errors
- Weekly: Review error trends
- Monthly: Clean up resolved issues

### 3. Track Error Budget

Set error rate targets:
- < 1% error rate for critical flows
- < 5% error rate overall
- 99.9% uptime SLA

### 4. Use Releases

Tag releases for better tracking:

```bash
# In CI/CD
VITE_APP_VERSION=$(git rev-parse --short HEAD)
```

### 5. Performance Budgets

Set performance targets:
- Page load < 3s
- API calls < 500ms
- Component render < 16ms

## Integration with CI/CD

### GitHub Actions

```yaml
- name: Upload Source Maps to Sentry
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
  run: |
    npm run build
    # Source maps automatically uploaded by Vite plugin
```

### Environment-Specific Configuration

**Staging**:
```bash
VITE_SENTRY_DSN=staging-dsn
VITE_SENTRY_ENABLED=true
VITE_APP_VERSION=staging-${GIT_SHA}
```

**Production**:
```bash
VITE_SENTRY_DSN=production-dsn
VITE_SENTRY_ENABLED=true
VITE_APP_VERSION=${GIT_SHA}
```

## Additional Resources

- [Sentry React Docs](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Performance](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)
- [Source Maps](https://docs.sentry.io/platforms/javascript/sourcemaps/)

## Support

For issues:
- Check Sentry dashboard for error details
- Review breadcrumbs for user flow
- Check source maps are uploaded
- Verify PII scrubbing is working
- Review network tab for Sentry requests

---

**Security Note**: Never commit Sentry DSN or auth tokens to version control. Always use environment variables.

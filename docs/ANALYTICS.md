# Analytics & Monitoring Guide

**Date**: 2025-10-17
**Status**: ✅ Implemented
**Version**: 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Firebase Analytics Setup](#firebase-analytics-setup)
4. [Web Vitals Tracking](#web-vitals-tracking)
5. [Usage Guide](#usage-guide)
6. [Event Taxonomy](#event-taxonomy)
7. [Best Practices](#best-practices)
8. [Privacy & Compliance](#privacy--compliance)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The analytics system provides comprehensive tracking for:

- **📊 Business Metrics**: Job creation, invoice payments, time tracking
- **⚡ Performance Monitoring**: Core Web Vitals, API response times, component render times
- **👤 User Behavior**: Page views, feature usage, conversion funnels
- **🐛 Error Tracking**: Integration with Sentry for error context
- **🔒 Privacy-First**: PII scrubbing and anonymization built-in

### Key Features

✅ **Real User Monitoring (RUM)** - Track actual user performance
✅ **Firebase Analytics Integration** - Unlimited free event tracking
✅ **Sentry Integration** - Error context with performance data
✅ **PII-Safe** - Automatic anonymization of sensitive data
✅ **Type-Safe** - Full TypeScript support
✅ **Development Mode** - Console logging without sending events

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         main.tsx                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │ initAnalytics()       - Firebase Analytics         │    │
│  │ initWebVitals()       - Core Web Vitals            │    │
│  │ trackPageLoad()       - Navigation Timing API      │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Analytics Layer                          │
│                                                              │
│  ┌──────────────────┐  ┌─────────────────┐  ┌────────────┐│
│  │ analytics-config │  │   web-vitals    │  │   custom   ││
│  │      .ts         │  │      .ts        │  │  events.ts ││
│  │                  │  │                 │  │            ││
│  │ - trackEvent()   │  │ - initWebVitals()│ │ - trackJob*()││
│  │ - setUser()      │  │ - trackAPI()    │  │ - trackInvoice*()││
│  │ - trackPage()    │  │ - trackRender() │  │ - trackEmployee*()││
│  └──────────────────┘  └─────────────────┘  └────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴────────────────┐
              ▼                                ▼
┌──────────────────────────┐    ┌────────────────────────────┐
│   Firebase Analytics     │    │         Sentry             │
│                          │    │                            │
│ - Unlimited events       │    │ - Error context            │
│ - User properties        │    │ - Performance breadcrumbs  │
│ - Conversion tracking    │    │ - Session replay           │
└──────────────────────────┘    └────────────────────────────┘
```

---

## Firebase Analytics Setup

### 1. Environment Configuration

Analytics is controlled by environment variables:

```bash
# .env.production
VITE_ANALYTICS_ENABLED=true

# .env.development (optional - disabled by default)
VITE_ANALYTICS_ENABLED=true  # Enable in dev for testing
```

### 2. Firebase Console Setup

1. Navigate to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Analytics** > **Dashboard**
4. Enable Google Analytics for your Firebase project
5. Create a Google Analytics 4 property (if not exists)

### 3. Verification

Check if analytics is working:

```typescript
import { isAnalyticsEnabled } from './lib/analytics/analytics-config';

console.log('Analytics enabled:', isAnalyticsEnabled());
```

In development, events are logged to console:
```
[Analytics] Event: page_view { page_path: '/jobs', page_title: 'Jobs' }
```

---

## Web Vitals Tracking

### Core Web Vitals

We track all Core Web Vitals metrics:

| Metric | Description | Good | Needs Improvement | Poor |
|--------|-------------|------|-------------------|------|
| **LCP** | Largest Contentful Paint | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| **FID** | First Input Delay | ≤ 100ms | ≤ 300ms | > 300ms |
| **INP** | Interaction to Next Paint | ≤ 200ms | ≤ 500ms | > 500ms |
| **CLS** | Cumulative Layout Shift | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| **FCP** | First Contentful Paint | ≤ 1.8s | ≤ 3.0s | > 3.0s |
| **TTFB** | Time to First Byte | ≤ 800ms | ≤ 1.8s | > 1.8s |

### Automatic Tracking

Web Vitals are tracked automatically on page load:

```typescript
// main.tsx
import { initWebVitals } from './lib/analytics/web-vitals';
initWebVitals(); // Automatically tracks all metrics
```

### Poor Performance Alerts

Poor metrics (rating: 'poor') are sent to Sentry as warnings:

```typescript
// Automatically sent when LCP > 4s
captureMessage('Poor LCP: 5.23s', 'warning', {
  tags: { metric: 'LCP', rating: 'poor' },
  extra: { value: 5230, delta: 500, path: '/jobs' }
});
```

### Custom Performance Tracking

```typescript
import { trackPerformanceMetric, trackAPIRequest, trackComponentRender } from './lib/analytics/web-vitals';

// Track custom metric
trackPerformanceMetric('data_processing_time', 1234, {
  record_count: 100,
  data_type: 'jobs',
});

// Track API request
trackAPIRequest('/api/jobs', 450, 200);

// Track component render time
trackComponentRender('JobsScreen', 120);
```

---

## Usage Guide

### 1. Basic Event Tracking

```typescript
import { useAnalytics } from '../hooks/useAnalytics';

function MyComponent() {
  const analytics = useAnalytics();

  const handleClick = () => {
    analytics.trackButtonClick('create_job', 'jobs_screen');
  };

  return <button onClick={handleClick}>Create Job</button>;
}
```

### 2. Page View Tracking

Page views are automatically tracked when routes change:

```typescript
// Automatic - no code needed
// useAnalytics() hook tracks page views via useLocation()
```

Manual tracking:

```typescript
const analytics = useAnalytics();
analytics.trackPageView('/custom-page', 'Custom Page Title');
```

### 3. Business Event Tracking

```typescript
import { useAnalytics } from '../hooks/useAnalytics';

function JobForm() {
  const analytics = useAnalytics();

  const handleSubmit = async (data: JobFormData) => {
    try {
      const job = await createJob(data);

      // Track successful job creation
      analytics.trackJobCreated(job.id, job.status);
      analytics.trackFormSuccess();
    } catch (error) {
      analytics.trackFormFailure(error.message);
    }
  };
}
```

### 4. Form Analytics

```typescript
import { useFormAnalytics } from '../hooks/useAnalytics';

function CreateJobDialog() {
  const { trackFieldFocus, trackFieldBlur, trackFormError, trackFormSuccess } =
    useFormAnalytics('create_job_form');

  return (
    <form>
      <input
        name="jobName"
        onFocus={() => trackFieldFocus('job_name')}
        onBlur={(e) => trackFieldBlur('job_name', !!e.target.value)}
      />
    </form>
  );
}
```

### 5. Table Analytics

```typescript
import { useTableAnalytics } from '../hooks/useAnalytics';

function JobsTable() {
  const { trackSort, trackFilter, trackPagination } = useTableAnalytics('jobs_table');

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    trackSort(column, direction);
    // ... perform sort
  };

  return <DataTable onSort={handleSort} />;
}
```

### 6. Performance Tracking

```typescript
import { usePerformanceAnalytics } from '../hooks/useAnalytics';

function DataLoader() {
  const { startTimer, endTimer } = usePerformanceAnalytics();

  const loadData = async () => {
    const timerId = startTimer('load_jobs');

    try {
      const jobs = await fetchJobs();
      endTimer(timerId, { record_count: jobs.length });
    } catch (error) {
      endTimer(timerId, { error: 'true' });
    }
  };
}
```

---

## Event Taxonomy

### Standard Events

| Category | Event Name | Parameters |
|----------|-----------|------------|
| **Authentication** | `login` | `method` |
| | `logout` | - |
| | `sign_up` | `method` |
| **Navigation** | `page_view` | `page_path`, `page_title`, `page_location` |
| **UI Interaction** | `button_click` | `button_name`, `location` |
| | `form_submit` | `form_name`, `success` |
| | `dialog_open` | `dialog_name` |
| | `dialog_close` | `dialog_name`, `action` |
| | `tab_change` | `tab_name` |

### Business Events

| Category | Event Name | Parameters |
|----------|-----------|------------|
| **Jobs** | `job_created` | `job_id`, `status` |
| | `job_updated` | `job_id`, `old_status`, `new_status` |
| | `job_completed` | `job_id`, `duration` |
| | `job_list_view` | `has_status_filter`, `has_date_filter` |
| | `job_detail_view` | `job_id`, `job_status` |
| **Invoices** | `invoice_created` | `invoice_id`, `amount` |
| | `invoice_paid` | `invoice_id`, `amount`, `payment_method` |
| | `invoice_download` | `invoice_id`, `format` |
| | `invoice_email` | `invoice_id`, `recipient_type` |
| **Estimates** | `estimate_created` | `estimate_id`, `amount` |
| | `estimate_accepted` | `estimate_id` |
| | `estimate_conversion` | `estimate_id`, `estimate_amount`, `job_id` |
| **Time Tracking** | `time_entry_created` | `entry_id`, `hours` |
| | `time_entry_approved` | `entry_id` |
| | `time_entry_bulk_approval` | `entry_count`, `total_hours` |

### Performance Events

| Category | Event Name | Parameters |
|----------|-----------|------------|
| **Web Vitals** | `web_vitals` | `metric_name`, `metric_value`, `metric_rating`, `page_path` |
| **API** | `api_request` | `endpoint`, `duration`, `status`, `status_type` |
| **Component** | `component_render` | `component`, `duration` |
| **Custom** | `custom_metric` | `metric_name`, `metric_value` |

---

## Best Practices

### 1. Event Naming

✅ **DO**: Use snake_case for event names
```typescript
trackEvent('job_created');
```

❌ **DON'T**: Use camelCase or spaces
```typescript
trackEvent('jobCreated');
trackEvent('job created');
```

### 2. Parameter Naming

✅ **DO**: Use descriptive, lowercase parameter names
```typescript
trackEvent('job_created', {
  job_id: 'job-123',
  job_status: 'pending',
});
```

❌ **DON'T**: Use vague or mixed-case names
```typescript
trackEvent('job_created', {
  id: 'job-123',
  Status: 'pending',
});
```

### 3. Avoid PII

✅ **DO**: Anonymize or hash sensitive data
```typescript
import { getSafeUserId } from './lib/pii-scrubber';

const anonymizedId = getSafeUserId(user);
trackEvent('user_action', { user_id: anonymizedId });
```

❌ **DON'T**: Send raw PII
```typescript
trackEvent('user_action', {
  email: 'user@example.com',  // ❌ PII
  phone: '555-1234',           // ❌ PII
});
```

### 4. Event Volume

✅ **DO**: Track meaningful actions
```typescript
analytics.trackJobCreated(jobId, status);
analytics.trackInvoicePaid(invoiceId, amount);
```

❌ **DON'T**: Track every keystroke or mouse move
```typescript
// ❌ Too noisy
input.addEventListener('keypress', () => analytics.trackEvent('keypress'));
```

### 5. Performance Impact

✅ **DO**: Use analytics hooks (memoized)
```typescript
const analytics = useAnalytics();
```

❌ **DON'T**: Import functions directly in render
```typescript
// ❌ Creates new function references on every render
import { trackEvent } from './lib/analytics';
```

---

## Privacy & Compliance

### PII Scrubbing

All analytics data is automatically scrubbed of PII:

```typescript
// analytics-config.ts
import { getSafeUserId } from '../pii-scrubber';

export function setAnalyticsUser(user: User): void {
  const anonymizedId = getSafeUserId(user);
  setUserId(analytics, anonymizedId);  // Uses hash instead of raw UID
}
```

### User Consent

Analytics respects user consent preferences:

```typescript
// Only enable in production or when explicitly enabled
if (!envConfig.isProduction && !import.meta.env.VITE_ANALYTICS_ENABLED) {
  console.log('[Analytics] Disabled in development');
  return;
}
```

### Data Retention

Firebase Analytics default retention:
- **Event data**: 2 months (extendable to 14 months)
- **User properties**: Indefinitely (until user deletion)

Configure in Firebase Console:
1. Go to **Analytics** > **Data Settings**
2. Set **Event data retention** to desired period
3. Enable **Reset data on new activity** if needed

### GDPR Compliance

To delete user analytics data:

```typescript
// When user requests data deletion
import { clearAnalyticsUser } from './lib/analytics/analytics-config';

async function handleUserDeletion(userId: string) {
  // Clear analytics user ID
  clearAnalyticsUser();

  // Request data deletion from Firebase
  // (Must be done via Firebase Admin SDK or Firebase Console)
}
```

---

## Troubleshooting

### Analytics Not Working

**Problem**: Events not appearing in Firebase Console

**Solutions**:

1. **Check if analytics is enabled**:
   ```typescript
   import { isAnalyticsEnabled } from './lib/analytics/analytics-config';
   console.log('Enabled:', isAnalyticsEnabled());
   ```

2. **Check browser support**:
   ```typescript
   import { isSupported } from 'firebase/analytics';
   const supported = await isSupported();
   console.log('Supported:', supported);
   ```

3. **Check Firebase config**:
   - Verify `.env` has correct Firebase credentials
   - Verify `measurementId` is present in Firebase config
   - Check Firebase Console for Analytics enablement

4. **Wait for data processing**:
   - Firebase Analytics has 24-48 hour delay for reporting
   - Use **DebugView** in Firebase Console for real-time debugging

### Using DebugView

Enable debug mode to see events in real-time:

1. **In Chrome DevTools Console**:
   ```javascript
   window.localStorage.setItem('debug_mode', 'true');
   ```

2. **Reload the page**

3. **Go to Firebase Console** > **Analytics** > **DebugView**

4. **See events in real-time** (with 1-2 second delay)

### Events Not Tracked in Development

**Problem**: Events not logged to console in development

**Solution**: Check DEV mode logging:

```typescript
// analytics-config.ts
if (import.meta.env.DEV) {
  console.log(`[Analytics] Event: ${eventName}`, eventParams);
}
```

If still not working, explicitly enable:
```bash
# .env.development
VITE_ANALYTICS_ENABLED=true
```

### Web Vitals Not Appearing

**Problem**: Web Vitals events missing

**Solutions**:

1. **Check browser compatibility**:
   - Web Vitals require modern browsers (Chrome 77+, Firefox 64+, Safari 13.1+)
   - Not supported in IE11

2. **Check initialization**:
   ```typescript
   // main.tsx should have:
   import { initWebVitals } from './lib/analytics/web-vitals';
   initWebVitals();
   ```

3. **Check for console errors**:
   ```javascript
   // Should see:
   [Web Vitals] Tracking initialized
   [Web Vitals] LCP: { value: 2300, rating: 'good', delta: 2300 }
   ```

---

## Firebase Console Dashboards

### 1. Events Dashboard

**Path**: Analytics > Events

**What to Monitor**:
- Most popular events (page_view, job_created, etc.)
- Event count trends over time
- Event parameters distribution

### 2. User Properties

**Path**: Analytics > User Properties

**Configured Properties**:
- `user_role`: admin, manager, worker
- `has_company`: true/false

### 3. Conversion Events

**Path**: Analytics > Conversions

**Key Conversions**:
- `job_completed`
- `invoice_paid`
- `estimate_accepted`

To mark an event as conversion:
1. Go to **Events** tab
2. Click **Mark as conversion** next to event name

### 4. Custom Reports

Create custom reports for business metrics:

1. Go to **Analytics** > **Custom Reports**
2. Click **Create Report**
3. Add dimensions: `page_path`, `user_role`, `job_status`
4. Add metrics: `event_count`, `total_users`, `sessions`

---

## Performance Targets

Based on [web.dev](https://web.dev/vitals/) recommendations:

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Lighthouse Performance** | > 90 | TBD | ⏳ |
| **LCP** | < 2.5s | TBD | ⏳ |
| **FID** | < 100ms | TBD | ⏳ |
| **INP** | < 200ms | TBD | ⏳ |
| **CLS** | < 0.1 | TBD | ⏳ |
| **FCP** | < 1.8s | TBD | ⏳ |
| **TTFB** | < 800ms | TBD | ⏳ |

Run Lighthouse audit:
```bash
npm run build
npx lighthouse http://localhost:5173 --view
```

---

## Integration with Sentry

Analytics and Sentry work together to provide complete observability:

```typescript
// Poor performance metrics sent to Sentry
if (rating === 'poor') {
  captureMessage(`Poor ${name}: ${value.toFixed(2)}`, 'warning', {
    tags: { metric: name, rating },
    extra: { value, delta, path: window.location.pathname },
  });
}

// Slow API requests sent to Sentry
if (duration > 2000) {
  captureMessage(`Slow API request: ${endpoint} (${duration}ms)`, 'warning', {
    tags: { type: 'slow_api', endpoint },
    extra: { duration, status },
  });
}
```

View in Sentry:
1. Go to **Issues** > **Filter by level: warning**
2. Look for issues tagged with `metric` or `type: slow_api`

---

## Resources

- **Firebase Analytics Docs**: https://firebase.google.com/docs/analytics
- **Web Vitals**: https://web.dev/vitals/
- **Google Analytics 4**: https://support.google.com/analytics/answer/10089681
- **Sentry Performance**: https://docs.sentry.io/product/performance/

---

**Last Updated**: 2025-10-17
**Maintained By**: Development Team
**Questions?**: See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

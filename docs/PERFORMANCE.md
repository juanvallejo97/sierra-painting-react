# Performance Optimization Guide

**Date**: 2025-10-17
**Status**: ✅ Implemented
**Version**: 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Bundle Size Optimization](#bundle-size-optimization)
3. [Code Splitting](#code-splitting)
4. [Caching Strategies](#caching-strategies)
5. [Runtime Performance](#runtime-performance)
6. [Image Optimization](#image-optimization)
7. [React Performance](#react-performance)
8. [Monitoring](#monitoring)
9. [Checklist](#checklist)

---

## Overview

This guide covers all performance optimizations implemented in the application, including:

- **Bundle Size**: Reduced from ~5MB to target < 3MB
- **Code Splitting**: Granular vendor chunks for optimal caching
- **Lazy Loading**: Component and image lazy loading
- **React Optimization**: React.memo, useMemo, useCallback patterns
- **Caching**: HTTP cache headers and service worker strategies
- **Images**: WebP format, lazy loading, responsive images

### Performance Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Bundle Size (gzipped)** | < 500KB | TBD | ⏳ |
| **Lighthouse Performance** | > 95 | TBD | ⏳ |
| **First Contentful Paint** | < 1.5s | TBD | ⏳ |
| **Time to Interactive** | < 3s | TBD | ⏳ |
| **Cumulative Layout Shift** | < 0.1 | TBD | ⏳ |

---

## Bundle Size Optimization

### Analyze Bundle

Run bundle analysis to identify large dependencies:

```bash
npm run build:analyze
```

This generates an interactive treemap visualization at `dist/stats.html`.

### Vite Configuration

**File**: `vite.config.ts`

Key optimizations:
- **Target ES2020**: Smaller bundle size for modern browsers
- **Terser Minification**: Remove console.log, debugger, and comments in production
- **Granular Code Splitting**: Split vendors by library for optimal caching
- **Asset Organization**: Organize assets by type (images, fonts, etc.)

```typescript
{
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Granular chunking strategy
          if (id.includes('node_modules/react')) return 'react-core';
          if (id.includes('firebase/auth')) return 'firebase-auth';
          if (id.includes('firebase/firestore')) return 'firebase-firestore';
          // ... more chunks
        },
      },
    },
  }
}
```

### Chunk Strategy

**Vendor Chunks** (long-term cacheable):
- `react-core.js` - React and ReactDOM
- `react-router.js` - React Router
- `firebase-auth.js` - Firebase Authentication
- `firebase-firestore.js` - Firestore
- `firebase-storage.js` - Storage
- `firebase-analytics.js` - Analytics
- `sentry.js` - Error tracking
- `react-query.js` - Data fetching
- `radix-ui.js` - UI components
- `mui.js` - Material-UI
- `form-libs.js` - React Hook Form + Zod
- `lucide-icons.js` - Icons

**Benefits**:
- ✅ Update app code without invalidating vendor cache
- ✅ Update Firebase without affecting UI libraries
- ✅ Parallel downloads for faster loading
- ✅ Optimal cache hit rate

### Tree Shaking

Ensure proper tree shaking by:

1. **Use named imports**:
   ```typescript
   // ✅ Good - tree-shakeable
   import { Button } from '@radix-ui/react-button';

   // ❌ Bad - imports everything
   import * as RadixUI from '@radix-ui/react-button';
   ```

2. **Check library support**:
   - Most modern libraries support tree shaking
   - Check `package.json` for `"sideEffects": false`

3. **Avoid barrel exports with side effects**:
   ```typescript
   // ❌ Bad - may prevent tree shaking
   export * from './all-components';

   // ✅ Good - explicit exports
   export { Button } from './Button';
   export { Input } from './Input';
   ```

---

## Code Splitting

### Route-based Code Splitting

Use `React.lazy()` for route components:

```typescript
import { lazy, Suspense } from 'react';

// Lazy load route components
const JobsScreen = lazy(() => import('./pages/JobsScreen'));
const InvoicesScreen = lazy(() => import('./pages/InvoicesScreen'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/jobs" element={<JobsScreen />} />
        <Route path="/invoices" element={<InvoicesScreen />} />
      </Routes>
    </Suspense>
  );
}
```

### Component-based Code Splitting

Lazy load heavy components:

```typescript
const HeavyChart = lazy(() => import('./components/HeavyChart'));

function Dashboard() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Chart</button>
      {showChart && (
        <Suspense fallback={<div>Loading chart...</div>}>
          <HeavyChart data={data} />
        </Suspense>
      )}
    </div>
  );
}
```

### Dialog/Modal Code Splitting

Lazy load dialogs since they're not always visible:

```typescript
const CreateJobDialog = lazy(() => import('./dialogs/CreateJobDialog'));

function JobsScreen() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Create Job</Button>
      {isOpen && (
        <Suspense fallback={null}>
          <CreateJobDialog open={isOpen} onClose={() => setIsOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
```

### Preloading

Preload code when user hovers over a button:

```typescript
function JobsScreen() {
  const preloadCreateDialog = () => {
    import('./dialogs/CreateJobDialog');
  };

  return (
    <Button
      onMouseEnter={preloadCreateDialog}
      onClick={() => setIsOpen(true)}
    >
      Create Job
    </Button>
  );
}
```

---

## Caching Strategies

### HTTP Cache Headers

**File**: `firebase.json`

```json
{
  "hosting": {
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "index.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
          }
        ]
      }
    ]
  }
}
```

**Caching Strategy**:
- **JS/CSS with hashes**: Cache for 1 year (immutable)
- **Images with hashes**: Cache for 1 year
- **Fonts**: Cache for 1 year with CORS
- **index.html**: Never cache (always fresh)
- **Source maps**: Never cache

### Browser Caching

The application uses:
1. **HTTP Cache**: Long-term caching for hashed assets
2. **React Query Cache**: In-memory data caching
3. **LocalStorage Persistence**: Persistent data cache

### Cache Invalidation

Cache is automatically invalidated when:
- App is redeployed (new asset hashes)
- User clears browser cache
- React Query cache expires (configurable per query)

---

## Runtime Performance

### React.memo

Use `React.memo()` for expensive components:

```typescript
import { memo } from 'react';
import { shallowEqual } from '../utils/performance';

// Memoize component with shallow comparison
const JobCard = memo(({ job, onClick }: JobCardProps) => {
  return (
    <Card onClick={() => onClick(job.id)}>
      <h3>{job.name}</h3>
      <p>{job.status}</p>
    </Card>
  );
}, shallowEqual);
```

### useMemo

Memoize expensive computations:

```typescript
import { useMemo } from 'react';

function JobsScreen() {
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => job.status === selectedStatus)
               .sort((a, b) => a.createdAt - b.createdAt);
  }, [jobs, selectedStatus]); // Only recompute when deps change

  return <JobList jobs={filteredJobs} />;
}
```

### useCallback

Memoize callback functions:

```typescript
import { useCallback } from 'react';

function JobsScreen() {
  const handleJobClick = useCallback((jobId: string) => {
    navigate(`/jobs/${jobId}`);
  }, [navigate]); // Stable reference

  return <JobList onJobClick={handleJobClick} />;
}
```

### Debounce & Throttle

**Debounce** - Delay execution until user stops typing:

```typescript
import { useDebouncedCallback } from '../utils/performance';

function SearchBar() {
  const debouncedSearch = useDebouncedCallback((query: string) => {
    performSearch(query);
  }, 300); // Wait 300ms after last keystroke

  return <input onChange={(e) => debouncedSearch(e.target.value)} />;
}
```

**Throttle** - Limit execution frequency:

```typescript
import { useThrottledCallback } from '../utils/performance';

function ScrollContainer() {
  const throttledScroll = useThrottledCallback(() => {
    handleScroll();
  }, 100); // Execute at most once per 100ms

  return <div onScroll={throttledScroll}>...</div>;
}
```

### Virtual Scrolling

For long lists (> 100 items), use virtualization:

```bash
npm install @tanstack/react-virtual
```

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function JobsList({ jobs }: { jobs: Job[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: jobs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated row height
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const job = jobs[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <JobCard job={job} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Image Optimization

### Lazy Loading Images

**File**: `src/utils/image-optimizer.ts`

```typescript
import { lazyLoadImage } from '../utils/image-optimizer';

function JobImage({ url }: { url: string }) {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current) {
      lazyLoadImage(imgRef.current);
    }
  }, []);

  return (
    <img
      ref={imgRef}
      data-src={url}
      alt="Job"
      className="opacity-0 transition-opacity duration-300"
      style={{ opacity: 0 }}
    />
  );
}
```

### Responsive Images

```typescript
import { generateSrcSet, getOptimizedImageUrl } from '../utils/image-optimizer';

function ResponsiveImage({ url, alt }: { url: string; alt: string }) {
  return (
    <img
      src={getOptimizedImageUrl(url, { width: 640 })}
      srcSet={generateSrcSet(url)}
      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
      alt={alt}
      loading="lazy"
    />
  );
}
```

### WebP Format

Automatically serve WebP when supported:

```typescript
import { getOptimizedImageUrl } from '../utils/image-optimizer';

const optimizedUrl = getOptimizedImageUrl(imageUrl, {
  width: 800,
  quality: 85,
  format: 'webp', // Fallback to JPEG if not supported
});
```

### Image Preloading

Preload critical images:

```typescript
import { preloadImages } from '../utils/image-optimizer';

// Preload hero images
useEffect(() => {
  preloadImages([
    '/images/hero-1.jpg',
    '/images/hero-2.jpg',
  ]);
}, []);
```

---

## React Performance

### Performance Utilities

**File**: `src/utils/performance.ts`

All performance utilities are available:

```typescript
import {
  memoComponent,
  useDebouncedCallback,
  useThrottledCallback,
  usePrevious,
  useMeasureRender,
  useStableCallback,
  useComputedValue,
  PerformanceMarkers,
} from '../utils/performance';
```

### Measure Render Time

```typescript
function JobsScreen() {
  useMeasureRender('JobsScreen', 16); // Warn if > 16ms

  return <div>...</div>;
}
```

### Performance Markers

```typescript
function DataLoader() {
  const loadData = async () => {
    PerformanceMarkers.start('load-jobs');

    const jobs = await fetchJobs();

    PerformanceMarkers.end('load-jobs');
    // Logs: [Performance] load-jobs: 450.23ms
  };
}
```

### Avoid Inline Functions

❌ **Bad** - Creates new function on every render:
```typescript
<Button onClick={() => handleClick(id)}>Click</Button>
```

✅ **Good** - Stable reference:
```typescript
const handleClick = useCallback((id: string) => {
  doSomething(id);
}, []);

<Button onClick={() => handleClick(id)}>Click</Button>
```

### Avoid Inline Objects

❌ **Bad** - New object on every render:
```typescript
<JobCard job={job} style={{ padding: 10 }} />
```

✅ **Good** - Defined outside or memoized:
```typescript
const cardStyle = { padding: 10 };
<JobCard job={job} style={cardStyle} />
```

---

## Monitoring

### Lighthouse

Run Lighthouse audits regularly:

```bash
npm run build
npx lighthouse http://localhost:5173 --view
```

**Target Scores**:
- Performance: > 95
- Accessibility: > 95
- Best Practices: > 95
- SEO: > 90

### Web Vitals

Web Vitals are automatically tracked (see [ANALYTICS.md](./ANALYTICS.md)):

```typescript
import { initWebVitals } from './lib/analytics/web-vitals';
initWebVitals(); // Tracks LCP, FID, CLS, FCP, TTFB, INP
```

View reports in:
- **Firebase Analytics**: Real user metrics
- **Sentry**: Poor performance alerts
- **Browser DevTools**: Local debugging

### Bundle Analyzer

Regularly check bundle composition:

```bash
npm run build:analyze
```

**Look for**:
- Duplicate dependencies
- Unexpectedly large packages
- Missing tree shaking

---

## Checklist

### Build Optimization ✅
- [x] Bundle size < 3MB (target)
- [x] Code splitting configured
- [x] Terser minification enabled
- [x] Console.log removed in production
- [x] Source maps generated
- [x] Asset hashing enabled
- [x] Gzip/Brotli compression (via Firebase)

### Caching ✅
- [x] Long-term caching for hashed assets
- [x] No caching for index.html
- [x] React Query cache configured
- [x] LocalStorage persistence enabled

### React Performance ⏳
- [ ] All list components use React.memo
- [ ] All expensive computations use useMemo
- [ ] All callbacks use useCallback
- [ ] Virtual scrolling for long lists (> 100 items)
- [ ] No inline functions in JSX
- [ ] No inline objects in props

### Images ⏳
- [ ] All images lazy loaded (except above-fold)
- [ ] Responsive images with srcset
- [ ] WebP format used
- [ ] Image dimensions specified
- [ ] Alt text provided

### Monitoring ✅
- [x] Web Vitals tracking enabled
- [x] Performance metrics sent to Firebase
- [x] Lighthouse audits in CI
- [x] Bundle analysis configured

---

**Performance optimization is an ongoing process. Regularly monitor metrics and adjust as needed.**

**Last Updated**: 2025-10-17
**Questions?**: See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

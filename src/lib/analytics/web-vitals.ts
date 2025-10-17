/**
 * Web Vitals Tracking
 *
 * Tracks Core Web Vitals and custom performance metrics
 * Sends data to Firebase Analytics and Sentry
 */

import { onCLS, onLCP, onFCP, onTTFB, onINP, type Metric } from 'web-vitals';
import { trackEvent } from './analytics-config';
import { captureMessage } from '../sentry-config';


/**
 * Send metric to analytics
 */
function sendToAnalytics(metric: Metric) {
  const {name, value, rating, delta} = metric;

  // Send to Firebase Analytics
  trackEvent('web_vitals', {
    metric_name: name,
    metric_value: Math.round(name === 'CLS' ? value * 1000 : value),
    metric_delta: Math.round(name === 'CLS' ? delta * 1000 : delta),
    metric_rating: rating,
    page_path: window.location.pathname,
  });

  // Send poor metrics to Sentry as messages
  if (rating === 'poor') {
    captureMessage(`Poor ${name}: ${value.toFixed(2)}`, 'warning', {
      tags: {
        metric: name,
        rating,
      },
      extra: {
        value,
        delta,
        path: window.location.pathname,
      },
    });
  }

  // Log to console in development
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${name}:`, {
      value: Math.round(value),
      rating,
      delta: Math.round(delta),
    });
  }
}

/**
 * Initialize Web Vitals tracking
 */
export function initWebVitals() {
  // Only run in browser
  if (typeof window === 'undefined') return;

  // Track all Core Web Vitals
  onLCP(sendToAnalytics);
  onCLS(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);

  // Track INP (Interaction to Next Paint) - replaces deprecated FID
  onINP(sendToAnalytics);

  console.log('[Web Vitals] Tracking initialized');
}

/**
 * Track custom performance metric
 */
export function trackPerformanceMetric(
  name: string,
  value: number,
  metadata?: Record<string, string | number>
) {
  trackEvent('custom_metric', {
    metric_name: name,
    metric_value: Math.round(value),
    ...metadata,
  });
}

/**
 * Track page load time
 */
export function trackPageLoad() {
  if (typeof window === 'undefined' || !window.performance) return;

  window.addEventListener('load', () => {
    // Wait for load event to complete
    setTimeout(() => {
      const perfData = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (perfData) {
        // DNS lookup time
        trackPerformanceMetric('dns_lookup', perfData.domainLookupEnd - perfData.domainLookupStart);

        // TCP connection time
        trackPerformanceMetric('tcp_connection', perfData.connectEnd - perfData.connectStart);

        // Request time
        trackPerformanceMetric('request_time', perfData.responseStart - perfData.requestStart);

        // Response time
        trackPerformanceMetric('response_time', perfData.responseEnd - perfData.responseStart);

        // DOM processing time
        trackPerformanceMetric('dom_processing', perfData.domComplete - perfData.domInteractive);

        // Total load time
        trackPerformanceMetric('page_load_time', perfData.loadEventEnd - perfData.fetchStart);

        console.log('[Performance] Page load metrics tracked');
      }
    }, 0);
  });
}

/**
 * Track API request performance
 */
export function trackAPIRequest(endpoint: string, duration: number, status: number) {
  trackEvent('api_request', {
    endpoint,
    duration: Math.round(duration),
    status,
    status_type: status >= 200 && status < 300 ? 'success' : 'error',
  });

  // Alert on slow API requests (> 2s)
  if (duration > 2000) {
    captureMessage(`Slow API request: ${endpoint} (${duration}ms)`, 'warning', {
      tags: {
        type: 'slow_api',
        endpoint,
      },
      extra: {
        duration,
        status,
      },
    });
  }
}

/**
 * Track component render time
 */
export function trackComponentRender(componentName: string, duration: number) {
  if (duration > 16) {
    // Track renders > 16ms (one frame)
    trackEvent('component_render', {
      component: componentName,
      duration: Math.round(duration),
    });

    // Alert on very slow renders (> 100ms)
    if (duration > 100) {
      captureMessage(`Slow component render: ${componentName} (${duration}ms)`, 'warning', {
        tags: {
          type: 'slow_render',
          component: componentName,
        },
        extra: {
          duration,
        },
      });
    }
  }
}

/**
 * Track route change performance
 */
export function trackRouteChange(from: string, to: string, duration: number) {
  trackEvent('route_change', {
    from,
    to,
    duration: Math.round(duration),
  });
}

/**
 * Get current Web Vitals summary
 */
export async function getWebVitalsReport(): Promise<Record<string, Metric>> {
  const metrics: Record<string, Metric> = {};

  // This is async because web-vitals uses callbacks
  return new Promise((resolve) => {
    let count = 0;
    const total = 5; // LCP, CLS, FCP, TTFB, INP (FID is deprecated)

    const checkComplete = () => {
      count++;
      if (count >= total) {
        resolve(metrics);
      }
    };

    onLCP((metric) => {
      metrics.lcp = metric;
      checkComplete();
    });

    onCLS((metric) => {
      metrics.cls = metric;
      checkComplete();
    });

    onFCP((metric) => {
      metrics.fcp = metric;
      checkComplete();
    });

    onTTFB((metric) => {
      metrics.ttfb = metric;
      checkComplete();
    });

    onINP((metric) => {
      metrics.inp = metric;
      checkComplete();
    });

    // Timeout after 5 seconds
    setTimeout(() => resolve(metrics), 5000);
  });
}

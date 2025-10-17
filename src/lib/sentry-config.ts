/**
 * Sentry Error Tracking Configuration
 *
 * Configures Sentry with:
 * - PII scrubbing for privacy protection
 * - Performance monitoring
 * - Source maps for production debugging
 * - Custom error filtering
 * - Integration with Firebase
 */

import * as Sentry from '@sentry/react';
import {
  scrubPII,
  scrubErrorMessage,
  scrubBreadcrumb,
  createSafeContext,
  getSafeUserId,
} from './pii-scrubber';
import { envConfig } from './env-config';
import { logger } from '../services/logger';

/**
 * Sentry DSN (Data Source Name)
 * Set this in your .env file: VITE_SENTRY_DSN
 */
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

/**
 * Release version
 */
const RELEASE = import.meta.env.VITE_APP_VERSION || 'unknown';

/**
 * Initialize Sentry
 */
export function initSentry(): void {
  // Skip initialization if DSN not configured
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  // Skip in development unless explicitly enabled
  if (envConfig.isDevelopment && !import.meta.env.VITE_SENTRY_ENABLED) {
    console.log('Sentry disabled in development');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: envConfig.environment,
      release: RELEASE,

      /**
       * Performance Monitoring
       */
      integrations: [
        // Browser tracing for performance
        Sentry.browserTracingIntegration({
          // Trace navigation and route changes
          tracePropagationTargets: [
            'localhost',
            /^https:\/\/.*\.firebaseapp\.com/,
            /^https:\/\/.*\.web\.app/,
          ],
          // Enable automatic instrumentation
          enableInp: true,
        }),

        // Replay sessions for debugging
        Sentry.replayIntegration({
          // Mask all text content for privacy
          maskAllText: true,
          // Block all media (images, videos, etc.)
          blockAllMedia: true,
          // Capture replays on errors
          networkDetailAllowUrls: [
            /^https:\/\/.*\.firebaseio\.com/,
            /^https:\/\/.*\.googleapis\.com/,
          ],
        }),

        // React-specific features
        Sentry.reactRouterV6BrowserTracingIntegration({
          useEffect: React.useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes,
        }),
      ],

      /**
       * Performance Monitoring Configuration
       */
      // Sample rate for performance monitoring (10% of transactions)
      tracesSampleRate: envConfig.isProduction ? 0.1 : 1.0,

      // Sample rate for session replays (10% of sessions)
      replaysSessionSampleRate: 0.1,

      // Capture 100% of sessions with errors
      replaysOnErrorSampleRate: 1.0,

      /**
       * Error Filtering
       */
      beforeSend: (event) => {
        // Scrub PII from event
        return scrubEvent(event);
      },

      beforeBreadcrumb: (breadcrumb) => {
        // Scrub PII from breadcrumbs
        return scrubBreadcrumb(breadcrumb);
      },

      /**
       * Ignore certain errors
       */
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        'chrome-extension://',
        'moz-extension://',

        // Network errors (handled by retry logic)
        'NetworkError',
        'Failed to fetch',
        'Network request failed',

        // Firebase quota errors (expected)
        'quota-exceeded',

        // React development warnings
        'Warning:',
        'ResizeObserver loop',
      ],

      /**
       * Additional configuration
       */
      // Max breadcrumbs to keep
      maxBreadcrumbs: 50,

      // Attach stack traces
      attachStacktrace: true,

      // Auto session tracking
      autoSessionTracking: true,

      // Send client reports
      sendClientReports: true,

      /**
       * Debug mode (development only)
       */
      debug: envConfig.isDevelopment,
    });

    logger.info('Sentry initialized', {
      environment: envConfig.environment,
      release: RELEASE,
      tracesSampleRate: envConfig.isProduction ? 0.1 : 1.0,
    });
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
  }
}

/**
 * Scrub PII from Sentry event
 */
function scrubEvent(event: Sentry.Event): Sentry.Event | null {
  try {
    // Scrub exception messages
    if (event.exception?.values) {
      event.exception.values = event.exception.values.map((exception) => ({
        ...exception,
        value: exception.value ? scrubErrorMessage(exception.value) : exception.value,
      }));
    }

    // Scrub error message
    if (event.message) {
      event.message = scrubErrorMessage(event.message);
    }

    // Scrub request data
    if (event.request) {
      event.request = {
        ...event.request,
        cookies: undefined, // Never send cookies
        headers: event.request.headers
          ? {
              ...event.request.headers,
              Authorization: undefined,
              Cookie: undefined,
              'X-API-Key': undefined,
            }
          : undefined,
        data: event.request.data ? scrubPII(event.request.data) : undefined,
      };
    }

    // Scrub extra context
    if (event.extra) {
      event.extra = scrubPII(event.extra);
    }

    // Scrub tags (keep non-PII tags)
    if (event.tags) {
      const scrubbedTags: Record<string, string> = {};
      for (const [key, value] of Object.entries(event.tags)) {
        if (key.toLowerCase().includes('email') || key.toLowerCase().includes('name')) {
          continue; // Skip PII tags
        }
        scrubbedTags[key] = String(value);
      }
      event.tags = scrubbedTags;
    }

    // Scrub user data (keep anonymized IDs only)
    if (event.user) {
      event.user = {
        id: event.user.id ? getSafeUserId({ uid: event.user.id }) : undefined,
        // Remove all other PII
        email: undefined,
        username: undefined,
        ip_address: undefined,
      };
    }

    return event;
  } catch (error) {
    console.error('Error scrubbing Sentry event:', error);
    // Return null to drop the event if scrubbing fails
    return null;
  }
}

/**
 * Set user context (with PII scrubbing)
 */
export function setSentryUser(user?: {
  uid?: string;
  email?: string;
  companyId?: string;
  role?: string;
}): void {
  if (!user) {
    Sentry.setUser(null);
    return;
  }

  // Set anonymized user context
  Sentry.setUser({
    id: getSafeUserId(user),
    // Don't include email or other PII
  });

  // Set safe context as tags
  const safeContext = createSafeContext(user);
  Sentry.setTags({
    role: safeContext.role,
    environment: safeContext.environment,
  });
}

/**
 * Clear user context
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb (with PII scrubbing)
 */
export function addSentryBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, any>,
  level: Sentry.SeverityLevel = 'info'
): void {
  Sentry.addBreadcrumb({
    category,
    message: scrubErrorMessage(message),
    data: data ? scrubPII(data) : undefined,
    level,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture exception manually
 */
export function captureException(
  error: Error,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    level?: Sentry.SeverityLevel;
  }
): void {
  Sentry.captureException(error, {
    level: context?.level || 'error',
    tags: context?.tags,
    extra: context?.extra ? scrubPII(context.extra) : undefined,
  });
}

/**
 * Capture message manually
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  }
): void {
  Sentry.captureMessage(scrubErrorMessage(message), {
    level,
    tags: context?.tags,
    extra: context?.extra ? scrubPII(context.extra) : undefined,
  });
}

/**
 * Start a performance transaction
 * NOTE: Commented out - startTransaction is deprecated in Sentry v8+
 * Use startSpan() instead
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function startTransaction(
  _name: string,
  _op: string,
  _data?: Record<string, unknown>
): undefined {
  // return Sentry.startTransaction({
  //   name,
  //   op,
  //   data: data ? scrubPII(data) : undefined,
  // });
  console.warn('[Sentry] startTransaction is deprecated. Use startSpan() instead.');
  return undefined;
}

/**
 * Set transaction context
 */
export function setTransactionContext(
  name: string,
  context: Record<string, any>
): void {
  Sentry.setContext(name, scrubPII(context));
}

/**
 * Wrap component with Sentry error boundary
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * Create Sentry error boundary with custom fallback
 */
export function createSentryErrorBoundary(
  fallback: React.ComponentType<{ error: Error; resetError: () => void }>
) {
  return Sentry.withErrorBoundary(fallback, {
    showDialog: false,
    beforeCapture: (scope) => {
      scope.setLevel('error');
    },
  });
}

/**
 * Sentry profiler for React components
 */
export const SentryProfiler = Sentry.withProfiler;

/**
 * Get Sentry hub
 * NOTE: Commented out - getCurrentHub is deprecated in Sentry v8+
 * Use getClient() instead
 */
export function getSentryHub() {
  // return Sentry.getCurrentHub();
  console.warn('[Sentry] getCurrentHub is deprecated. Use getClient() instead.');
  return undefined;
}

/**
 * Check if Sentry is enabled
 */
export function isSentryEnabled(): boolean {
  return !!SENTRY_DSN && Sentry.getClient() !== undefined;
}

/**
 * Flush pending events
 */
export async function flushSentry(timeout = 2000): Promise<boolean> {
  try {
    return await Sentry.flush(timeout);
  } catch (error) {
    console.error('Failed to flush Sentry events:', error);
    return false;
  }
}

/**
 * Close Sentry client
 */
export async function closeSentry(timeout = 2000): Promise<boolean> {
  try {
    return await Sentry.close(timeout);
  } catch (error) {
    console.error('Failed to close Sentry client:', error);
    return false;
  }
}

// Export Sentry for advanced usage
export { Sentry };

// Import React Router hooks for tracing integration
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';
import React from 'react';

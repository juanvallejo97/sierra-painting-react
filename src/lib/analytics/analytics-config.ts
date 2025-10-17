/**
 * Analytics Configuration
 *
 * Centralized analytics tracking using Firebase Analytics
 * Integrates with Sentry for error context
 */

import { getAnalytics, logEvent, setUserId, setUserProperties, isSupported } from 'firebase/analytics';
import app from '../firebase';
import { envConfig } from '../env-config';
import { getSafeUserId } from '../pii-scrubber';

/**
 * Analytics instance (lazy initialized)
 */
let analytics: ReturnType<typeof getAnalytics> | null = null;
let analyticsEnabled = false;

/**
 * Initialize Firebase Analytics
 */
export async function initAnalytics(): Promise<void> {
  // Skip if not in browser
  if (typeof window === 'undefined') {
    return;
  }

  // Skip if analytics disabled
  if (!envConfig.isProduction && !import.meta.env.VITE_ANALYTICS_ENABLED) {
    console.log('[Analytics] Disabled in development');
    return;
  }

  try {
    // Check if analytics is supported in this browser
    const supported = await isSupported();

    if (!supported) {
      console.warn('[Analytics] Not supported in this browser');
      return;
    }

    analytics = getAnalytics(app);
    analyticsEnabled = true;

    console.log('[Analytics] Initialized successfully');
  } catch (error) {
    console.error('[Analytics] Failed to initialize:', error);
  }
}

/**
 * Track custom event
 */
export function trackEvent(
  eventName: string,
  eventParams?: Record<string, string | number | boolean>
): void {
  if (!analyticsEnabled || !analytics) {
    if (import.meta.env.DEV) {
      console.log(`[Analytics] Event: ${eventName}`, eventParams);
    }
    return;
  }

  try {
    logEvent(analytics, eventName, eventParams);
  } catch (error) {
    console.error('[Analytics] Failed to track event:', error);
  }
}

/**
 * Track page view
 */
export function trackPageView(pagePath: string, pageTitle?: string): void {
  trackEvent('page_view', {
    page_path: pagePath,
    page_title: pageTitle || document.title,
    page_location: window.location.href,
  });
}

/**
 * Set user ID (anonymized)
 */
export function setAnalyticsUser(user?: {
  uid?: string;
  email?: string;
  role?: string;
  companyId?: string;
}): void {
  if (!analyticsEnabled || !analytics || !user) {
    return;
  }

  try {
    // Set anonymized user ID
    const anonymizedId = getSafeUserId(user);
    if (anonymizedId) {
      setUserId(analytics, anonymizedId);
    }

    // Set non-PII user properties
    setUserProperties(analytics, {
      user_role: user.role || 'unknown',
      has_company: user.companyId ? 'true' : 'false',
    });
  } catch (error) {
    console.error('[Analytics] Failed to set user:', error);
  }
}

/**
 * Clear user data
 */
export function clearAnalyticsUser(): void {
  if (!analyticsEnabled || !analytics) {
    return;
  }

  try {
    setUserId(analytics, '');
    setUserProperties(analytics, {
      user_role: undefined,
      has_company: undefined,
    });
  } catch (error) {
    console.error('[Analytics] Failed to clear user:', error);
  }
}

/**
 * Track business events
 */

export function trackJobCreated(jobId: string, status: string): void {
  trackEvent('job_created', {
    job_id: jobId,
    status,
  });
}

export function trackJobUpdated(jobId: string, oldStatus: string, newStatus: string): void {
  trackEvent('job_updated', {
    job_id: jobId,
    old_status: oldStatus,
    new_status: newStatus,
    status_changed: oldStatus !== newStatus ? 'true' : 'false',
  });
}

export function trackJobCompleted(jobId: string, duration?: number): void {
  trackEvent('job_completed', {
    job_id: jobId,
    duration: duration || 0,
  });
}

export function trackInvoiceCreated(invoiceId: string, amount: number): void {
  trackEvent('invoice_created', {
    invoice_id: invoiceId,
    amount: Math.round(amount),
  });
}

export function trackInvoicePaid(invoiceId: string, amount: number, paymentMethod?: string): void {
  trackEvent('invoice_paid', {
    invoice_id: invoiceId,
    amount: Math.round(amount),
    payment_method: paymentMethod || 'unknown',
  });
}

export function trackEstimateCreated(estimateId: string, amount: number): void {
  trackEvent('estimate_created', {
    estimate_id: estimateId,
    amount: Math.round(amount),
  });
}

export function trackEstimateAccepted(estimateId: string): void {
  trackEvent('estimate_accepted', {
    estimate_id: estimateId,
  });
}

export function trackTimeEntryCreated(entryId: string, hours: number): void {
  trackEvent('time_entry_created', {
    entry_id: entryId,
    hours: Math.round(hours * 100) / 100,
  });
}

export function trackTimeEntryApproved(entryId: string): void {
  trackEvent('time_entry_approved', {
    entry_id: entryId,
  });
}

/**
 * Track user actions
 */

export function trackLogin(method: string): void {
  trackEvent('login', {
    method,
  });
}

export function trackLogout(): void {
  trackEvent('logout');
}

export function trackSignup(method: string): void {
  trackEvent('sign_up', {
    method,
  });
}

export function trackSearch(searchTerm: string, category?: string): void {
  trackEvent('search', {
    search_term: searchTerm.toLowerCase(),
    category: category || 'all',
  });
}

export function trackFilter(filterType: string, filterValue: string): void {
  trackEvent('filter', {
    filter_type: filterType,
    filter_value: filterValue,
  });
}

export function trackSort(sortField: string, sortDirection: 'asc' | 'desc'): void {
  trackEvent('sort', {
    sort_field: sortField,
    sort_direction: sortDirection,
  });
}

export function trackExport(exportType: string, recordCount: number): void {
  trackEvent('export', {
    export_type: exportType,
    record_count: recordCount,
  });
}

export function trackPrint(printType: string): void {
  trackEvent('print', {
    print_type: printType,
  });
}

/**
 * Track UI interactions
 */

export function trackButtonClick(buttonName: string, location?: string): void {
  trackEvent('button_click', {
    button_name: buttonName,
    location: location || 'unknown',
  });
}

export function trackFormSubmit(formName: string, success: boolean): void {
  trackEvent('form_submit', {
    form_name: formName,
    success: success ? 'true' : 'false',
  });
}

export function trackDialogOpen(dialogName: string): void {
  trackEvent('dialog_open', {
    dialog_name: dialogName,
  });
}

export function trackDialogClose(dialogName: string, action?: 'save' | 'cancel' | 'close'): void {
  trackEvent('dialog_close', {
    dialog_name: dialogName,
    action: action || 'close',
  });
}

export function trackTabChange(tabName: string): void {
  trackEvent('tab_change', {
    tab_name: tabName,
  });
}

/**
 * Track errors
 */

export function trackError(errorType: string, errorMessage: string, fatal = false): void {
  trackEvent('error', {
    error_type: errorType,
    error_message: errorMessage.substring(0, 100), // Limit length
    fatal: fatal ? 'true' : 'false',
  });
}

export function trackApiError(endpoint: string, statusCode: number, errorMessage: string): void {
  trackEvent('api_error', {
    endpoint,
    status_code: statusCode,
    error_message: errorMessage.substring(0, 100),
  });
}

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
  return analyticsEnabled && analytics !== null;
}

/**
 * Get analytics instance (for advanced usage)
 */
export function getAnalyticsInstance() {
  return analytics;
}

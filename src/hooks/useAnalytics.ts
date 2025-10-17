/**
 * Analytics Hook
 *
 * React hook for accessing analytics functions throughout the app
 * Provides a clean interface for tracking events from components
 */

import { useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  trackEvent,
  trackPageView,
  trackButtonClick,
  trackFormSubmit,
  trackDialogOpen,
  trackDialogClose,
  trackTabChange,
  trackError,
  isAnalyticsEnabled,
} from '../lib/analytics/analytics-config';
import * as customEvents from '../lib/analytics/custom-events';

/**
 * Hook for analytics tracking
 *
 * @example
 * const analytics = useAnalytics();
 *
 * // Track button click
 * analytics.trackButtonClick('create_job', 'jobs_screen');
 *
 * // Track custom business event
 * analytics.trackJobCreated('job-123', 'pending');
 */
export function useAnalytics() {
  const location = useLocation();

  // Track page views automatically when route changes
  useEffect(() => {
    if (isAnalyticsEnabled()) {
      const pagePath = location.pathname;
      const pageTitle = document.title;
      trackPageView(pagePath, pageTitle);
    }
  }, [location]);

  return {
    // Core tracking functions
    trackEvent: useCallback(
      (eventName: string, params?: Record<string, string | number | boolean>) => {
        trackEvent(eventName, params);
      },
      []
    ),

    trackPageView: useCallback((pagePath: string, pageTitle?: string) => {
      trackPageView(pagePath, pageTitle);
    }, []),

    // UI interaction tracking
    trackButtonClick: useCallback((buttonName: string, location?: string) => {
      trackButtonClick(buttonName, location);
    }, []),

    trackFormSubmit: useCallback((formName: string, success: boolean) => {
      trackFormSubmit(formName, success);
    }, []),

    trackDialogOpen: useCallback((dialogName: string) => {
      trackDialogOpen(dialogName);
    }, []),

    trackDialogClose: useCallback((dialogName: string, action?: 'save' | 'cancel' | 'close') => {
      trackDialogClose(dialogName, action);
    }, []),

    trackTabChange: useCallback((tabName: string) => {
      trackTabChange(tabName);
    }, []),

    // Error tracking
    trackError: useCallback((errorType: string, errorMessage: string, fatal = false) => {
      trackError(errorType, errorMessage, fatal);
    }, []),

    // Custom business events (from custom-events.ts)
    ...customEvents,

    // Utility
    isEnabled: useCallback(() => isAnalyticsEnabled(), []),
  };
}

/**
 * Hook for tracking component mount/unmount
 *
 * @example
 * useComponentAnalytics('JobsScreen');
 */
export function useComponentAnalytics(componentName: string) {
  useEffect(() => {
    const mountTime = performance.now();

    // Track component mount
    trackEvent('component_mount', {
      component_name: componentName,
    });

    return () => {
      // Track component unmount and lifetime
      const unmountTime = performance.now();
      const lifetime = Math.round(unmountTime - mountTime);

      trackEvent('component_unmount', {
        component_name: componentName,
        lifetime_ms: lifetime,
      });
    };
  }, [componentName]);
}

/**
 * Hook for tracking form interactions
 *
 * @example
 * const { trackFieldFocus, trackFieldBlur, trackFormError, trackFormSuccess } = useFormAnalytics('create_job_form');
 */
export function useFormAnalytics(formName: string) {
  const trackFieldFocus = useCallback(
    (fieldName: string) => {
      trackEvent('form_field_focus', {
        form_name: formName,
        field_name: fieldName,
      });
    },
    [formName]
  );

  const trackFieldBlur = useCallback(
    (fieldName: string, hasValue: boolean) => {
      trackEvent('form_field_blur', {
        form_name: formName,
        field_name: fieldName,
        has_value: hasValue ? 'true' : 'false',
      });
    },
    [formName]
  );

  const trackFormError = useCallback(
    (fieldName: string, errorType: string) => {
      trackEvent('form_field_error', {
        form_name: formName,
        field_name: fieldName,
        error_type: errorType,
      });
    },
    [formName]
  );

  const trackFormSuccess = useCallback(() => {
    trackFormSubmit(formName, true);
  }, [formName]);

  const trackFormFailure = useCallback(
    (errorMessage: string) => {
      trackFormSubmit(formName, false);
      trackEvent('form_submit_error', {
        form_name: formName,
        error_message: errorMessage.substring(0, 100),
      });
    },
    [formName]
  );

  return {
    trackFieldFocus,
    trackFieldBlur,
    trackFormError,
    trackFormSuccess,
    trackFormFailure,
  };
}

/**
 * Hook for tracking data table interactions
 *
 * @example
 * const { trackSort, trackFilter, trackPagination, trackRowSelect } = useTableAnalytics('jobs_table');
 */
export function useTableAnalytics(tableName: string) {
  const trackSort = useCallback(
    (columnName: string, direction: 'asc' | 'desc') => {
      trackEvent('table_sort', {
        table_name: tableName,
        column_name: columnName,
        direction,
      });
    },
    [tableName]
  );

  const trackFilter = useCallback(
    (filterName: string, filterValue: string) => {
      trackEvent('table_filter', {
        table_name: tableName,
        filter_name: filterName,
        filter_value: filterValue,
      });
    },
    [tableName]
  );

  const trackPagination = useCallback(
    (page: number, pageSize: number) => {
      trackEvent('table_pagination', {
        table_name: tableName,
        page,
        page_size: pageSize,
      });
    },
    [tableName]
  );

  const trackRowSelect = useCallback(
    (rowId: string, isSelected: boolean) => {
      trackEvent('table_row_select', {
        table_name: tableName,
        row_id: rowId,
        is_selected: isSelected ? 'true' : 'false',
      });
    },
    [tableName]
  );

  const trackBulkAction = useCallback(
    (actionName: string, rowCount: number) => {
      trackEvent('table_bulk_action', {
        table_name: tableName,
        action_name: actionName,
        row_count: rowCount,
      });
    },
    [tableName]
  );

  return {
    trackSort,
    trackFilter,
    trackPagination,
    trackRowSelect,
    trackBulkAction,
  };
}

/**
 * Hook for tracking performance metrics
 *
 * @example
 * const { startTimer, endTimer } = usePerformanceAnalytics();
 * const timerId = startTimer('data_load');
 * // ... async operation
 * endTimer(timerId, { record_count: 50 });
 */
export function usePerformanceAnalytics() {
  const timersRef = useRef(new Map<string, number>());

  const startTimer = useCallback((timerName: string): string => {
    const timerId = `${timerName}_${Date.now()}`;
    timersRef.current.set(timerId, performance.now());
    return timerId;
  }, []);

  const endTimer = useCallback(
    (timerId: string, metadata?: Record<string, string | number>) => {
      const startTime = timersRef.current.get(timerId);
      if (startTime) {
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);

        trackEvent('performance_timer', {
          timer_id: timerId,
          duration,
          ...metadata,
        });

        timersRef.current.delete(timerId);
      }
    },
    []
  );

  return {
    startTimer,
    endTimer,
  };
}

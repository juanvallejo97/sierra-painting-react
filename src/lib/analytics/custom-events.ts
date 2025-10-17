/**
 * Custom Business Events Tracking
 *
 * Domain-specific event tracking for Sierra Painting business operations
 */

import { trackEvent } from './analytics-config';

/**
 * Dashboard Events
 */

export function trackDashboardView(metrics: {
  activeJobs: number;
  pendingInvoices: number;
  totalRevenue: number;
  employeeCount: number;
}): void {
  trackEvent('dashboard_view', {
    active_jobs: metrics.activeJobs,
    pending_invoices: metrics.pendingInvoices,
    total_revenue: Math.round(metrics.totalRevenue),
    employee_count: metrics.employeeCount,
  });
}

export function trackDashboardMetricClick(metricName: string): void {
  trackEvent('dashboard_metric_click', {
    metric_name: metricName,
  });
}

/**
 * Job Management Events
 */

export function trackJobListView(filters?: {
  status?: string;
  dateRange?: string;
  searchTerm?: string;
}): void {
  trackEvent('job_list_view', {
    has_status_filter: filters?.status ? 'true' : 'false',
    has_date_filter: filters?.dateRange ? 'true' : 'false',
    has_search: filters?.searchTerm ? 'true' : 'false',
  });
}

export function trackJobDetailView(jobId: string, jobStatus: string): void {
  trackEvent('job_detail_view', {
    job_id: jobId,
    job_status: jobStatus,
  });
}

export function trackJobStatusChange(
  jobId: string,
  oldStatus: string,
  newStatus: string,
  duration?: number
): void {
  trackEvent('job_status_change', {
    job_id: jobId,
    old_status: oldStatus,
    new_status: newStatus,
    duration_days: duration ? Math.round(duration) : 0,
  });
}

export function trackJobAssignment(jobId: string, employeeCount: number): void {
  trackEvent('job_assignment', {
    job_id: jobId,
    employee_count: employeeCount,
  });
}

/**
 * Invoice Management Events
 */

export function trackInvoiceListView(filters?: {
  status?: string;
  dateRange?: string;
  paymentStatus?: string;
}): void {
  trackEvent('invoice_list_view', {
    has_status_filter: filters?.status ? 'true' : 'false',
    has_date_filter: filters?.dateRange ? 'true' : 'false',
    has_payment_filter: filters?.paymentStatus ? 'true' : 'false',
  });
}

export function trackInvoiceDetailView(invoiceId: string, status: string): void {
  trackEvent('invoice_detail_view', {
    invoice_id: invoiceId,
    invoice_status: status,
  });
}

export function trackInvoicePayment(
  invoiceId: string,
  amount: number,
  paymentMethod: string,
  isPartial: boolean
): void {
  trackEvent('invoice_payment', {
    invoice_id: invoiceId,
    amount: Math.round(amount),
    payment_method: paymentMethod,
    is_partial: isPartial ? 'true' : 'false',
  });
}

export function trackInvoiceDownload(invoiceId: string, format: 'pdf' | 'csv'): void {
  trackEvent('invoice_download', {
    invoice_id: invoiceId,
    format,
  });
}

export function trackInvoiceEmail(invoiceId: string, recipientType: 'customer' | 'internal'): void {
  trackEvent('invoice_email', {
    invoice_id: invoiceId,
    recipient_type: recipientType,
  });
}

/**
 * Estimate Management Events
 */

export function trackEstimateListView(filters?: {
  status?: string;
  dateRange?: string;
}): void {
  trackEvent('estimate_list_view', {
    has_status_filter: filters?.status ? 'true' : 'false',
    has_date_filter: filters?.dateRange ? 'true' : 'false',
  });
}

export function trackEstimateDetailView(estimateId: string, status: string): void {
  trackEvent('estimate_detail_view', {
    estimate_id: estimateId,
    estimate_status: status,
  });
}

export function trackEstimateSent(estimateId: string, amount: number): void {
  trackEvent('estimate_sent', {
    estimate_id: estimateId,
    amount: Math.round(amount),
  });
}

export function trackEstimateConversion(
  estimateId: string,
  estimateAmount: number,
  jobId: string
): void {
  trackEvent('estimate_conversion', {
    estimate_id: estimateId,
    estimate_amount: Math.round(estimateAmount),
    job_id: jobId,
  });
}

/**
 * Time Tracking Events
 */

export function trackTimeEntryListView(filters?: {
  dateRange?: string;
  employee?: string;
  status?: string;
}): void {
  trackEvent('time_entry_list_view', {
    has_date_filter: filters?.dateRange ? 'true' : 'false',
    has_employee_filter: filters?.employee ? 'true' : 'false',
    has_status_filter: filters?.status ? 'true' : 'false',
  });
}

export function trackTimeEntryBulkApproval(entryCount: number, totalHours: number): void {
  trackEvent('time_entry_bulk_approval', {
    entry_count: entryCount,
    total_hours: Math.round(totalHours * 100) / 100,
  });
}

export function trackTimeEntryExport(
  format: string,
  dateRange: string,
  entryCount: number
): void {
  trackEvent('time_entry_export', {
    format,
    date_range: dateRange,
    entry_count: entryCount,
  });
}

/**
 * Employee Management Events
 */

export function trackEmployeeListView(filters?: {
  role?: string;
  status?: string;
}): void {
  trackEvent('employee_list_view', {
    has_role_filter: filters?.role ? 'true' : 'false',
    has_status_filter: filters?.status ? 'true' : 'false',
  });
}

export function trackEmployeeDetailView(employeeId: string, role: string): void {
  trackEvent('employee_detail_view', {
    employee_id: employeeId,
    employee_role: role,
  });
}

export function trackEmployeeRoleChange(
  employeeId: string,
  oldRole: string,
  newRole: string
): void {
  trackEvent('employee_role_change', {
    employee_id: employeeId,
    old_role: oldRole,
    new_role: newRole,
  });
}

export function trackEmployeeActivation(employeeId: string, isActive: boolean): void {
  trackEvent('employee_activation', {
    employee_id: employeeId,
    is_active: isActive ? 'true' : 'false',
  });
}

/**
 * Settings & Configuration Events
 */

export function trackSettingsView(section: string): void {
  trackEvent('settings_view', {
    section,
  });
}

export function trackSettingsChange(
  setting: string,
  oldValue: string,
  newValue: string
): void {
  trackEvent('settings_change', {
    setting,
    old_value: oldValue,
    new_value: newValue,
  });
}

export function trackCompanyInfoUpdate(): void {
  trackEvent('company_info_update');
}

/**
 * Data Export Events
 */

export function trackBulkExport(
  exportType: 'jobs' | 'invoices' | 'employees' | 'time-entries',
  format: 'csv' | 'pdf' | 'excel',
  recordCount: number
): void {
  trackEvent('bulk_export', {
    export_type: exportType,
    format,
    record_count: recordCount,
  });
}

export function trackReportGeneration(
  reportType: string,
  dateRange: string,
  filters: Record<string, string>
): void {
  trackEvent('report_generation', {
    report_type: reportType,
    date_range: dateRange,
    filter_count: Object.keys(filters).length,
  });
}

/**
 * User Engagement Events
 */

export function trackFeatureDiscovery(featureName: string): void {
  trackEvent('feature_discovery', {
    feature_name: featureName,
  });
}

export function trackTooltipView(tooltipName: string): void {
  trackEvent('tooltip_view', {
    tooltip_name: tooltipName,
  });
}

export function trackHelpDocumentView(documentName: string): void {
  trackEvent('help_document_view', {
    document_name: documentName,
  });
}

export function trackFeedbackSubmit(feedbackType: 'bug' | 'feature' | 'general'): void {
  trackEvent('feedback_submit', {
    feedback_type: feedbackType,
  });
}

/**
 * Performance Events
 */

export function trackSlowOperation(
  operationType: string,
  duration: number,
  metadata?: Record<string, string | number>
): void {
  trackEvent('slow_operation', {
    operation_type: operationType,
    duration: Math.round(duration),
    ...metadata,
  });
}

export function trackOfflineMode(isOffline: boolean): void {
  trackEvent('offline_mode', {
    is_offline: isOffline ? 'true' : 'false',
  });
}

/**
 * Conversion Funnel Events
 */

export function trackFunnelStep(
  funnelName: string,
  stepName: string,
  stepNumber: number
): void {
  trackEvent('funnel_step', {
    funnel_name: funnelName,
    step_name: stepName,
    step_number: stepNumber,
  });
}

export function trackFunnelCompletion(funnelName: string, duration: number): void {
  trackEvent('funnel_completion', {
    funnel_name: funnelName,
    duration: Math.round(duration),
  });
}

export function trackFunnelAbandonment(
  funnelName: string,
  stepName: string,
  stepNumber: number
): void {
  trackEvent('funnel_abandonment', {
    funnel_name: funnelName,
    step_name: stepName,
    step_number: stepNumber,
  });
}

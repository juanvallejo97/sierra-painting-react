/**
 * React Query Key Factory
 *
 * Standardized query key generation for all Firebase collections.
 * Provides type-safe, consistent cache keys with automatic invalidation support.
 *
 * Benefits:
 * - Type-safe key generation
 * - Easy cache invalidation
 * - Consistent naming
 * - Automatic scope management
 */

import { CollectionName } from './converters';

/**
 * Base query key structure
 */
export type QueryKey = readonly [string, ...unknown[]];

/**
 * Query filter types
 */
export interface BaseFilter {
  companyId?: string;
}

export interface JobFilter extends BaseFilter {
  status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'all';
  workerId?: string;
  startDate?: string;
  endDate?: string;
}

export interface InvoiceFilter extends BaseFilter {
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'all';
  client?: string;
  startDate?: string;
  endDate?: string;
}

export interface UserFilter extends BaseFilter {
  role?: 'admin' | 'manager' | 'worker' | 'viewer';
  status?: 'active' | 'inactive' | 'pending';
}

/**
 * Query key factory for all collections
 */
export const queryKeys = {
  /**
   * Root keys for broad invalidation
   */
  all: ['data'] as const,

  /**
   * Jobs queries
   */
  jobs: {
    all: () => [...queryKeys.all, 'jobs'] as const,
    lists: () => [...queryKeys.jobs.all(), 'list'] as const,
    list: (filters?: JobFilter) => [...queryKeys.jobs.lists(), filters] as const,
    details: () => [...queryKeys.jobs.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.jobs.details(), id] as const,
    byWorker: (workerId: string) => [...queryKeys.jobs.all(), 'worker', workerId] as const,
    byStatus: (status: string) => [...queryKeys.jobs.all(), 'status', status] as const,
  },

  /**
   * Invoices queries
   */
  invoices: {
    all: () => [...queryKeys.all, 'invoices'] as const,
    lists: () => [...queryKeys.invoices.all(), 'list'] as const,
    list: (filters?: InvoiceFilter) => [...queryKeys.invoices.lists(), filters] as const,
    details: () => [...queryKeys.invoices.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.invoices.details(), id] as const,
    byJob: (jobId: string) => [...queryKeys.invoices.all(), 'job', jobId] as const,
    byClient: (client: string) => [...queryKeys.invoices.all(), 'client', client] as const,
    byStatus: (status: string) => [...queryKeys.invoices.all(), 'status', status] as const,
  },

  /**
   * Users queries
   */
  users: {
    all: () => [...queryKeys.all, 'users'] as const,
    lists: () => [...queryKeys.users.all(), 'list'] as const,
    list: (filters?: UserFilter) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    current: () => [...queryKeys.users.all(), 'current'] as const,
    byRole: (role: string) => [...queryKeys.users.all(), 'role', role] as const,
    byCompany: (companyId: string) => [...queryKeys.users.all(), 'company', companyId] as const,
  },

  /**
   * Employees queries
   */
  employees: {
    all: () => [...queryKeys.all, 'employees'] as const,
    lists: () => [...queryKeys.employees.all(), 'list'] as const,
    list: (filters?: BaseFilter) => [...queryKeys.employees.lists(), filters] as const,
    details: () => [...queryKeys.employees.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.employees.details(), id] as const,
    active: () => [...queryKeys.employees.all(), 'status', 'active'] as const,
  },

  /**
   * Estimates queries
   */
  estimates: {
    all: () => [...queryKeys.all, 'estimates'] as const,
    lists: () => [...queryKeys.estimates.all(), 'list'] as const,
    list: (filters?: BaseFilter) => [...queryKeys.estimates.lists(), filters] as const,
    details: () => [...queryKeys.estimates.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.estimates.details(), id] as const,
  },

  /**
   * Companies queries
   */
  companies: {
    all: () => [...queryKeys.all, 'companies'] as const,
    details: () => [...queryKeys.companies.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.companies.details(), id] as const,
    current: () => [...queryKeys.companies.all(), 'current'] as const,
  },

  /**
   * Time entries queries
   */
  timeEntries: {
    all: () => [...queryKeys.all, 'timeEntries'] as const,
    lists: () => [...queryKeys.timeEntries.all(), 'list'] as const,
    list: (filters?: BaseFilter) => [...queryKeys.timeEntries.lists(), filters] as const,
    details: () => [...queryKeys.timeEntries.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.timeEntries.details(), id] as const,
    byUser: (userId: string) => [...queryKeys.timeEntries.all(), 'user', userId] as const,
    byJob: (jobId: string) => [...queryKeys.timeEntries.all(), 'job', jobId] as const,
  },

  /**
   * Audit logs queries
   */
  auditLogs: {
    all: () => [...queryKeys.all, 'auditLogs'] as const,
    lists: () => [...queryKeys.auditLogs.all(), 'list'] as const,
    list: (filters?: BaseFilter) => [...queryKeys.auditLogs.lists(), filters] as const,
    byResource: (resourceType: string, resourceId: string) =>
      [...queryKeys.auditLogs.all(), 'resource', resourceType, resourceId] as const,
    byUser: (userId: string) => [...queryKeys.auditLogs.all(), 'user', userId] as const,
  },
} as const;

/**
 * Helper to create collection-specific keys
 */
export function createCollectionKeys(collection: CollectionName) {
  return {
    all: () => [...queryKeys.all, collection] as const,
    lists: () => [...queryKeys.all, collection, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.all, collection, 'list', filters] as const,
    details: () => [...queryKeys.all, collection, 'detail'] as const,
    detail: (id: string) => [...queryKeys.all, collection, 'detail', id] as const,
  };
}

/**
 * Helper to create query key from parts
 */
export function createQueryKey(...parts: unknown[]): QueryKey {
  return [...queryKeys.all, ...parts] as const;
}

/**
 * Check if a query key matches a pattern
 */
export function matchesQueryKey(
  key: QueryKey,
  pattern: readonly unknown[]
): boolean {
  if (pattern.length > key.length) {
    return false;
  }

  return pattern.every((part, index) => {
    if (part === undefined) {
      return true; // Wildcard
    }
    return key[index] === part;
  });
}

/**
 * Get all queries matching a pattern
 */
export function getMatchingQueries(
  cache: Map<string, any>,
  pattern: readonly unknown[]
): string[] {
  const keys: string[] = [];

  for (const [key] of cache.entries()) {
    try {
      const parsed = JSON.parse(key) as QueryKey;
      if (matchesQueryKey(parsed, pattern)) {
        keys.push(key);
      }
    } catch {
      // Invalid key, skip
    }
  }

  return keys;
}

/**
 * Type-safe query key inference
 */
export type InferQueryKey<T extends (...args: any[]) => QueryKey> = ReturnType<T>;

/**
 * Examples:
 *
 * // List queries with filters
 * const jobsKey = queryKeys.jobs.list({ status: 'scheduled', companyId: '123' });
 * // ['data', 'jobs', 'list', { status: 'scheduled', companyId: '123' }]
 *
 * // Detail queries
 * const jobKey = queryKeys.jobs.detail('job-001');
 * // ['data', 'jobs', 'detail', 'job-001']
 *
 * // Invalidate all jobs
 * queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all() });
 *
 * // Invalidate specific job
 * queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail('job-001') });
 *
 * // Invalidate all lists but not details
 * queryClient.invalidateQueries({ queryKey: queryKeys.jobs.lists() });
 */

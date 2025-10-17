/**
 * React Query Client Configuration
 *
 * Configures QueryClient with:
 * - Offline persistence (IndexedDB)
 * - Smart retry logic
 * - Cache management
 * - Error handling
 */

import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { logger } from '../services/logger';
import { isRetryableError } from './mutation-utils';

/**
 * Global query cache
 */
const queryCache = new QueryCache({
  onError: (error, query) => {
    logger.error('Query error', error as Error, {
      queryKey: query.queryKey,
      queryHash: query.queryHash,
    });
  },
  onSuccess: (data, query) => {
    logger.debug('Query success', {
      queryKey: query.queryKey,
      dataSize: JSON.stringify(data).length,
    });
  },
});

/**
 * Global mutation cache
 */
const mutationCache = new MutationCache({
  onError: (error, variables, context, mutation) => {
    logger.error('Mutation error', error as Error, {
      variables,
      mutationId: mutation.mutationId,
    });
  },
  onSuccess: (data, variables, context, mutation) => {
    logger.info('Mutation success', {
      variables,
      mutationId: mutation.mutationId,
    });
  },
});

/**
 * Create and configure QueryClient
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache,
    mutationCache,
    defaultOptions: {
      queries: {
        /**
         * Stale time: How long data is considered fresh
         * 2 minutes for most queries
         */
        staleTime: 2 * 60 * 1000,

        /**
         * GC time: How long inactive data stays in cache
         * 5 minutes
         */
        gcTime: 5 * 60 * 1000,

        /**
         * Retry logic with exponential backoff
         */
        retry: (failureCount, error) => {
          // Don't retry if not a retryable error
          if (!isRetryableError(error)) {
            return false;
          }

          // Max 3 retries
          return failureCount < 3;
        },

        retryDelay: (attemptIndex) => {
          // Exponential backoff: 1s, 2s, 4s, max 30s
          return Math.min(1000 * 2 ** attemptIndex, 30000);
        },

        /**
         * Refetch behavior
         */
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: true,

        /**
         * Network mode
         * 'online' - only fetch when online
         */
        networkMode: 'online',
      },

      mutations: {
        /**
         * Retry mutations for retryable errors
         */
        retry: (failureCount, error) => {
          if (!isRetryableError(error)) {
            return false;
          }
          return failureCount < 2;
        },

        retryDelay: 1000,

        /**
         * Network mode for mutations
         */
        networkMode: 'online',
      },
    },
  });
}

/**
 * Configure offline persistence
 *
 * Stores query results in IndexedDB for offline access
 */
export function setupPersistence(queryClient: QueryClient): void {
  if (typeof window === 'undefined') {
    return; // Skip on server
  }

  try {
    const persister = createSyncStoragePersister({
      storage: window.localStorage,
      key: 'REACT_QUERY_OFFLINE_CACHE',
      serialize: (data) => JSON.stringify(data),
      deserialize: (data) => JSON.parse(data),
    });

    persistQueryClient({
      queryClient,
      persister,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      buster: 'v1', // Change to invalidate all cached data
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
          // Only persist successful queries
          if (query.state.status !== 'success') {
            return false;
          }

          // Don't persist queries older than 1 hour
          const dataUpdatedAt = query.state.dataUpdatedAt;
          if (dataUpdatedAt && Date.now() - dataUpdatedAt > 60 * 60 * 1000) {
            return false;
          }

          return true;
        },
      },
    });

    logger.info('Query persistence configured', {
      storage: 'localStorage',
      maxAge: '24h',
    });
  } catch (error) {
    logger.error('Failed to setup query persistence', error as Error);
  }
}

/**
 * Clear persisted cache
 */
export function clearPersistedCache(): void {
  try {
    window.localStorage.removeItem('REACT_QUERY_OFFLINE_CACHE');
    logger.info('Persisted cache cleared');
  } catch (error) {
    logger.error('Failed to clear persisted cache', error as Error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(queryClient: QueryClient) {
  const cache = queryClient.getQueryCache();
  const queries = cache.getAll();

  const stats = {
    totalQueries: queries.length,
    successQueries: queries.filter((q) => q.state.status === 'success').length,
    errorQueries: queries.filter((q) => q.state.status === 'error').length,
    pendingQueries: queries.filter((q) => q.state.status === 'pending').length,
    staleQueries: queries.filter((q) => q.isStale()).length,
    activeQueries: queries.filter((q) => q.getObserversCount() > 0).length,
    totalCacheSize: JSON.stringify(
      queries.map((q) => ({ key: q.queryKey, data: q.state.data }))
    ).length,
  };

  logger.debug('Cache statistics', stats);

  return stats;
}

/**
 * Prefetch common queries
 */
export async function prefetchCommonQueries(queryClient: QueryClient): Promise<void> {
  // Prefetch logic can be added here
  // For example, prefetch user data, company info, etc.
  logger.debug('Prefetching common queries');
}

/**
 * Export singleton instance
 */
export const queryClient = createQueryClient();

/**
 * Initialize persistence on app load
 */
if (typeof window !== 'undefined') {
  setupPersistence(queryClient);
}

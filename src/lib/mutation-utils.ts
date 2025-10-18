/**
 * React Query Mutation Utilities
 *
 * Provides reusable patterns for mutations with:
 * - Optimistic updates with automatic rollback
 * - Error recovery strategies
 * - Cache invalidation
 * - Success/error notifications
 */

import { QueryClient, UseMutationOptions, MutationFunction } from '@tanstack/react-query';
import { logger } from '../services/logger';
import { FirebaseError } from '../services/errors';
import {
  updateWithRetry,
  type VersionedDocument,
  type ConflictStrategy,
  type ConflictResolutionResult,
  getConflictMessage,
} from './conflict-resolution';
import type { DocumentReference, Firestore } from 'firebase/firestore';

/**
 * Mutation context for rollback
 */
export interface MutationContext<TData = unknown> {
  previousData?: TData;
  optimisticData?: TData;
  timestamp: number;
}

/**
 * Options for optimistic updates
 */
export interface OptimisticUpdateOptions<TData, TVariables> {
  /**
   * Query key to update optimistically
   */
  queryKey: readonly unknown[];

  /**
   * Function to generate optimistic data
   */
  updater: (oldData: TData | undefined, variables: TVariables) => TData;

  /**
   * Query client instance
   */
  queryClient: QueryClient;
}

/**
 * Create optimistic update handlers
 */
export function createOptimisticUpdate<TData, TVariables>(
  options: OptimisticUpdateOptions<TData, TVariables>,
) {
  const { queryKey, updater, queryClient } = options;

  return {
    /**
     * Called before mutation
     */
    onMutate: async (variables: TVariables): Promise<MutationContext<TData>> => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update cache
      if (previousData !== undefined) {
        const optimisticData = updater(previousData, variables);
        queryClient.setQueryData(queryKey, optimisticData);

        logger.debug('Optimistic update applied', {
          queryKey,
          previousData,
          optimisticData,
        });

        return {
          previousData,
          optimisticData,
          timestamp: Date.now(),
        };
      }

      return { timestamp: Date.now() };
    },

    /**
     * Called on error - rollback optimistic update
     */
    onError: (
      error: unknown,
      variables: TVariables,
      context: MutationContext<TData> | undefined,
    ) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);

        logger.warn('Optimistic update rolled back', {
          queryKey,
          error,
          duration: Date.now() - context.timestamp,
        });
      }
    },

    /**
     * Called on success or error - refetch to ensure consistency
     */
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });

      logger.debug('Query invalidated after mutation', { queryKey });
    },
  };
}

/**
 * Error recovery strategies
 */
export enum RetryStrategy {
  /**
   * No retry
   */
  NONE = 'none',

  /**
   * Retry with exponential backoff
   */
  EXPONENTIAL = 'exponential',

  /**
   * Retry immediately
   */
  IMMEDIATE = 'immediate',

  /**
   * Retry on network errors only
   */
  NETWORK_ONLY = 'network_only',
}

/**
 * Determine if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof FirebaseError) {
    const retryableCodes = [
      'unavailable',
      'deadline-exceeded',
      'resource-exhausted',
      'aborted',
      'internal',
    ];
    return retryableCodes.includes(error.code);
  }

  // Network errors
  if (error instanceof Error) {
    const networkMessages = ['network', 'timeout', 'fetch', 'connection'];
    return networkMessages.some((msg) => error.message.toLowerCase().includes(msg));
  }

  return false;
}

/**
 * Get retry configuration for strategy
 */
export function getRetryConfig(strategy: RetryStrategy) {
  switch (strategy) {
    case RetryStrategy.NONE:
      return {
        retry: false,
      };

    case RetryStrategy.EXPONENTIAL:
      return {
        retry: 3,
        retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      };

    case RetryStrategy.IMMEDIATE:
      return {
        retry: 2,
        retryDelay: 0,
      };

    case RetryStrategy.NETWORK_ONLY:
      return {
        retry: (failureCount: number, error: unknown) => {
          if (failureCount >= 3) return false;
          return isRetryableError(error);
        },
        retryDelay: 1000,
      };

    default:
      return { retry: false };
  }
}

/**
 * Create mutation options with common patterns
 */
export interface CreateMutationOptions<TData, TVariables, TContext = unknown> {
  /**
   * Mutation function
   */
  mutationFn: MutationFunction<TData, TVariables>;

  /**
   * Query keys to invalidate on success
   */
  invalidateKeys?: readonly (readonly unknown[])[];

  /**
   * Optimistic update configuration
   */
  optimistic?: OptimisticUpdateOptions<unknown, TVariables>;

  /**
   * Retry strategy
   */
  retryStrategy?: RetryStrategy;

  /**
   * Query client
   */
  queryClient: QueryClient;

  /**
   * Success callback
   */
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;

  /**
   * Error callback
   */
  onError?: (error: unknown, variables: TVariables) => void;

  /**
   * Custom context
   */
  onMutate?: (variables: TVariables) => Promise<TContext>;
}

/**
 * Create standardized mutation options
 */
export function createMutationOptions<TData, TVariables, TContext = unknown>(
  options: CreateMutationOptions<TData, TVariables, TContext>,
): UseMutationOptions<TData, unknown, TVariables, TContext> {
  const {
    mutationFn,
    invalidateKeys = [],
    optimistic,
    retryStrategy = RetryStrategy.NETWORK_ONLY,
    queryClient,
    onSuccess: customOnSuccess,
    onError: customOnError,
    onMutate: customOnMutate,
  } = options;

  // Get retry config
  const retryConfig = getRetryConfig(retryStrategy);

  // Build optimistic update handlers
  const optimisticHandlers = optimistic ? createOptimisticUpdate(optimistic) : {};

  return {
    mutationFn,
    ...retryConfig,

    onMutate: async (variables: TVariables) => {
      // Run custom onMutate first
      const customContext = customOnMutate ? await customOnMutate(variables) : undefined;

      // Then run optimistic update
      const optimisticContext = optimisticHandlers.onMutate
        ? await optimisticHandlers.onMutate(variables)
        : undefined;

      return {
        custom: customContext,
        optimistic: optimisticContext,
      } as TContext;
    },

    onSuccess: async (data: TData, variables: TVariables) => {
      // Invalidate related queries
      for (const queryKey of invalidateKeys) {
        await queryClient.invalidateQueries({ queryKey });
      }

      // Run custom success handler
      if (customOnSuccess) {
        await customOnSuccess(data, variables);
      }

      logger.info('Mutation succeeded', {
        variables,
        invalidatedKeys: invalidateKeys.length,
      });
    },

    onError: (error: unknown, variables: TVariables, context: TContext) => {
      // Rollback optimistic update
      if (optimisticHandlers.onError) {
        const optimisticContext = (context as Record<string, unknown>)?.optimistic as
          | MutationContext
          | undefined;
        optimisticHandlers.onError(error, variables, optimisticContext);
      }

      // Run custom error handler
      if (customOnError) {
        customOnError(error, variables);
      }

      logger.error('Mutation failed', error as Error, {
        variables,
      });
    },

    onSettled: () => {
      // Ensure consistency
      if (optimisticHandlers.onSettled) {
        optimisticHandlers.onSettled();
      }
    },
  };
}

/**
 * Create a mutation with standard error handling
 */
export function createStandardMutation<TData, TVariables>(
  mutationFn: MutationFunction<TData, TVariables>,
  queryClient: QueryClient,
  invalidateKeys: readonly (readonly unknown[])[],
) {
  return createMutationOptions({
    mutationFn,
    queryClient,
    invalidateKeys,
    retryStrategy: RetryStrategy.NETWORK_ONLY,
  });
}

/**
 * Create a mutation with optimistic updates
 */
export function createOptimisticMutation<TData, TVariables>(
  mutationFn: MutationFunction<TData, TVariables>,
  queryClient: QueryClient,
  optimistic: OptimisticUpdateOptions<TData, TVariables>,
  invalidateKeys: readonly (readonly unknown[])[] = [],
) {
  return createMutationOptions({
    mutationFn,
    queryClient,
    optimistic,
    invalidateKeys,
    retryStrategy: RetryStrategy.NETWORK_ONLY,
  });
}

/**
 * Batch mutation helper
 * Useful for bulk operations
 */
export async function executeBatchMutation<T>(
  items: T[],
  mutationFn: (item: T) => Promise<void>,
  options: {
    batchSize?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {},
): Promise<void> {
  const { batchSize = 10, onProgress } = options;
  const total = items.length;
  let completed = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (item) => {
        await mutationFn(item);
        completed++;
        if (onProgress) {
          onProgress(completed, total);
        }
      }),
    );
  }

  logger.info('Batch mutation completed', {
    total,
    batchSize,
  });
}

/**
 * Create a version-aware mutation with conflict resolution
 * Automatically handles conflicts using the specified strategy
 */
export interface VersionAwareMutationOptions<TData extends VersionedDocument, TVariables> {
  /**
   * Firestore instance
   */
  db: Firestore;

  /**
   * Document reference resolver
   */
  getDocRef: (variables: TVariables) => DocumentReference;

  /**
   * Data mapper
   */
  mapData: (variables: TVariables) => Partial<TData>;

  /**
   * User ID for tracking changes
   */
  userId: string;

  /**
   * Conflict resolution strategy
   */
  conflictStrategy?: ConflictStrategy;

  /**
   * Maximum retry attempts for conflict resolution
   */
  maxRetries?: number;

  /**
   * Query client
   */
  queryClient: QueryClient;

  /**
   * Query keys to invalidate on success
   */
  invalidateKeys?: readonly (readonly unknown[])[];

  /**
   * Custom success handler
   */
  onSuccess?: (result: ConflictResolutionResult<TData>, variables: TVariables) => void;

  /**
   * Custom conflict handler (called when conflict cannot be auto-resolved)
   */
  onConflict?: (result: ConflictResolutionResult<TData>, variables: TVariables) => void;
}

/**
 * Create a mutation function with version-based conflict resolution
 */
export function createVersionAwareMutation<TData extends VersionedDocument, TVariables>(
  options: VersionAwareMutationOptions<TData, TVariables>,
): MutationFunction<ConflictResolutionResult<TData>, TVariables> {
  const {
    db,
    getDocRef,
    mapData,
    userId,
    conflictStrategy = 'last-write-wins',
    maxRetries = 3,
  } = options;

  return async (variables: TVariables): Promise<ConflictResolutionResult<TData>> => {
    const docRef = getDocRef(variables);
    const data = mapData(variables);

    logger.debug('Starting version-aware update', {
      docId: docRef.id,
      strategy: conflictStrategy,
      maxRetries,
    });

    const result = await updateWithRetry<TData>(
      db,
      docRef,
      data,
      userId,
      conflictStrategy,
      maxRetries,
    );

    if (!result.success) {
      if (result.conflict) {
        logger.warn('Conflict could not be auto-resolved', {
          docId: docRef.id,
          conflict: result.conflict,
        });

        // Call custom conflict handler if provided
        if (options.onConflict) {
          options.onConflict(result, variables);
        }
      }

      // Throw error to trigger React Query error handling
      const message = result.conflict
        ? getConflictMessage(result.conflict)
        : result.message || 'Update failed';

      throw new Error(message);
    }

    logger.info('Version-aware update succeeded', {
      docId: docRef.id,
      newVersion: result.resolvedData?.version,
    });

    return result;
  };
}

/**
 * Create complete mutation options with version awareness
 */
export function createVersionAwareMutationOptions<TData extends VersionedDocument, TVariables>(
  options: VersionAwareMutationOptions<TData, TVariables>,
): UseMutationOptions<ConflictResolutionResult<TData>, unknown, TVariables> {
  const mutationFn = createVersionAwareMutation(options);

  return {
    mutationFn,
    ...getRetryConfig(RetryStrategy.NETWORK_ONLY),

    onSuccess: async (result, variables) => {
      // Invalidate related queries
      if (options.invalidateKeys) {
        for (const queryKey of options.invalidateKeys) {
          await options.queryClient.invalidateQueries({ queryKey });
        }
      }

      // Call custom success handler
      if (options.onSuccess) {
        options.onSuccess(result, variables);
      }

      logger.info('Version-aware mutation succeeded', {
        variables,
        version: result.resolvedData?.version,
      });
    },

    onError: (error: unknown, variables: TVariables) => {
      logger.error('Version-aware mutation failed', error as Error, {
        variables,
      });
    },
  };
}

/**
 * Helper to check if an error is a conflict error
 */
export function isConflictError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('conflict') ||
      error.message.includes('version') ||
      error.message.includes('modified by another user')
    );
  }
  return false;
}

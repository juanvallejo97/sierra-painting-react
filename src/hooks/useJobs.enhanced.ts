/**
 * Enhanced Jobs Hook with Converters and Optimistic Updates
 *
 * This is the enhanced version using:
 * - Type-safe converters
 * - Standardized query keys
 * - Optimistic updates
 * - Offline persistence
 * - Error recovery
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth-context';
import { queryKeys, type JobFilter } from '../lib/query-keys';
import {
  jobConverter,
  type Job,
  type JobDocument,
  type CreateJobInput,
  type UpdateJobInput,
  validateCreateJob,
  validateUpdateJob,
} from '../lib/converters';
import {
  createOptimisticMutation,
  createStandardMutation,
  RetryStrategy,
} from '../lib/mutation-utils';
import { logger } from '../services/logger';

/**
 * Fetch all jobs for the current company with optional filters
 */
export function useJobsEnhanced(filters?: JobFilter) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.jobs.list(filters),
    queryFn: async (): Promise<JobDocument[]> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!user.companyId) {
        throw new Error(
          `User ${user.email} is not assigned to a company. Please contact your administrator.`
        );
      }

      const jobsRef = collection(db, 'jobs').withConverter(jobConverter);

      // Build query
      let q = query(
        jobsRef,
        where('companyId', '==', user.companyId),
        orderBy('startDate', 'desc')
      );

      // Apply status filter
      if (filters?.status && filters.status !== 'all') {
        q = query(
          jobsRef,
          where('companyId', '==', user.companyId),
          where('status', '==', filters.status),
          orderBy('startDate', 'desc')
        );
      }

      // Apply worker filter
      if (filters?.workerId) {
        q = query(
          jobsRef,
          where('companyId', '==', user.companyId),
          where('workers', 'array-contains', filters.workerId),
          orderBy('startDate', 'desc')
        );
      }

      const snapshot = await getDocs(q);

      logger.debug('Jobs fetched', {
        count: snapshot.size,
        filters,
      });

      // Converter handles type conversion automatically
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          startDate: data.startDate instanceof Date ? data.startDate : new Date(data.startDate as any),
          endDate: data.endDate instanceof Date ? data.endDate : (data.endDate ? new Date(data.endDate as any) : undefined),
          createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(),
          updatedAt: data.updatedAt instanceof Date ? data.updatedAt : new Date(),
        } as JobDocument;
      });
    },
    enabled: !!user?.companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Fetch a single job by ID
 */
export function useJobEnhanced(jobId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.jobs.detail(jobId!),
    queryFn: async (): Promise<JobDocument> => {
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      const jobRef = doc(db, 'jobs', jobId).withConverter(jobConverter);
      const snapshot = await getDoc(jobRef);

      if (!snapshot.exists()) {
        throw new Error('Job not found');
      }

      const data = snapshot.data();

      // Security: Verify job belongs to same company
      if (data.companyId !== user?.companyId) {
        throw new Error('Unauthorized access to job');
      }

      logger.debug('Job fetched', { jobId });

      return {
        ...data,
        startDate: data.startDate instanceof Date ? data.startDate : new Date(data.startDate as any),
        endDate: data.endDate instanceof Date ? data.endDate : (data.endDate ? new Date(data.endDate as any) : undefined),
        createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(),
        updatedAt: data.updatedAt instanceof Date ? data.updatedAt : new Date(),
      } as JobDocument;
    },
    enabled: !!jobId && !!user?.companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Create a new job with validation
 */
export function useCreateJobEnhanced() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation(
    createStandardMutation(
      async (input: Partial<CreateJobInput>) => {
        if (!user?.companyId) {
          throw new Error(
            'Your account is not assigned to a company. Please contact your administrator.'
          );
        }

        // Validate input with Zod
        const validatedData = validateCreateJob({
          ...input,
          companyId: user.companyId,
          status: 'scheduled',
          workers: input.workers || [],
        });

        const jobsRef = collection(db, 'jobs').withConverter(jobConverter);

        logger.info('Creating job', { name: validatedData.name });

        const docRef = await addDoc(jobsRef, {
          ...validatedData,
          startDate: new Date(validatedData.startDate as any),
          endDate: validatedData.endDate ? new Date(validatedData.endDate as any) : undefined,
        } as any);

        return docRef.id;
      },
      queryClient,
      [
        queryKeys.jobs.all(),
        queryKeys.jobs.lists(),
      ]
    )
  );

  return mutation;
}

/**
 * Update an existing job with optimistic updates
 */
export function useUpdateJobEnhanced() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation(
    createOptimisticMutation(
      async ({ id, data }: { id: string; data: Partial<UpdateJobInput> }) => {
        const jobRef = doc(db, 'jobs', id);

        // Verify job exists and belongs to same company
        const snapshot = await getDoc(jobRef);
        if (!snapshot.exists()) {
          throw new Error('Job not found');
        }

        const jobData = snapshot.data();
        if (jobData.companyId !== user?.companyId) {
          throw new Error('Unauthorized access');
        }

        // Validate update data
        const validatedData = validateUpdateJob(data);

        logger.info('Updating job', { jobId: id, changes: Object.keys(validatedData) });

        await updateDoc(jobRef, validatedData as any);

        return id;
      },
      queryClient,
      {
        queryKey: queryKeys.jobs.detail('optimistic'),
        queryClient,
        updater: (oldData: JobDocument[] | undefined, variables) => {
          if (!oldData) return oldData;

          return oldData.map((job) =>
            job.id === variables.id
              ? { ...job, ...variables.data, updatedAt: new Date() }
              : job
          );
        },
      },
      [
        queryKeys.jobs.all(),
        queryKeys.jobs.detail(''),
      ]
    )
  );

  return mutation;
}

/**
 * Delete a job with optimistic updates
 */
export function useDeleteJobEnhanced() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation(
    createOptimisticMutation(
      async (jobId: string) => {
        const jobRef = doc(db, 'jobs', jobId);

        // Verify job exists and belongs to same company
        const snapshot = await getDoc(jobRef);
        if (!snapshot.exists()) {
          throw new Error('Job not found');
        }

        const jobData = snapshot.data();
        if (jobData.companyId !== user?.companyId) {
          throw new Error('Unauthorized access');
        }

        logger.info('Deleting job', { jobId });

        await deleteDoc(jobRef);

        return jobId;
      },
      queryClient,
      {
        queryKey: queryKeys.jobs.lists(),
        queryClient,
        updater: (oldData: JobDocument[] | undefined, jobId: string) => {
          if (!oldData) return oldData;
          return oldData.filter((job) => job.id !== jobId);
        },
      },
      [
        queryKeys.jobs.all(),
        queryKeys.jobs.detail(''),
      ]
    )
  );

  return mutation;
}

/**
 * Bulk update jobs (useful for batch operations)
 */
export function useBulkUpdateJobs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Array<{ id: string; data: Partial<UpdateJobInput> }>) => {
      if (!user?.companyId) {
        throw new Error('User not assigned to a company');
      }

      logger.info('Bulk updating jobs', { count: updates.length });

      // Process updates sequentially to avoid race conditions
      const results = [];
      for (const update of updates) {
        const jobRef = doc(db, 'jobs', update.id);

        // Verify ownership
        const snapshot = await getDoc(jobRef);
        if (!snapshot.exists()) {
          throw new Error(`Job ${update.id} not found`);
        }

        const jobData = snapshot.data();
        if (jobData.companyId !== user.companyId) {
          throw new Error(`Unauthorized access to job ${update.id}`);
        }

        // Validate and update
        const validatedData = validateUpdateJob(update.data);
        await updateDoc(jobRef, validatedData as any);

        results.push(update.id);
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all() });
    },
    retry: 1,
    retryDelay: 1000,
  });
}

/**
 * Get jobs by status (convenience hook)
 */
export function useJobsByStatus(status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled') {
  return useJobsEnhanced({ status });
}

/**
 * Get jobs assigned to a worker
 */
export function useJobsByWorker(workerId: string) {
  return useJobsEnhanced({ workerId });
}

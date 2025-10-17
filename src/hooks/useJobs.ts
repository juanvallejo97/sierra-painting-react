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
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth-context';

export type JobStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

export interface Job {
  id: string;
  name: string;
  address: string;
  status: JobStatus;
  startDate: string;
  endDate?: string;
  workers: string[]; // Employee IDs
  workerNames?: string[]; // For display purposes
  description?: string;
  notes?: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateJobData {
  name: string;
  address: string;
  startDate: string;
  endDate?: string;
  workers: string[];
  description?: string;
  notes?: string;
}

export interface UpdateJobData extends Partial<CreateJobData> {
  status?: JobStatus;
}

/**
 * Fetch all jobs for the current company
 */
export function useJobs(statusFilter?: JobStatus) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['jobs', user?.companyId, statusFilter],
    queryFn: async () => {
      if (!user?.companyId) {
        throw new Error('User must belong to a company');
      }

      const jobsRef = collection(db, 'jobs');
      let q = query(
        jobsRef,
        where('companyId', '==', user.companyId),
        orderBy('startDate', 'desc')
      );

      if (statusFilter) {
        q = query(
          jobsRef,
          where('companyId', '==', user.companyId),
          where('status', '==', statusFilter),
          orderBy('startDate', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          address: data.address,
          status: data.status,
          startDate: data.startDate,
          endDate: data.endDate,
          workers: data.workers || [],
          workerNames: data.workerNames || [],
          description: data.description,
          notes: data.notes,
          companyId: data.companyId,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Job;
      });
    },
    enabled: !!user?.companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch a single job by ID
 */
export function useJob(jobId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      const jobRef = doc(db, 'jobs', jobId);
      const snapshot = await getDoc(jobRef);

      if (!snapshot.exists()) {
        throw new Error('Job not found');
      }

      const data = snapshot.data();

      // Security: Verify job belongs to same company
      if (data.companyId !== user?.companyId) {
        throw new Error('Unauthorized access');
      }

      return {
        id: snapshot.id,
        name: data.name,
        address: data.address,
        status: data.status,
        startDate: data.startDate,
        endDate: data.endDate,
        workers: data.workers || [],
        workerNames: data.workerNames || [],
        description: data.description,
        notes: data.notes,
        companyId: data.companyId,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Job;
    },
    enabled: !!jobId && !!user?.companyId,
  });
}

/**
 * Create a new job
 */
export function useCreateJob() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateJobData) => {
      if (!user?.companyId) {
        throw new Error('User must belong to a company');
      }

      const jobsRef = collection(db, 'jobs');
      const docRef = await addDoc(jobsRef, {
        name: data.name,
        address: data.address,
        status: 'scheduled' as JobStatus,
        startDate: data.startDate,
        endDate: data.endDate,
        workers: data.workers,
        description: data.description,
        notes: data.notes,
        companyId: user.companyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', user?.companyId] });
    },
  });
}

/**
 * Update an existing job
 */
export function useUpdateJob() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateJobData }) => {
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

      const updateData: any = {
        updatedAt: serverTimestamp(),
      };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.startDate !== undefined) updateData.startDate = data.startDate;
      if (data.endDate !== undefined) updateData.endDate = data.endDate;
      if (data.workers !== undefined) updateData.workers = data.workers;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.notes !== undefined) updateData.notes = data.notes;

      await updateDoc(jobRef, updateData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['jobs', user?.companyId] });
      queryClient.invalidateQueries({ queryKey: ['job', variables.id] });
    },
  });
}

/**
 * Delete a job
 */
export function useDeleteJob() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
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

      await deleteDoc(jobRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', user?.companyId] });
    },
  });
}

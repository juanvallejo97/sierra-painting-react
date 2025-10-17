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
  client: string; // Customer/client name
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
  client: string;
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
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!user.companyId) {
        console.error('User missing companyId:', user);
        throw new Error('Error loading ' + user.email + ': User account is not assigned to a company. Please contact your administrator.');
      }

      try {
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
            client: data.client || '',
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
      } catch (error: any) {
        console.error('Error fetching jobs:', error);
        if (error.code === 'permission-denied') {
          throw new Error('Access denied. Please check your account permissions.');
        }
        throw error;
      }
    },
    enabled: !!user?.companyId,
    retry: 2,
    retryDelay: 1000,
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
        client: data.client || '',
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
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!user.companyId) {
        console.error('Cannot create job - user missing companyId:', user);
        throw new Error('Error loading ' + user.email + ': Your account is not assigned to a company. Please contact your administrator.');
      }

      try {
        const jobsRef = collection(db, 'jobs');
        const jobData = {
          name: data.name,
          client: data.client,
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
        };

        console.log('Creating job with data:', jobData);
        const docRef = await addDoc(jobsRef, jobData);
        console.log('Job created successfully:', docRef.id);

        return docRef.id;
      } catch (error: any) {
        console.error('Error creating job:', error);
        if (error.code === 'permission-denied') {
          throw new Error('Access denied. You do not have permission to create jobs.');
        }
        if (error.message?.includes('companyId')) {
          throw new Error('Failed to create job: Your account is missing required company information. Please contact your administrator.');
        }
        throw new Error('Failed to create job: ' + error.message);
      }
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
      if (data.client !== undefined) updateData.client = data.client;
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

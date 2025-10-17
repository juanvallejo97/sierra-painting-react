/**
 * Scheduler Hook
 *
 * Manages job scheduling, crew assignments, and availability tracking.
 * Includes conflict detection and optimization suggestions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth-context';
import { startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';

/**
 * Employee availability status
 */
export type AvailabilityStatus = 'available' | 'unavailable' | 'time-off' | 'partially-available';

/**
 * Time off request status
 */
export type TimeOffStatus = 'pending' | 'approved' | 'rejected';

/**
 * Employee availability record
 */
export interface EmployeeAvailability {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // ISO date string
  status: AvailabilityStatus;
  startTime?: string; // HH:mm format for partial availability
  endTime?: string; // HH:mm format for partial availability
  notes?: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Time off request
 */
export interface TimeOffRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  reason?: string;
  status: TimeOffStatus;
  requestedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  companyId: string;
}

/**
 * Crew template for quick assignment
 */
export interface CrewTemplate {
  id: string;
  name: string;
  description?: string;
  employeeIds: string[];
  employees?: { id: string; name: string; role: string }[];
  jobType?: string; // e.g., 'interior', 'exterior', 'commercial'
  estimatedDuration?: number; // hours
  companyId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Job assignment (links employees to jobs)
 */
export interface JobAssignment {
  id: string;
  jobId: string;
  jobTitle: string;
  employeeId: string;
  employeeName: string;
  assignedDate: string; // ISO date string
  startTime?: string; // HH:mm format
  endTime?: string; // HH:mm format
  role?: string; // 'lead', 'painter', 'helper'
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  companyId: string;
  assignedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Scheduling conflict
 */
export interface SchedulingConflict {
  type: 'double-booking' | 'unavailable' | 'time-off' | 'capacity-exceeded';
  employeeId: string;
  employeeName: string;
  date: string;
  conflictingAssignments?: JobAssignment[];
  availability?: EmployeeAvailability;
  timeOffRequest?: TimeOffRequest;
  message: string;
}

/**
 * Fetch time off requests
 */
export function useTimeOffRequests(status?: TimeOffStatus) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['time-off-requests', user?.companyId, status],
    queryFn: async (): Promise<TimeOffRequest[]> => {
      if (!user?.companyId) {
        throw new Error('User must belong to a company');
      }

      const timeOffRef = collection(db, 'timeOffRequests');
      let q = query(
        timeOffRef,
        where('companyId', '==', user.companyId)
      );

      if (status) {
        q = query(q, where('status', '==', status));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          startDate: data.startDate,
          endDate: data.endDate,
          reason: data.reason,
          status: data.status,
          requestedAt: data.requestedAt?.toDate(),
          reviewedAt: data.reviewedAt?.toDate(),
          reviewedBy: data.reviewedBy,
          companyId: data.companyId,
        };
      });
    },
    enabled: !!user?.companyId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Create time off request
 */
export function useCreateTimeOffRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      employeeId: string;
      employeeName: string;
      startDate: string;
      endDate: string;
      reason?: string;
    }) => {
      if (!user?.companyId) {
        throw new Error('User must belong to a company');
      }

      const timeOffRef = collection(db, 'timeOffRequests');
      const docRef = await addDoc(timeOffRef, {
        ...data,
        status: 'pending',
        requestedAt: serverTimestamp(),
        companyId: user.companyId,
      });

      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off-requests'] });
    },
  });
}

/**
 * Review time off request (approve/reject)
 */
export function useReviewTimeOffRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      requestId: string;
      status: 'approved' | 'rejected';
    }) => {
      const requestRef = doc(db, 'timeOffRequests', data.requestId);
      await updateDoc(requestRef, {
        status: data.status,
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off-requests'] });
      queryClient.invalidateQueries({ queryKey: ['employee-availability'] });
    },
  });
}

/**
 * Fetch crew templates
 */
export function useCrewTemplates() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['crew-templates', user?.companyId],
    queryFn: async (): Promise<CrewTemplate[]> => {
      if (!user?.companyId) {
        throw new Error('User must belong to a company');
      }

      const templatesRef = collection(db, 'crewTemplates');
      const q = query(
        templatesRef,
        where('companyId', '==', user.companyId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          employeeIds: data.employeeIds || [],
          employees: data.employees,
          jobType: data.jobType,
          estimatedDuration: data.estimatedDuration,
          companyId: data.companyId,
          createdBy: data.createdBy,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        };
      });
    },
    enabled: !!user?.companyId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create crew template
 */
export function useCreateCrewTemplate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      employeeIds: string[];
      employees: { id: string; name: string; role: string }[];
      jobType?: string;
      estimatedDuration?: number;
    }) => {
      if (!user?.companyId) {
        throw new Error('User must belong to a company');
      }

      const templatesRef = collection(db, 'crewTemplates');
      const docRef = await addDoc(templatesRef, {
        ...data,
        companyId: user.companyId,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crew-templates'] });
    },
  });
}

/**
 * Delete crew template
 */
export function useDeleteCrewTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const templateRef = doc(db, 'crewTemplates', templateId);
      await deleteDoc(templateRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crew-templates'] });
    },
  });
}

/**
 * Fetch job assignments for a date range
 */
export function useJobAssignments(startDate: Date, endDate: Date) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['job-assignments', user?.companyId, startDate.toISOString(), endDate.toISOString()],
    queryFn: async (): Promise<JobAssignment[]> => {
      if (!user?.companyId) {
        throw new Error('User must belong to a company');
      }

      const assignmentsRef = collection(db, 'jobAssignments');
      const q = query(
        assignmentsRef,
        where('companyId', '==', user.companyId),
        where('assignedDate', '>=', startDate.toISOString().split('T')[0]),
        where('assignedDate', '<=', endDate.toISOString().split('T')[0])
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          jobId: data.jobId,
          jobTitle: data.jobTitle,
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          assignedDate: data.assignedDate,
          startTime: data.startTime,
          endTime: data.endTime,
          role: data.role,
          status: data.status,
          companyId: data.companyId,
          assignedBy: data.assignedBy,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        };
      });
    },
    enabled: !!user?.companyId,
    staleTime: 1 * 60 * 1000, // 1 minute - shorter cache for scheduling
  });
}

/**
 * Create job assignment
 */
export function useCreateJobAssignment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      jobId: string;
      jobTitle: string;
      employeeId: string;
      employeeName: string;
      assignedDate: string;
      startTime?: string;
      endTime?: string;
      role?: string;
    }) => {
      if (!user?.companyId) {
        throw new Error('User must belong to a company');
      }

      // Check for conflicts before creating
      const conflicts = await checkSchedulingConflicts(
        data.employeeId,
        data.assignedDate,
        user.companyId
      );

      if (conflicts.length > 0) {
        throw new Error(`Scheduling conflicts detected: ${conflicts.map(c => c.message).join(', ')}`);
      }

      const assignmentsRef = collection(db, 'jobAssignments');
      const docRef = await addDoc(assignmentsRef, {
        ...data,
        status: 'scheduled',
        companyId: user.companyId,
        assignedBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-assignments'] });
    },
  });
}

/**
 * Delete job assignment
 */
export function useDeleteJobAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const assignmentRef = doc(db, 'jobAssignments', assignmentId);
      await deleteDoc(assignmentRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-assignments'] });
    },
  });
}

/**
 * Apply crew template to a job
 */
export function useApplyCrewTemplate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      templateId: string;
      jobId: string;
      jobTitle: string;
      assignedDate: string;
    }) => {
      if (!user?.companyId) {
        throw new Error('User must belong to a company');
      }

      // Fetch template
      const templatesRef = collection(db, 'crewTemplates');
      const q = query(
        templatesRef,
        where('companyId', '==', user.companyId)
      );
      const snapshot = await getDocs(q);
      const templateDoc = snapshot.docs.find(d => d.id === data.templateId);

      if (!templateDoc) {
        throw new Error('Crew template not found');
      }

      const template = templateDoc.data();
      const assignments: string[] = [];

      // Create assignments for each employee in template
      const assignmentsRef = collection(db, 'jobAssignments');
      for (const employee of template.employees || []) {
        const docRef = await addDoc(assignmentsRef, {
          jobId: data.jobId,
          jobTitle: data.jobTitle,
          employeeId: employee.id,
          employeeName: employee.name,
          assignedDate: data.assignedDate,
          role: employee.role,
          status: 'scheduled',
          companyId: user.companyId,
          assignedBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        assignments.push(docRef.id);
      }

      return assignments;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-assignments'] });
    },
  });
}

/**
 * Check for scheduling conflicts
 */
async function checkSchedulingConflicts(
  employeeId: string,
  date: string,
  companyId: string
): Promise<SchedulingConflict[]> {
  const conflicts: SchedulingConflict[] = [];

  // Check existing assignments
  const assignmentsRef = collection(db, 'jobAssignments');
  const assignmentsQuery = query(
    assignmentsRef,
    where('companyId', '==', companyId),
    where('employeeId', '==', employeeId),
    where('assignedDate', '==', date)
  );
  const assignmentsSnapshot = await getDocs(assignmentsQuery);

  if (!assignmentsSnapshot.empty) {
    const existingAssignments = assignmentsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        jobId: data.jobId,
        jobTitle: data.jobTitle,
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        assignedDate: data.assignedDate,
        startTime: data.startTime,
        endTime: data.endTime,
        role: data.role,
        status: data.status,
        companyId: data.companyId,
        assignedBy: data.assignedBy,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as JobAssignment;
    });

    conflicts.push({
      type: 'double-booking',
      employeeId,
      employeeName: existingAssignments[0].employeeName,
      date,
      conflictingAssignments: existingAssignments,
      message: `Employee is already assigned to ${existingAssignments.length} job(s) on this date`,
    });
  }

  // Check time off requests
  const timeOffRef = collection(db, 'timeOffRequests');
  const timeOffQuery = query(
    timeOffRef,
    where('companyId', '==', companyId),
    where('employeeId', '==', employeeId),
    where('status', '==', 'approved')
  );
  const timeOffSnapshot = await getDocs(timeOffQuery);

  const targetDate = parseISO(date);
  timeOffSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const startDate = parseISO(data.startDate);
    const endDate = parseISO(data.endDate);

    if (isWithinInterval(targetDate, { start: startDate, end: endDate })) {
      conflicts.push({
        type: 'time-off',
        employeeId,
        employeeName: data.employeeName,
        date,
        timeOffRequest: {
          id: doc.id,
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          startDate: data.startDate,
          endDate: data.endDate,
          reason: data.reason,
          status: data.status,
          requestedAt: data.requestedAt?.toDate(),
          reviewedAt: data.reviewedAt?.toDate(),
          reviewedBy: data.reviewedBy,
          companyId: data.companyId,
        },
        message: `Employee has approved time off from ${data.startDate} to ${data.endDate}`,
      });
    }
  });

  return conflicts;
}

/**
 * Get scheduling conflicts for multiple employees and dates
 */
export async function getSchedulingConflicts(
  assignments: { employeeId: string; date: string }[],
  companyId: string
): Promise<SchedulingConflict[]> {
  const allConflicts: SchedulingConflict[] = [];

  for (const assignment of assignments) {
    const conflicts = await checkSchedulingConflicts(
      assignment.employeeId,
      assignment.date,
      companyId
    );
    allConflicts.push(...conflicts);
  }

  return allConflicts;
}

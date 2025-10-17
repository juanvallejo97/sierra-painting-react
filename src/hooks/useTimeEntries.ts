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
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth-context';

export type TimeEntryStatus = 'pending' | 'approved' | 'rejected';

export interface TimeEntry {
  id: string;
  userId: string;
  userName?: string;
  jobId: string;
  jobName?: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  hours: number;
  status: TimeEntryStatus;
  notes?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTimeEntryData {
  jobId: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  notes?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface UpdateTimeEntryData extends Partial<CreateTimeEntryData> {
  status?: TimeEntryStatus;
}

/**
 * Calculate hours between clock in and clock out
 */
function calculateHours(clockIn: string, clockOut?: string): number {
  if (!clockOut) return 0;

  const start = new Date(`1970-01-01T${clockIn}`);
  const end = new Date(`1970-01-01T${clockOut}`);
  const diff = end.getTime() - start.getTime();
  return Math.max(0, diff / (1000 * 60 * 60)); // Convert ms to hours
}

/**
 * Fetch time entries for current user or all if admin
 */
export function useTimeEntries(statusFilter?: TimeEntryStatus) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  return useQuery({
    queryKey: ['timeEntries', user?.companyId, user?.uid, statusFilter, isAdmin],
    queryFn: async () => {
      if (!user?.companyId) {
        throw new Error('User must belong to a company');
      }

      const timeEntriesRef = collection(db, 'timeEntries');
      let q;

      if (isAdmin) {
        // Admins see all entries
        q = statusFilter
          ? query(
              timeEntriesRef,
              where('companyId', '==', user.companyId),
              where('status', '==', statusFilter),
              orderBy('date', 'desc')
            )
          : query(
              timeEntriesRef,
              where('companyId', '==', user.companyId),
              orderBy('date', 'desc')
            );
      } else {
        // Workers see only their own
        q = statusFilter
          ? query(
              timeEntriesRef,
              where('companyId', '==', user.companyId),
              where('userId', '==', user.uid),
              where('status', '==', statusFilter),
              orderBy('date', 'desc')
            )
          : query(
              timeEntriesRef,
              where('companyId', '==', user.companyId),
              where('userId', '==', user.uid),
              orderBy('date', 'desc')
            );
      }

      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        const hours = calculateHours(data.clockIn, data.clockOut);

        return {
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          jobId: data.jobId,
          jobName: data.jobName,
          date: data.date,
          clockIn: data.clockIn,
          clockOut: data.clockOut,
          hours,
          status: data.status,
          notes: data.notes,
          location: data.location,
          companyId: data.companyId,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as TimeEntry;
      });
    },
    enabled: !!user?.companyId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Fetch pending time entries (admin only)
 */
export function usePendingTimeEntries() {
  return useTimeEntries('pending');
}

/**
 * Create a new time entry
 */
export function useCreateTimeEntry() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTimeEntryData) => {
      if (!user?.companyId) {
        throw new Error('User must belong to a company');
      }

      const hours = calculateHours(data.clockIn, data.clockOut);

      const timeEntriesRef = collection(db, 'timeEntries');
      const docRef = await addDoc(timeEntriesRef, {
        userId: user.uid,
        userName: user.displayName || user.email,
        jobId: data.jobId,
        date: data.date,
        clockIn: data.clockIn,
        clockOut: data.clockOut,
        hours,
        status: 'pending' as TimeEntryStatus,
        notes: data.notes,
        location: data.location,
        companyId: user.companyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });
}

/**
 * Update a time entry (for clocking out or admin approval)
 */
export function useUpdateTimeEntry() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTimeEntryData }) => {
      const timeEntryRef = doc(db, 'timeEntries', id);

      // Verify time entry exists and belongs to same company
      const snapshot = await getDoc(timeEntryRef);
      if (!snapshot.exists()) {
        throw new Error('Time entry not found');
      }

      const timeEntryData = snapshot.data();
      if (timeEntryData.companyId !== user?.companyId) {
        throw new Error('Unauthorized access');
      }

      // Workers can only update their own entries
      if (user?.role !== 'admin' && user?.role !== 'manager') {
        if (timeEntryData.userId !== user?.uid) {
          throw new Error('Unauthorized access');
        }
      }

      const updateData: any = {
        updatedAt: serverTimestamp(),
      };

      if (data.jobId !== undefined) updateData.jobId = data.jobId;
      if (data.date !== undefined) updateData.date = data.date;
      if (data.clockIn !== undefined) updateData.clockIn = data.clockIn;
      if (data.clockOut !== undefined) {
        updateData.clockOut = data.clockOut;
        // Recalculate hours
        const clockIn = data.clockIn ?? timeEntryData.clockIn;
        updateData.hours = calculateHours(clockIn, data.clockOut);
      }
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.status !== undefined) {
        // Only admins/managers can change status
        if (user?.role !== 'admin' && user?.role !== 'manager') {
          throw new Error('Only admins can approve/reject time entries');
        }
        updateData.status = data.status;
      }

      await updateDoc(timeEntryRef, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });
}

/**
 * Approve multiple time entries (admin only)
 */
export function useApproveTimeEntries() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (timeEntryIds: string[]) => {
      if (user?.role !== 'admin' && user?.role !== 'manager') {
        throw new Error('Only admins can approve time entries');
      }

      const promises = timeEntryIds.map(async (id) => {
        const timeEntryRef = doc(db, 'timeEntries', id);
        await updateDoc(timeEntryRef, {
          status: 'approved',
          updatedAt: serverTimestamp(),
        });
      });

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });
}

/**
 * Reject a time entry with reason (admin only)
 */
export function useRejectTimeEntry() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      if (user?.role !== 'admin' && user?.role !== 'manager') {
        throw new Error('Only admins can reject time entries');
      }

      const timeEntryRef = doc(db, 'timeEntries', id);
      await updateDoc(timeEntryRef, {
        status: 'rejected',
        rejectionReason: reason,
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });
}

import { useQuery } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth-context';
import type { Job } from './useJobs';

export interface ScheduleItem {
  id: string;
  date: string;
  dateLabel: string; // "Today", "Tomorrow", or formatted date
  job: Job;
  time: string; // e.g., "8:00 AM - 4:00 PM"
  status: 'upcoming' | 'in-progress' | 'completed';
}

/**
 * Get a friendly date label
 */
function getDateLabel(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Reset time portions for comparison
  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  if (date.getTime() === today.getTime()) {
    return 'Today';
  } else if (date.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }
}

/**
 * Determine status based on date and job status
 */
function determineStatus(dateString: string, jobStatus: string): ScheduleItem['status'] {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  if (jobStatus === 'completed') {
    return 'completed';
  } else if (date.getTime() === today.getTime() && jobStatus === 'in-progress') {
    return 'in-progress';
  } else {
    return 'upcoming';
  }
}

/**
 * Fetch schedule for the current worker
 */
export function useSchedule(filter?: 'today' | 'week' | 'all') {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['schedule', user?.uid, filter],
    queryFn: async () => {
      if (!user?.companyId || !user?.uid) {
        throw new Error('User must be authenticated and belong to a company');
      }

      // Fetch jobs where the current user is assigned
      const jobsRef = collection(db, 'jobs');
      const q = query(
        jobsRef,
        where('companyId', '==', user.companyId),
        where('workers', 'array-contains', user.uid),
        orderBy('startDate', 'asc')
      );

      const snapshot = await getDocs(q);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const scheduleItems: ScheduleItem[] = [];

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const startDate = new Date(data.startDate);
        startDate.setHours(0, 0, 0, 0);

        // Apply filter
        if (filter === 'today') {
          if (startDate.getTime() !== today.getTime()) {
            return; // Skip this job
          }
        } else if (filter === 'week') {
          const weekFromNow = new Date(today);
          weekFromNow.setDate(weekFromNow.getDate() + 7);
          if (startDate.getTime() < today.getTime() || startDate.getTime() > weekFromNow.getTime()) {
            return; // Skip jobs outside this week
          }
        } else if (filter === 'all') {
          // Only show upcoming and in-progress
          if (data.status === 'completed' || data.status === 'cancelled') {
            return;
          }
        }

        const job: Job = {
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
        };

        // TODO: In production, you'd fetch actual shift times from a shifts collection
        // For now, use default times
        const time = '8:00 AM - 4:00 PM';

        scheduleItems.push({
          id: doc.id,
          date: data.startDate,
          dateLabel: getDateLabel(data.startDate),
          job,
          time,
          status: determineStatus(data.startDate, data.status),
        });
      });

      return scheduleItems;
    },
    enabled: !!user?.companyId && !!user?.uid,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch today's schedule only
 */
export function useTodaysSchedule() {
  return useSchedule('today');
}

/**
 * Fetch this week's schedule
 */
export function useWeekSchedule() {
  return useSchedule('week');
}

/**
 * Mobile Time Clock Hook
 *
 * Provides mobile-optimized time tracking with GPS validation, photo capture,
 * break tracking, and offline support.
 */

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../lib/auth-context';
import type { Coordinates } from './useGeolocation';

/**
 * Time clock entry types
 */
export type TimeClockAction = 'clock-in' | 'clock-out' | 'break-start' | 'break-end';

/**
 * Time clock entry
 */
export interface TimeClockEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  jobId?: string;
  jobTitle?: string;
  action: TimeClockAction;
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  photoUrl?: string;
  notes?: string;
  validated: boolean; // GPS validation passed
  companyId: string;
  syncStatus?: 'synced' | 'pending' | 'failed';
}

/**
 * Active time session
 */
export interface ActiveTimeSession {
  id: string;
  clockInEntry: TimeClockEntry;
  breakStartEntry?: TimeClockEntry;
  elapsedMinutes: number;
  breakMinutes: number;
  isOnBreak: boolean;
}

/**
 * Offline queue entry
 */
interface OfflineQueueEntry {
  id: string;
  entry: Omit<TimeClockEntry, 'id'>;
  timestamp: number;
}

const OFFLINE_QUEUE_KEY = 'timeClock_offlineQueue';

/**
 * Get offline queue from localStorage
 */
function getOfflineQueue(): OfflineQueueEntry[] {
  try {
    const queue = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch {
    return [];
  }
}

/**
 * Add entry to offline queue
 */
function addToOfflineQueue(entry: Omit<TimeClockEntry, 'id'>): string {
  const queue = getOfflineQueue();
  const id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  queue.push({
    id,
    entry,
    timestamp: Date.now(),
  });
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  return id;
}

/**
 * Remove entry from offline queue
 */
function removeFromOfflineQueue(id: string) {
  const queue = getOfflineQueue().filter((item) => item.id !== id);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Upload photo to Firebase Storage
 */
async function uploadPhoto(
  base64Data: string,
  employeeId: string,
  entryId: string
): Promise<string> {
  const storageRef = ref(storage, `timeclock-photos/${employeeId}/${entryId}.jpg`);
  await uploadString(storageRef, base64Data, 'data_url');
  return await getDownloadURL(storageRef);
}

/**
 * Get active time session for employee
 */
export function useActiveTimeSession() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['active-time-session', user?.uid],
    queryFn: async (): Promise<ActiveTimeSession | null> => {
      if (!user?.uid || !user?.companyId) {
        return null;
      }

      const entriesRef = collection(db, 'timeClockEntries');
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Get today's entries for this employee
      const q = query(
        entriesRef,
        where('employeeId', '==', user.uid),
        where('companyId', '==', user.companyId),
        where('timestamp', '>=', Timestamp.fromDate(todayStart)),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as TimeClockEntry[];

      if (entries.length === 0) {
        return null;
      }

      // Find the most recent clock-in without a corresponding clock-out
      let clockInEntry: TimeClockEntry | null = null;
      let breakStartEntry: TimeClockEntry | null = null;
      let isOnBreak = false;

      for (const entry of entries) {
        if (entry.action === 'clock-out') {
          // Found clock-out, no active session
          break;
        } else if (entry.action === 'break-end') {
          isOnBreak = false;
          breakStartEntry = null;
        } else if (entry.action === 'break-start') {
          isOnBreak = true;
          if (!breakStartEntry) {
            breakStartEntry = entry;
          }
        } else if (entry.action === 'clock-in') {
          clockInEntry = entry;
          break;
        }
      }

      if (!clockInEntry) {
        return null;
      }

      // Calculate elapsed time
      const now = new Date();
      const totalElapsedMs = now.getTime() - clockInEntry.timestamp.getTime();

      // Calculate break time
      let breakMinutes = 0;
      let inBreak = false;
      let breakStart: Date | null = null;

      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];
        if (entry.timestamp < clockInEntry.timestamp) break;

        if (entry.action === 'break-start') {
          inBreak = true;
          breakStart = entry.timestamp;
        } else if (entry.action === 'break-end' && inBreak && breakStart) {
          breakMinutes += (entry.timestamp.getTime() - breakStart.getTime()) / 60000;
          inBreak = false;
          breakStart = null;
        }
      }

      // If currently on break, add time since break started
      if (isOnBreak && breakStartEntry) {
        breakMinutes += (now.getTime() - breakStartEntry.timestamp.getTime()) / 60000;
      }

      const elapsedMinutes = totalElapsedMs / 60000 - breakMinutes;

      return {
        id: clockInEntry.id,
        clockInEntry,
        breakStartEntry: isOnBreak ? breakStartEntry : undefined,
        elapsedMinutes: Math.max(0, elapsedMinutes),
        breakMinutes,
        isOnBreak,
      };
    },
    enabled: !!user?.uid && !!user?.companyId,
    refetchInterval: 30000, // Refetch every 30 seconds to update elapsed time
    staleTime: 0,
  });
}

/**
 * Create time clock entry
 */
export function useCreateTimeClockEntry() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      action: TimeClockAction;
      jobId?: string;
      jobTitle?: string;
      location?: Coordinates;
      photoBase64?: string;
      notes?: string;
      validated?: boolean;
    }) => {
      if (!user?.uid || !user?.companyId) {
        throw new Error('User must be authenticated');
      }

      const entryData: Omit<TimeClockEntry, 'id'> = {
        employeeId: user.uid,
        employeeName: user.displayName || user.email || 'Unknown',
        action: data.action,
        timestamp: new Date(),
        location: data.location
          ? {
              latitude: data.location.latitude,
              longitude: data.location.longitude,
              accuracy: data.location.accuracy,
            }
          : undefined,
        notes: data.notes,
        validated: data.validated ?? false,
        companyId: user.companyId,
        jobId: data.jobId,
        jobTitle: data.jobTitle,
        syncStatus: 'pending',
      };

      try {
        // Try to create entry in Firestore
        const entriesRef = collection(db, 'timeClockEntries');
        const docRef = await addDoc(entriesRef, {
          ...entryData,
          timestamp: serverTimestamp(),
        });

        // Upload photo if provided
        let photoUrl: string | undefined;
        if (data.photoBase64) {
          try {
            photoUrl = await uploadPhoto(data.photoBase64, user.uid, docRef.id);
            await updateDoc(docRef, { photoUrl });
          } catch (error) {
            console.error('Failed to upload photo:', error);
            // Continue anyway - photo upload failure shouldn't block time entry
          }
        }

        return {
          id: docRef.id,
          ...entryData,
          photoUrl,
          syncStatus: 'synced' as const,
        };
      } catch (error) {
        console.error('Failed to create time entry online, queuing offline:', error);

        // Add to offline queue
        const offlineId = addToOfflineQueue(entryData);
        return {
          id: offlineId,
          ...entryData,
          syncStatus: 'pending' as const,
        };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-time-session'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
  });
}

/**
 * Sync offline queue
 */
export function useSyncOfflineQueue() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.uid || !user?.companyId) {
        throw new Error('User must be authenticated');
      }

      const queue = getOfflineQueue();
      const results = {
        synced: 0,
        failed: 0,
      };

      for (const queueItem of queue) {
        try {
          const entriesRef = collection(db, 'timeClockEntries');
          await addDoc(entriesRef, {
            ...queueItem.entry,
            timestamp: Timestamp.fromMillis(queueItem.timestamp),
            syncStatus: 'synced',
          });

          removeFromOfflineQueue(queueItem.id);
          results.synced++;
        } catch (error) {
          console.error('Failed to sync offline entry:', error);
          results.failed++;
        }
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-time-session'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
  });
}

/**
 * Get pending offline entries count
 */
export function useOfflineQueueCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      setCount(getOfflineQueue().length);
    };

    updateCount();

    // Listen for storage changes
    window.addEventListener('storage', updateCount);

    // Check periodically
    const interval = setInterval(updateCount, 5000);

    return () => {
      window.removeEventListener('storage', updateCount);
      clearInterval(interval);
    };
  }, []);

  return count;
}

/**
 * Get today's time clock summary
 */
export function useTodayTimeSummary() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['today-time-summary', user?.uid],
    queryFn: async () => {
      if (!user?.uid || !user?.companyId) {
        return null;
      }

      const entriesRef = collection(db, 'timeClockEntries');
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const q = query(
        entriesRef,
        where('employeeId', '==', user.uid),
        where('companyId', '==', user.companyId),
        where('timestamp', '>=', Timestamp.fromDate(todayStart)),
        orderBy('timestamp', 'asc')
      );

      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
      })) as TimeClockEntry[];

      let totalMinutes = 0;
      let breakMinutes = 0;
      let clockInTime: Date | null = null;
      let breakStartTime: Date | null = null;

      entries.forEach((entry) => {
        if (entry.action === 'clock-in') {
          clockInTime = entry.timestamp;
        } else if (entry.action === 'clock-out' && clockInTime) {
          totalMinutes += (entry.timestamp.getTime() - clockInTime.getTime()) / 60000;
          clockInTime = null;
        } else if (entry.action === 'break-start' && clockInTime) {
          breakStartTime = entry.timestamp;
        } else if (entry.action === 'break-end' && breakStartTime) {
          breakMinutes += (entry.timestamp.getTime() - breakStartTime.getTime()) / 60000;
          breakStartTime = null;
        }
      });

      // If still clocked in, add time since clock-in
      if (clockInTime) {
        totalMinutes += (new Date().getTime() - clockInTime.getTime()) / 60000;
      }

      // If on break, add time since break started
      if (breakStartTime) {
        breakMinutes += (new Date().getTime() - breakStartTime.getTime()) / 60000;
      }

      const workedMinutes = totalMinutes - breakMinutes;

      return {
        totalMinutes: Math.max(0, totalMinutes),
        workedMinutes: Math.max(0, workedMinutes),
        breakMinutes: Math.max(0, breakMinutes),
        entries,
      };
    },
    enabled: !!user?.uid && !!user?.companyId,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 0,
  });
}

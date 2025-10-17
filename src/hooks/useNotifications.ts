/**
 * useNotifications Hook
 *
 * React hook for managing notifications with real-time updates
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth-context';
import {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationPreferences,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markMultipleAsRead,
  markAllAsRead,
  archiveNotification,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../lib/notifications/notification-service';

/**
 * Notification Filter Options
 */
export interface NotificationFilterOptions {
  unreadOnly?: boolean;
  type?: NotificationType;
  priority?: NotificationPriority;
  limitCount?: number;
}

/**
 * useNotifications Hook
 */
export function useNotifications(options: NotificationFilterOptions = {}) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Real-time notifications subscription
  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    let q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('archived', '==', false),
      orderBy('createdAt', 'desc')
    );

    if (options.unreadOnly) {
      q = query(q, where('read', '==', false));
    }

    if (options.type) {
      q = query(q, where('type', '==', options.type));
    }

    if (options.priority) {
      q = query(q, where('priority', '==', options.priority));
    }

    if (options.limitCount) {
      q = query(q, limit(options.limitCount));
    }

    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifs: Notification[] = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            }) as Notification
        );

        setNotifications(notifs);

        // Calculate unread count from current data
        const unread = notifs.filter((n) => !n.read).length;
        setUnreadCount(unread);

        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[useNotifications] Subscription error:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [
    user?.uid,
    options.unreadOnly,
    options.type,
    options.priority,
    options.limitCount,
  ]);

  // Separate real-time unread count (for when not filtering)
  useEffect(() => {
    if (!user?.uid || options.unreadOnly) {
      return;
    }

    const unreadQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false),
      where('archived', '==', false)
    );

    const unsubscribe = onSnapshot(unreadQuery, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user?.uid, options.unreadOnly]);

  /**
   * Mark notification as read
   */
  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch (err) {
      console.error('[useNotifications] Failed to mark as read:', err);
      throw err;
    }
  }, []);

  /**
   * Mark multiple as read
   */
  const handleMarkMultipleAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      await markMultipleAsRead(notificationIds);
    } catch (err) {
      console.error('[useNotifications] Failed to mark multiple as read:', err);
      throw err;
    }
  }, []);

  /**
   * Mark all as read
   */
  const handleMarkAllAsRead = useCallback(async () => {
    if (!user?.uid) return;

    try {
      await markAllAsRead(user.uid);
    } catch (err) {
      console.error('[useNotifications] Failed to mark all as read:', err);
      throw err;
    }
  }, [user?.uid]);

  /**
   * Archive notification
   */
  const handleArchive = useCallback(async (notificationId: string) => {
    try {
      await archiveNotification(notificationId);
    } catch (err) {
      console.error('[useNotifications] Failed to archive:', err);
      throw err;
    }
  }, []);

  /**
   * Delete notification
   */
  const handleDelete = useCallback(async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
    } catch (err) {
      console.error('[useNotifications] Failed to delete:', err);
      throw err;
    }
  }, []);

  /**
   * Refresh notifications (manual refresh)
   */
  const refresh = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const notifs = await getNotifications(user.uid, options);
      setNotifications(notifs);

      const count = await getUnreadCount(user.uid);
      setUnreadCount(count);

      setLoading(false);
    } catch (err) {
      console.error('[useNotifications] Failed to refresh:', err);
      setError(err as Error);
      setLoading(false);
    }
  }, [user?.uid, options]);

  // Grouped notifications
  const groupedNotifications = useMemo(() => {
    const grouped: Record<string, Notification[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    notifications.forEach((notif) => {
      const createdAt = notif.createdAt?.toDate();
      if (!createdAt) {
        grouped.older.push(notif);
        return;
      }

      if (createdAt >= today) {
        grouped.today.push(notif);
      } else if (createdAt >= yesterday) {
        grouped.yesterday.push(notif);
      } else if (createdAt >= weekAgo) {
        grouped.thisWeek.push(notif);
      } else {
        grouped.older.push(notif);
      }
    });

    return grouped;
  }, [notifications]);

  return {
    // Data
    notifications,
    unreadCount,
    groupedNotifications,

    // State
    loading,
    error,

    // Actions
    markAsRead: handleMarkAsRead,
    markMultipleAsRead: handleMarkMultipleAsRead,
    markAllAsRead: handleMarkAllAsRead,
    archive: handleArchive,
    delete: handleDelete,
    refresh,

    // Computed
    hasUnread: unreadCount > 0,
    isEmpty: notifications.length === 0,
  };
}

/**
 * useNotificationPreferences Hook
 */
export function useNotificationPreferences() {
  const { user, userData } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load preferences
  useEffect(() => {
    if (!user?.uid) {
      setPreferences(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    getNotificationPreferences(user.uid)
      .then((prefs) => {
        if (prefs && !prefs.companyId && userData?.companyId) {
          // Set companyId if missing
          prefs.companyId = userData.companyId;
        }
        setPreferences(prefs);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[useNotificationPreferences] Failed to load:', err);
        setError(err as Error);
        setLoading(false);
      });
  }, [user?.uid, userData?.companyId]);

  /**
   * Update preferences
   */
  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      if (!user?.uid) return;

      try {
        await updateNotificationPreferences(user.uid, updates);

        // Update local state
        setPreferences((prev) => (prev ? { ...prev, ...updates } : null));
      } catch (err) {
        console.error('[useNotificationPreferences] Failed to update:', err);
        throw err;
      }
    },
    [user?.uid]
  );

  /**
   * Toggle notification type
   */
  const toggleNotificationType = useCallback(
    async (type: NotificationType) => {
      if (!preferences) return;

      const enabledTypes = preferences.enabledTypes.includes(type)
        ? preferences.enabledTypes.filter((t) => t !== type)
        : [...preferences.enabledTypes, type];

      await updatePreferences({ enabledTypes });
    },
    [preferences, updatePreferences]
  );

  /**
   * Check if notification type is enabled
   */
  const isTypeEnabled = useCallback(
    (type: NotificationType): boolean => {
      return preferences?.enabledTypes.includes(type) ?? true;
    },
    [preferences]
  );

  return {
    // Data
    preferences,

    // State
    loading,
    error,

    // Actions
    updatePreferences,
    toggleNotificationType,
    isTypeEnabled,
  };
}

/**
 * useNotificationSound Hook
 *
 * Play sound when new notification arrives
 */
export function useNotificationSound(enabled = true) {
  const [lastCount, setLastCount] = useState(0);
  const { unreadCount } = useNotifications({ limitCount: 100 });

  useEffect(() => {
    if (!enabled) return;

    // Only play sound if count increased (new notification)
    if (unreadCount > lastCount) {
      playNotificationSound();
    }

    setLastCount(unreadCount);
  }, [unreadCount, lastCount, enabled]);
}

/**
 * Play notification sound
 */
function playNotificationSound() {
  try {
    // Create simple notification sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (err) {
    console.warn('[Notifications] Failed to play sound:', err);
  }
}

/**
 * useNotificationBadge Hook
 *
 * Update page title with unread count
 */
export function useNotificationBadge() {
  const { unreadCount } = useNotifications({ limitCount: 100 });

  useEffect(() => {
    const originalTitle = document.title;

    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${originalTitle}`;
    } else {
      document.title = originalTitle;
    }

    return () => {
      document.title = originalTitle;
    };
  }, [unreadCount]);
}

/**
 * useLatestNotification Hook
 *
 * Get the most recent notification
 */
export function useLatestNotification(): Notification | null {
  const { notifications } = useNotifications({ limitCount: 1 });

  return useMemo(() => {
    return notifications.length > 0 ? notifications[0] : null;
  }, [notifications]);
}

/**
 * useNotificationsByType Hook
 *
 * Get notifications filtered by type
 */
export function useNotificationsByType(type: NotificationType) {
  return useNotifications({ type, limitCount: 50 });
}

/**
 * useUnreadNotifications Hook
 *
 * Get only unread notifications
 */
export function useUnreadNotifications() {
  return useNotifications({ unreadOnly: true, limitCount: 100 });
}

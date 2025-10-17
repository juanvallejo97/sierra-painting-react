import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, AuthState } from '../types';

interface AuthStore extends AuthState {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAuth: () => void;
  validateAndRestore: () => void;
}

// Storage version for managing breaking changes
const STORAGE_VERSION = 2;
const STORAGE_KEY = 'dsierra-auth-storage';

/**
 * Validate persisted user data
 */
function isValidUser(user: any): user is User {
  return (
    user &&
    typeof user === 'object' &&
    typeof user.uid === 'string' &&
    typeof user.email === 'string' &&
    typeof user.role === 'string' &&
    ['admin', 'manager', 'worker', 'crew', 'staff'].includes(user.role)
  );
}

/**
 * Custom storage with validation and migration
 */
const authStorage = {
  getItem: (name: string) => {
    try {
      const str = localStorage.getItem(name);
      if (!str) return null;

      const data = JSON.parse(str);

      // Check storage version
      if (!data.version || data.version !== STORAGE_VERSION) {
        console.warn('[Auth Store] Storage version mismatch, clearing state');
        localStorage.removeItem(name);
        return null;
      }

      // Validate user data
      if (data.state?.user && !isValidUser(data.state.user)) {
        console.warn('[Auth Store] Invalid user data detected, clearing state');
        localStorage.removeItem(name);
        return null;
      }

      // Check if user data is too old (>7 days)
      if (data.timestamp) {
        const age = Date.now() - data.timestamp;
        const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
        if (age > MAX_AGE) {
          console.warn('[Auth Store] User data expired, clearing state');
          localStorage.removeItem(name);
          return null;
        }
      }

      return data.state;
    } catch (error) {
      console.error('[Auth Store] Error reading from storage:', error);
      localStorage.removeItem(name);
      return null;
    }
  },

  setItem: (name: string, value: any) => {
    try {
      const data = {
        state: value,
        version: STORAGE_VERSION,
        timestamp: Date.now(),
      };
      localStorage.setItem(name, JSON.stringify(data));
    } catch (error) {
      console.error('[Auth Store] Error writing to storage:', error);
    }
  },

  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name);
    } catch (error) {
      console.error('[Auth Store] Error removing from storage:', error);
    }
  },
};

/**
 * Zustand store for authentication state
 * Persists user data with validation and versioning
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true,
      error: null,

      setUser: (user) => {
        // Validate user before setting
        if (user && !isValidUser(user)) {
          console.error('[Auth Store] Attempted to set invalid user:', user);
          return;
        }
        set({ user, error: null });
      },

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      clearAuth: () => {
        set({ user: null, loading: false, error: null });
        // Also clear from storage
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
          console.error('[Auth Store] Error clearing storage:', e);
        }
      },

      validateAndRestore: () => {
        const state = get();
        if (state.user && !isValidUser(state.user)) {
          console.warn('[Auth Store] Validation failed during restore, clearing');
          set({ user: null, loading: false, error: null });
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => authStorage),
      partialize: (state) => ({
        user: state.user, // Only persist user, not loading/error states
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('[Auth Store] Hydration complete', {
            hasUser: !!state.user,
            userEmail: state.user?.email,
          });
          // Validate restored state
          state.validateAndRestore();
        }
      },
    }
  )
);

/**
 * Helper hooks for specific auth state
 */
export const useUser = () => useAuthStore((state) => state.user);
export const useAuthLoading = () => useAuthStore((state) => state.loading);
export const useAuthError = () => useAuthStore((state) => state.error);

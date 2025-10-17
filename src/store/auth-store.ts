import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthState } from '../types';

interface AuthStore extends AuthState {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAuth: () => void;
}

/**
 * Zustand store for authentication state
 * Persists user data to localStorage for session persistence
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      loading: true,
      error: null,

      setUser: (user) => set({ user, error: null }),

      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      clearAuth: () => set({ user: null, loading: false, error: null }),
    }),
    {
      name: 'dsierra-auth-storage',
      partialize: (state) => ({
        user: state.user, // Only persist user, not loading/error states
      }),
    }
  )
);

/**
 * Helper hooks for specific auth state
 */
export const useUser = () => useAuthStore((state) => state.user);
export const useAuthLoading = () => useAuthStore((state) => state.loading);
export const useAuthError = () => useAuthStore((state) => state.error);

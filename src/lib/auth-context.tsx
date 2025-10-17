import React, { createContext, useContext, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { useAuthStore } from '../store/auth-store';
import { resetRateLimit } from './rate-limiter';
import type { User, UserRole } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, loading, error, setUser, setLoading, setError, clearAuth } = useAuthStore();

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          await loadUserData(firebaseUser);
        } catch (err) {
          console.error('Error loading user data:', err);
          setError('Failed to load user data');
          setLoading(false);
        }
      } else {
        clearAuth();
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * Load user data from Firestore and merge with Firebase Auth user
   */
  const loadUserData = async (firebaseUser: FirebaseUser) => {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // User document doesn't exist yet (newly created user)
        // Default to worker role until admin assigns proper role
        const newUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || undefined,
          photoURL: firebaseUser.photoURL || undefined,
          role: 'worker',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Create user document in Firestore
        await setDoc(userDocRef, {
          email: newUser.email,
          displayName: newUser.displayName,
          photoURL: newUser.photoURL,
          role: newUser.role,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setUser(newUser);
        setLoading(false);
        return;
      }

      // User document exists, merge data
      const userData = userDoc.data();
      const fullUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: firebaseUser.displayName || userData.displayName || undefined,
        photoURL: firebaseUser.photoURL || userData.photoURL || undefined,
        role: userData.role as UserRole || 'worker',
        companyId: userData.companyId,
        createdAt: userData.createdAt?.toDate(),
        updatedAt: userData.updatedAt?.toDate(),
      };

      setUser(fullUser);
      setLoading(false);
    } catch (err) {
      console.error('Error in loadUserData:', err);
      throw err;
    }
  };

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await loadUserData(userCredential.user);

      // Reset rate limit on successful login
      resetRateLimit(email);
    } catch (err: any) {
      console.error('Sign in error:', err);

      // Map Firebase errors to user-friendly messages
      let errorMessage = 'Failed to sign in';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errorMessage = 'Invalid email or password';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
      }

      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  };

  /**
   * Sign up with email and password
   */
  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      setError(null);
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Update display name in Firebase Auth
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }

      await loadUserData(userCredential.user);
    } catch (err: any) {
      console.error('Sign up error:', err);

      let errorMessage = 'Failed to create account';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Email address is already in use';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
      }

      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  };

  /**
   * Sign out current user
   */
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      clearAuth();
    } catch (err) {
      console.error('Sign out error:', err);
      setError('Failed to sign out');
      throw err;
    }
  };

  /**
   * Send password reset email
   */
  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      console.error('Password reset error:', err);

      let errorMessage = 'Failed to send reset email';
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
      }

      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Refresh user data from Firestore
   */
  const refreshUser = async () => {
    if (!auth.currentUser) return;
    await loadUserData(auth.currentUser);
  };

  const value: AuthContextValue = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Role checking utilities
 */
export function isAdmin(role?: UserRole): boolean {
  return role === 'admin';
}

export function isManager(role?: UserRole): boolean {
  return role === 'manager';
}

export function isAdminOrManager(role?: UserRole): boolean {
  return role === 'admin' || role === 'manager';
}

export function isWorker(role?: UserRole): boolean {
  return role === 'worker' || role === 'crew' || role === 'staff';
}

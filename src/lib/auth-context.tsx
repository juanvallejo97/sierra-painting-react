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
import { logger } from '../services/logger';
import { ErrorHandler } from '../services/errors';
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

  logger.debug('AuthProvider render', {
    email: user?.email,
    loading,
    hasError: !!error,
  });

  // Listen to Firebase auth state changes
  useEffect(() => {
    logger.debug('Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        logger.info('Auth state changed - user authenticated', {
          email: firebaseUser.email,
        });
        try {
          await loadUserData(firebaseUser);
        } catch (err) {
          logger.error('Failed to load user data', err as Error);
          const { message } = ErrorHandler.handle(err);
          setError(message);
          setLoading(false);
        }
      } else {
        logger.info('Auth state changed - user signed out');
        clearAuth();
        logger.clearContext(['userId', 'companyId']);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // NOTE: For new signups, companyId should be set during onboarding
        // For now, we'll create a basic user document without companyId
        logger.warn('Creating user document without companyId', {
          userId: firebaseUser.uid,
          email: firebaseUser.email,
        });

        const newUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || undefined,
          photoURL: firebaseUser.photoURL || undefined,
          role: 'worker',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Create user document in Firestore (filter out undefined values)
        const userData: any = {
          uid: firebaseUser.uid,
          email: newUser.email,
          role: newUser.role,
          status: 'pending', // Mark as pending until assigned to company
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        // Only add optional fields if they have values
        if (newUser.displayName) {
          userData.displayName = newUser.displayName;
        }
        if (newUser.photoURL) {
          userData.photoURL = newUser.photoURL;
        }

        logger.info('Creating new user document', { userId: firebaseUser.uid });
        await setDoc(userDocRef, userData);

        setUser(newUser);
        setLoading(false);
        setError('Your account is pending approval. Please contact your administrator.');
        return;
      }

      // User document exists, merge data
      const userData = userDoc.data();
      const fullUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: firebaseUser.displayName || userData.displayName || undefined,
        photoURL: firebaseUser.photoURL || userData.photoURL || undefined,
        role: (userData.role as UserRole) || 'worker',
        companyId: userData.companyId,
        createdAt: userData.createdAt?.toDate(),
        updatedAt: userData.updatedAt?.toDate(),
      };

      // Set logging context for all future logs
      logger.setContext({
        userId: fullUser.uid,
        companyId: fullUser.companyId,
      });

      logger.info('User data loaded successfully', {
        email: fullUser.email,
        role: fullUser.role,
        hasCompanyId: !!fullUser.companyId,
      });

      setUser(fullUser);
      setLoading(false);
    } catch (err) {
      logger.error('Error loading user data', err as Error);
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

      logger.info('Sign in attempt', { email });
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await loadUserData(userCredential.user);

      // Reset rate limit on successful login
      resetRateLimit(email);
      logger.trackAction('user_login', { email });
    } catch (err: any) {
      logger.error('Sign in failed', err, { email });
      const { message } = ErrorHandler.handle(err);

      setError(message);
      setLoading(false);
      throw new Error(message);
    }
  };

  /**
   * Sign up with email and password
   */
  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      setError(null);
      setLoading(true);

      logger.info('Sign up attempt', { email, hasDisplayName: !!displayName });
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Update display name in Firebase Auth
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }

      await loadUserData(userCredential.user);
      logger.trackAction('user_signup', { email });
    } catch (err: any) {
      logger.error('Sign up failed', err, { email });
      const { message } = ErrorHandler.handle(err);

      setError(message);
      setLoading(false);
      throw new Error(message);
    }
  };

  /**
   * Sign out current user
   */
  const signOut = async () => {
    try {
      logger.info('Sign out attempt');
      await firebaseSignOut(auth);
      clearAuth();
      logger.trackAction('user_logout');
    } catch (err) {
      logger.error('Sign out failed', err as Error);
      const { message } = ErrorHandler.handle(err);
      setError(message);
      throw err;
    }
  };

  /**
   * Send password reset email
   */
  const resetPassword = async (email: string) => {
    try {
      setError(null);
      logger.info('Password reset request', { email });
      await sendPasswordResetEmail(auth, email);
      logger.trackAction('password_reset_requested', { email });
    } catch (err: any) {
      logger.error('Password reset failed', err, { email });
      const { message } = ErrorHandler.handle(err);

      setError(message);
      throw new Error(message);
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

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  inMemoryPersistence,
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';
import { envConfig } from './env-config';
import { logger } from '../services/logger';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: envConfig.firebaseApiKey,
  authDomain: envConfig.firebaseAuthDomain,
  projectId: envConfig.firebaseProjectId,
  storageBucket: envConfig.firebaseStorageBucket,
  messagingSenderId: envConfig.firebaseMessagingSenderId,
  appId: envConfig.firebaseAppId,
  measurementId: envConfig.firebaseMeasurementId,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services but DON'T use them yet
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// CRITICAL: Connect to emulators FIRST (before any auth operations)
// Emulator connections MUST happen before auth is used
if (envConfig.useFirebaseEmulators) {
  const emulatorHost = envConfig.firebaseEmulatorHost;
  logger.info('Connecting to Firebase Emulators', { emulatorHost });

  try {
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    logger.info('Auth Emulator connected');
  } catch (error) {
    logger.warn('Auth Emulator connection failed', error as Error);
  }

  try {
    connectFirestoreEmulator(db, emulatorHost, 8080);
    logger.info('Firestore Emulator connected');
  } catch (error) {
    logger.warn('Firestore Emulator already connected', error as Error);
  }

  try {
    connectStorageEmulator(storage, emulatorHost, 9199);
    logger.info('Storage Emulator connected');
  } catch (error) {
    logger.warn('Storage Emulator already connected', error as Error);
  }

  try {
    connectFunctionsEmulator(functions, emulatorHost, 5001);
    logger.info('Functions Emulator connected');
  } catch (error) {
    logger.warn('Functions Emulator already connected', error as Error);
  }

  logger.info('Firebase Emulators ready', { ui: 'http://localhost:4000' });
}

/**
 * Set auth persistence AFTER emulator connection
 * This runs asynchronously but doesn't block module loading
 */
async function initializeAuthPersistence() {
  try {
    logger.info('Setting up auth persistence');

    try {
      // Try IndexedDB first (most robust)
      await setPersistence(auth, indexedDBLocalPersistence);
      logger.info('Auth persistence set to IndexedDB');
    } catch (indexedDBError) {
      logger.warn('IndexedDB persistence failed, trying localStorage', indexedDBError as Error);
      try {
        // Fallback to localStorage
        await setPersistence(auth, browserLocalPersistence);
        logger.info('Auth persistence set to localStorage');
      } catch (localStorageError) {
        logger.warn('localStorage persistence failed, using memory-only', localStorageError as Error);
        // Last resort: in-memory (will not persist across reloads)
        await setPersistence(auth, inMemoryPersistence);
        logger.error('Auth persistence set to memory-only - sessions will NOT persist!');
      }
    }

    logger.info('Firebase initialization complete');
  } catch (error) {
    logger.error('Critical error during auth persistence setup', error as Error);
  }
}

// Start persistence setup (runs after emulator connection)
initializeAuthPersistence().catch((error) => {
  logger.error('Auth persistence initialization failed', error);
});

// Export initialized services
export { auth, db, storage, functions, analytics };
export default app;

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
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

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Connect to Firebase Emulators in development
if (envConfig.useFirebaseEmulators) {
  const emulatorHost = envConfig.firebaseEmulatorHost;

  logger.info('Connecting to Firebase Emulators', { emulatorHost });

  try {
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    logger.info('Auth Emulator connected');
  } catch (error) {
    logger.warn('Auth Emulator already connected or failed to connect', error as Error);
  }

  try {
    connectFirestoreEmulator(db, emulatorHost, 8080);
    logger.info('Firestore Emulator connected');
  } catch (error) {
    logger.warn('Firestore Emulator already connected or failed to connect', error as Error);
  }

  try {
    connectStorageEmulator(storage, emulatorHost, 9199);
    logger.info('Storage Emulator connected');
  } catch (error) {
    logger.warn('Storage Emulator already connected or failed to connect', error as Error);
  }

  try {
    connectFunctionsEmulator(functions, emulatorHost, 5001);
    logger.info('Functions Emulator connected');
  } catch (error) {
    logger.warn('Functions Emulator already connected or failed to connect', error as Error);
  }

  logger.info('Firebase Emulators ready', { ui: 'http://localhost:4000' });
}

export default app;

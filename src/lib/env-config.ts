/**
 * Environment Configuration & Validation
 *
 * Validates environment variables on startup and provides type-safe access
 */

import { logger } from '../services/logger';

/**
 * Required environment variables
 */
const REQUIRED_ENV_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

/**
 * Environment variable schema
 */
interface EnvConfig {
  // Firebase
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseProjectId: string;
  firebaseStorageBucket: string;
  firebaseMessagingSenderId: string;
  firebaseAppId: string;
  firebaseMeasurementId?: string;

  // Environment
  env: 'development' | 'staging' | 'production';
  isDevelopment: boolean;
  isProduction: boolean;

  // API
  apiUrl: string;

  // Firebase Emulators
  useFirebaseEmulators: boolean;
  firebaseEmulatorHost: string;

  // Feature Flags
  features: {
    estimates: boolean;
    timeTracking: boolean;
    scheduling: boolean;
    analytics: boolean;
  };

  // Monitoring
  sentryDsn?: string;
  sentryEnvironment: string;
  enablePerformanceMonitoring: boolean;

  // Debug
  debug: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Validate environment variable format
 */
function validateFirebaseConfig(): void {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;

  // Firebase API keys should start with "AIza"
  if (apiKey && !apiKey.startsWith('AIza')) {
    logger.warn('Firebase API key format may be invalid (expected to start with AIza)');
  }

  // Auth domain should match project ID
  if (authDomain && projectId && !authDomain.includes(projectId)) {
    logger.warn(`Auth domain (${authDomain}) does not match project ID (${projectId})`);
  }

  // Storage bucket should match project ID
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
  if (storageBucket && projectId && !storageBucket.includes(projectId)) {
    logger.warn(`Storage bucket (${storageBucket}) does not match project ID (${projectId})`);
  }
}

/**
 * Validate production environment security
 */
function validateProductionSecurity(env: string): void {
  if (env !== 'production') return;

  const warnings: string[] = [];

  // Production should not use emulators
  if (parseBool(import.meta.env.VITE_USE_FIREBASE_EMULATORS)) {
    warnings.push('Firebase emulators are enabled in production');
  }

  // Production should have Sentry configured
  if (!import.meta.env.VITE_SENTRY_DSN) {
    warnings.push('Sentry DSN not configured for production error tracking');
  }

  // Production should have analytics enabled
  if (!parseBool(import.meta.env.VITE_FEATURE_ANALYTICS, true)) {
    warnings.push('Analytics disabled in production');
  }

  // Production API should use HTTPS
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && !apiUrl.startsWith('https://')) {
    warnings.push('Production API URL should use HTTPS');
  }

  if (warnings.length > 0) {
    logger.warn('Production security warnings:', { warnings });
  }
}

/**
 * Validate required environment variables
 */
function validateEnvironment(): void {
  const missing: string[] = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!import.meta.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const errorMessage = `Missing required environment variables: ${missing.join(', ')}`;
    logger.critical(errorMessage);
    throw new Error(errorMessage);
  }

  // Additional validation
  validateFirebaseConfig();
  validateProductionSecurity(import.meta.env.VITE_ENV || 'development');
}

/**
 * Parse boolean environment variable
 */
function parseBool(value: string | undefined, defaultValue = false): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Load and validate environment configuration
 */
function loadEnvConfig(): EnvConfig {
  // Validate required variables
  validateEnvironment();

  const env = (import.meta.env.VITE_ENV || 'development') as EnvConfig['env'];

  return {
    // Firebase
    firebaseApiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    firebaseAuthDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    firebaseStorageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    firebaseAppId: import.meta.env.VITE_FIREBASE_APP_ID,
    firebaseMeasurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,

    // Environment
    env,
    isDevelopment: env === 'development',
    isProduction: env === 'production',

    // API
    apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',

    // Firebase Emulators
    useFirebaseEmulators: parseBool(import.meta.env.VITE_USE_FIREBASE_EMULATORS),
    firebaseEmulatorHost: import.meta.env.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1',

    // Feature Flags
    features: {
      estimates: parseBool(import.meta.env.VITE_FEATURE_ESTIMATES, true),
      timeTracking: parseBool(import.meta.env.VITE_FEATURE_TIME_TRACKING, true),
      scheduling: parseBool(import.meta.env.VITE_FEATURE_SCHEDULING, true),
      analytics: parseBool(import.meta.env.VITE_FEATURE_ANALYTICS, true),
    },

    // Monitoring
    sentryDsn: import.meta.env.VITE_SENTRY_DSN,
    sentryEnvironment: import.meta.env.VITE_SENTRY_ENVIRONMENT || env,
    enablePerformanceMonitoring: parseBool(import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING),

    // Debug
    debug: parseBool(import.meta.env.VITE_DEBUG),
    logLevel: (import.meta.env.VITE_LOG_LEVEL as EnvConfig['logLevel']) || 'info',
  };
}

/**
 * Export singleton configuration
 */
export const envConfig = loadEnvConfig();

/**
 * Log configuration on startup (mask sensitive values)
 */
if (envConfig.isDevelopment) {
  logger.info('Environment configuration loaded', {
    env: envConfig.env,
    apiUrl: envConfig.apiUrl,
    useEmulators: envConfig.useFirebaseEmulators,
    features: envConfig.features,
    debug: envConfig.debug,
  });
}

/**
 * Feature flag helper
 */
export const isFeatureEnabled = (feature: keyof EnvConfig['features']): boolean => {
  return envConfig.features[feature];
};

/**
 * Firebase App Check Configuration
 *
 * Protects backend resources (Firestore, Storage, Functions) from abuse
 * Uses reCAPTCHA v3 for web clients
 */

import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  getToken,
  type AppCheck,
} from 'firebase/app-check';
import app from './firebase';
import { envConfig } from './env-config';

/**
 * App Check instance
 */
let appCheck: AppCheck | null = null;
let appCheckEnabled = false;

/**
 * Initialize Firebase App Check
 *
 * IMPORTANT: Requires reCAPTCHA v3 site key in environment variables
 * Get your site key from: https://console.cloud.google.com/security/recaptcha
 */
export async function initAppCheck(): Promise<void> {
  // Skip if not in browser
  if (typeof window === 'undefined') {
    console.log('[App Check] Not in browser environment');
    return;
  }

  // Skip if no reCAPTCHA site key configured
  if (!import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
    console.warn('[App Check] reCAPTCHA site key not configured');
    console.warn('[App Check] Set VITE_RECAPTCHA_SITE_KEY in .env to enable');
    return;
  }

  try {
    // Initialize App Check with reCAPTCHA v3
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),

      // Optional: Set to true to automatically refresh tokens
      isTokenAutoRefreshEnabled: true,
    });

    appCheckEnabled = true;

    console.log('[App Check] Initialized successfully with reCAPTCHA v3');

    // In development, set up debug token if available
    if (import.meta.env.DEV && import.meta.env.VITE_APPCHECK_DEBUG_TOKEN) {
      // Debug tokens allow testing without reCAPTCHA in development
      // Get debug tokens from: Firebase Console > App Check > Apps
      (window as Window & { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
        import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
      console.log('[App Check] Debug token configured for development');
    }
  } catch (error) {
    console.error('[App Check] Failed to initialize:', error);

    // App Check initialization failure should not block the app
    // Backend requests will fail if App Check is enforced
    if (envConfig.isProduction) {
      // In production, this is a critical error
      console.error('[App Check] CRITICAL: App Check failed in production');
    }
  }
}

/**
 * Get App Check token manually
 *
 * Useful for:
 * - Making authenticated API calls
 * - Debugging token issues
 * - Manual token refresh
 *
 * @param forceRefresh - Force a new token to be generated
 */
export async function getAppCheckToken(forceRefresh = false): Promise<string | null> {
  if (!appCheckEnabled || !appCheck) {
    console.warn('[App Check] Not initialized or not enabled');
    return null;
  }

  try {
    const tokenResult = await getToken(appCheck, forceRefresh);
    return tokenResult.token;
  } catch (error) {
    console.error('[App Check] Failed to get token:', error);
    return null;
  }
}

/**
 * Check if App Check is enabled
 */
export function isAppCheckEnabled(): boolean {
  return appCheckEnabled && appCheck !== null;
}

/**
 * Get App Check instance (for advanced usage)
 */
export function getAppCheckInstance(): AppCheck | null {
  return appCheck;
}

/**
 * Verify App Check token (for debugging)
 *
 * This will log token information to console in development
 */
export async function debugAppCheckToken(): Promise<void> {
  if (!import.meta.env.DEV) {
    console.warn('[App Check] Debug functions only available in development');
    return;
  }

  if (!appCheckEnabled || !appCheck) {
    console.warn('[App Check] Not initialized');
    return;
  }

  try {
    const tokenResult = await getToken(appCheck);
    console.group('[App Check] Token Info');
    console.log('Token:', tokenResult.token.substring(0, 50) + '...');
    console.log('Token length:', tokenResult.token.length);
    console.log('App Check enabled:', appCheckEnabled);
    console.groupEnd();
  } catch (error) {
    console.error('[App Check] Failed to get token:', error);
  }
}

/**
 * Setup instructions for Firebase Console
 */
export const APP_CHECK_SETUP_INSTRUCTIONS = `
Firebase App Check Setup:

1. Go to Firebase Console > App Check
2. Register your app
3. Add reCAPTCHA v3:
   - Go to https://console.cloud.google.com/security/recaptcha
   - Create a new site key (reCAPTCHA v3)
   - Add your domain (localhost for dev, your-domain.com for prod)
   - Copy the site key
4. Add to .env:
   VITE_RECAPTCHA_SITE_KEY=your-site-key-here
5. Enable App Check for services:
   - Firestore: Firebase Console > App Check > Firestore
   - Storage: Firebase Console > App Check > Storage
   - Functions: Firebase Console > App Check > Functions (if using)

Development:
1. Get debug token: Firebase Console > App Check > Apps > Debug tokens
2. Add to .env:
   VITE_APPCHECK_DEBUG_TOKEN=your-debug-token
3. This allows testing without reCAPTCHA in development

Enforcement:
- Start with "Monitor" mode to collect metrics
- After verifying no legitimate traffic is blocked, switch to "Enforce"
- Monitor App Check metrics in Firebase Console
`;

/**
 * Common App Check errors and solutions
 */
export const APP_CHECK_ERROR_SOLUTIONS: Record<string, string> = {
  'app-check/fetch-status-error': `
    Solution: Check your reCAPTCHA site key and domain configuration.
    - Verify site key is correct in .env
    - Verify domain is registered in reCAPTCHA console
    - Check browser console for reCAPTCHA errors
  `,

  'app-check/throttled': `
    Solution: Too many token requests in a short time.
    - Use isTokenAutoRefreshEnabled: true to let SDK handle refresh
    - Don't call getToken() manually too often
    - Check for loops or rapid repeated requests
  `,

  'app-check/recaptcha-error': `
    Solution: reCAPTCHA failed to load or execute.
    - Check for ad blockers or privacy extensions
    - Verify reCAPTCHA is not blocked by CSP
    - Check network connectivity
    - Verify site key is valid
  `,

  'app-check/token-refresh-failed': `
    Solution: Failed to refresh App Check token.
    - Check Firebase project configuration
    - Verify App Check is enabled in Firebase Console
    - Check browser console for specific errors
  `,
};

/**
 * Handle App Check errors
 */
export function handleAppCheckError(error: Error | { code?: string; message?: string }): void {
  const errorCode = ('code' in error && error.code) || 'unknown';
  const errorMessage = ('message' in error && error.message) || 'Unknown error';
  const solution = APP_CHECK_ERROR_SOLUTIONS[errorCode];

  console.group('[App Check] Error');
  console.error('Error code:', errorCode);
  console.error('Error message:', errorMessage);
  if (solution) {
    console.log('Solution:', solution);
  }
  console.groupEnd();

  // In production, send to error tracking
  if (envConfig.isProduction) {
    // Send to Sentry or other error tracking service
    import('./sentry-config').then(({ captureException }) => {
      captureException(error instanceof Error ? error : new Error(errorMessage), {
        tags: {
          service: 'app-check',
          error_code: errorCode,
        },
        extra: {
          solution: solution || 'No known solution',
        },
      });
    });
  }
}

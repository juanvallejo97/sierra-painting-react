import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Initialize Sentry for error tracking
import { initSentry } from './lib/sentry-config';
initSentry();

// Initialize Firebase App Check (protect backend resources)
import { initAppCheck } from './lib/app-check';
initAppCheck().catch((error) => {
  console.error('[App Check] Failed to initialize:', error);
});

// Initialize analytics and monitoring
import { initAnalytics } from './lib/analytics/analytics-config';
import { initWebVitals, trackPageLoad } from './lib/analytics/web-vitals';

// Initialize Firebase Analytics (async, non-blocking)
initAnalytics().catch((error) => {
  console.error('[Analytics] Failed to initialize:', error);
});

// Initialize Web Vitals tracking
initWebVitals();

// Track page load performance
trackPageLoad();

// Import initialization utilities for development
if (import.meta.env.DEV) {
  import('./utils/seed-test-data');
  import('./utils/init-firebase');

  // Expose Firebase to window for console access
  import('./lib/firebase').then((firebase) => {
    (window as any).db = firebase.db;
    (window as any).auth = firebase.auth;
  });

  // Expose Firestore functions to window
  import('firebase/firestore').then((firestore) => {
    (window as any).firestoreImports = {
      collection: firestore.collection,
      addDoc: firestore.addDoc,
      getDocs: firestore.getDocs,
      query: firestore.query,
      where: firestore.where,
      Timestamp: firestore.Timestamp,
    };
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

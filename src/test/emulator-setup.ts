/**
 * Test setup file for Firebase Emulator tests
 *
 * This file is imported by Vitest for tests that use Firebase Emulators.
 * It provides:
 * - Global test environment setup
 * - Emulator connection verification
 * - Test isolation utilities
 * - Cleanup hooks
 */

import { beforeAll, afterAll, beforeEach } from 'vitest';
import { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  waitForEmulator,
  TEST_PROJECT_ID,
} from './emulator-utils';

// Global test environment instance
let testEnv: RulesTestEnvironment | null = null;

/**
 * Get the current test environment
 * Throws error if called before setup
 */
export function getTestEnv(): RulesTestEnvironment {
  if (!testEnv) {
    throw new Error('Test environment not initialized. Did you call setupEmulatorTests()?');
  }
  return testEnv;
}

/**
 * Setup emulator tests
 * Call this in your test file's beforeAll hook
 */
export async function setupEmulatorTests(): Promise<RulesTestEnvironment> {
  // Verify emulators are running
  const isReady = await waitForEmulator('127.0.0.1', 8080, 5);
  if (!isReady) {
    throw new Error(
      'Firebase Emulators are not running. Start them with: npm run emulators'
    );
  }

  // Initialize test environment
  testEnv = await setupTestEnvironment();
  return testEnv;
}

/**
 * Cleanup emulator tests
 * Call this in your test file's afterAll hook
 */
export async function cleanupEmulatorTests(): Promise<void> {
  if (testEnv) {
    await cleanupTestEnvironment(testEnv);
    testEnv = null;
  }
}

/**
 * Clear data between tests
 * Call this in your test file's beforeEach or afterEach hook
 */
export async function clearEmulatorData(): Promise<void> {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
}

/**
 * Global hooks for all emulator tests
 * These ensure proper cleanup even if individual tests fail
 */
beforeAll(async () => {
  console.log('🚀 Initializing Firebase Emulator test environment...');
  console.log(`   Project ID: ${TEST_PROJECT_ID}`);
  console.log(`   Firestore: 127.0.0.1:8080`);
  console.log(`   Auth: 127.0.0.1:9099`);
});

afterAll(async () => {
  if (testEnv) {
    console.log('🧹 Cleaning up test environment...');
    await cleanupTestEnvironment(testEnv);
    testEnv = null;
  }
});

/**
 * Test isolation helper
 * Ensures each test starts with clean Firestore state
 */
export function withTestIsolation() {
  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });
}

/**
 * Helper to run a test with a fresh environment
 */
export async function withFreshEnvironment<T>(
  testFn: (env: RulesTestEnvironment) => Promise<T>
): Promise<T> {
  const env = getTestEnv();
  await env.clearFirestore();
  return await testFn(env);
}

/**
 * Performance test helper
 * Measures execution time of async operations
 */
export async function measurePerformance<T>(
  label: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  console.log(`⏱️  ${label}: ${duration.toFixed(2)}ms`);
  return { result, duration };
}

/**
 * Batch operation helper
 * Useful for seeding large amounts of test data
 */
export async function batchOperation<T>(
  items: T[],
  operation: (item: T) => Promise<void>,
  batchSize = 10
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(operation));
  }
}

/**
 * Wait for a condition to be true
 * Useful for testing real-time updates
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeoutMs = 5000,
  intervalMs = 100
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * Mock timestamp for deterministic tests
 */
export function mockTimestamp(date: string | Date = new Date()): any {
  const jsDate = typeof date === 'string' ? new Date(date) : date;
  return {
    toDate: () => jsDate,
    toMillis: () => jsDate.getTime(),
    seconds: Math.floor(jsDate.getTime() / 1000),
    nanoseconds: (jsDate.getTime() % 1000) * 1000000,
  };
}

/**
 * Export environment info for debugging
 */
export function getEnvironmentInfo() {
  return {
    projectId: TEST_PROJECT_ID,
    emulatorHost: '127.0.0.1',
    ports: {
      firestore: 8080,
      auth: 9099,
      storage: 9199,
      functions: 5001,
      ui: 4000,
    },
    isInitialized: testEnv !== null,
  };
}

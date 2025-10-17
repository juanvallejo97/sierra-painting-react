/**
 * Firebase Emulator Integration Tests
 *
 * These tests verify the emulator test infrastructure is working correctly.
 * They test basic CRUD operations and data isolation.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  getAuthContext,
  getUnauthContext,
  seedTestData,
  testDataFactory,
  assertSucceeds,
  TEST_COMPANY_ID,
} from '../test/emulator-utils';
import { RulesTestEnvironment } from '@firebase/rules-unit-testing';

describe('Firebase Emulator Integration', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment(testEnv);
  });

  beforeEach(async () => {
    // Clear data between tests
    await testEnv.clearFirestore();
  });

  describe('Environment Setup', () => {
    it('should initialize test environment', () => {
      expect(testEnv).toBeDefined();
    });

    it('should create authenticated context', () => {
      const context = getAuthContext(testEnv, 'test-user-001');
      expect(context).toBeDefined();
      expect(context.firestore()).toBeDefined();
    });

    it('should create unauthenticated context', () => {
      const context = getUnauthContext(testEnv);
      expect(context).toBeDefined();
      expect(context.firestore()).toBeDefined();
    });
  });

  describe('Data Factories', () => {
    it('should create test user data', () => {
      const user = testDataFactory.user();
      expect(user).toHaveProperty('uid');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('companyId', TEST_COMPANY_ID);
      expect(user).toHaveProperty('role');
    });

    it('should create test company data', () => {
      const company = testDataFactory.company();
      expect(company).toHaveProperty('id', TEST_COMPANY_ID);
      expect(company).toHaveProperty('name');
      expect(company).toHaveProperty('email');
    });

    it('should create test job data', () => {
      const job = testDataFactory.job();
      expect(job).toHaveProperty('id');
      expect(job).toHaveProperty('name');
      expect(job).toHaveProperty('companyId', TEST_COMPANY_ID);
      expect(job).toHaveProperty('status');
    });

    it('should override factory defaults', () => {
      const job = testDataFactory.job({
        name: 'Custom Job Name',
        status: 'completed',
      });
      expect(job.name).toBe('Custom Job Name');
      expect(job.status).toBe('completed');
    });
  });

  describe('Seed Data', () => {
    it('should seed test data into Firestore', async () => {
      const testUser = testDataFactory.user();
      const testCompany = testDataFactory.company();
      const testJob = testDataFactory.job();

      await seedTestData(testEnv, {
        users: [testUser],
        companies: [testCompany],
        jobs: [testJob],
      });

      // Verify data was seeded
      const adminContext = getAuthContext(testEnv, 'admin', { admin: true });
      const db = adminContext.firestore();

      const userDoc = await db.collection('users').doc(testUser.uid).get();
      expect(userDoc.exists).toBe(true);
      expect(userDoc.data()).toMatchObject({
        email: testUser.email,
        companyId: TEST_COMPANY_ID,
      });

      const jobDoc = await db.collection('jobs').doc(testJob.id).get();
      expect(jobDoc.exists).toBe(true);
      expect(jobDoc.data()).toMatchObject({
        name: testJob.name,
        companyId: TEST_COMPANY_ID,
      });
    });

    it('should seed multiple documents', async () => {
      const jobs = [
        testDataFactory.job({ id: 'job-1', name: 'Job 1' }),
        testDataFactory.job({ id: 'job-2', name: 'Job 2' }),
        testDataFactory.job({ id: 'job-3', name: 'Job 3' }),
      ];

      await seedTestData(testEnv, { jobs });

      const adminContext = getAuthContext(testEnv, 'admin', { admin: true });
      const db = adminContext.firestore();

      const jobsSnapshot = await db.collection('jobs').get();
      expect(jobsSnapshot.size).toBe(3);
    });
  });

  describe('Basic CRUD Operations', () => {
    it('should read a document', async () => {
      // Seed data
      const testUser = testDataFactory.user({ uid: 'test-user-001' });
      const testJob = testDataFactory.job();
      await seedTestData(testEnv, {
        users: [testUser],
        jobs: [testJob],
      });

      // Read as authenticated user
      const userContext = getAuthContext(testEnv, testUser.uid);
      const db = userContext.firestore();

      const jobDoc = await db.collection('jobs').doc(testJob.id).get();
      expect(jobDoc.exists).toBe(true);
      expect(jobDoc.data()?.name).toBe(testJob.name);
    });

    it('should create a document', async () => {
      const testUser = testDataFactory.user({ uid: 'test-user-001', role: 'admin' });
      await seedTestData(testEnv, { users: [testUser] });

      const userContext = getAuthContext(testEnv, testUser.uid);
      const db = userContext.firestore();

      const newJob = testDataFactory.job({ id: 'new-job-001' });
      await assertSucceeds(db.collection('jobs').doc(newJob.id).set(newJob));

      // Verify creation
      const jobDoc = await db.collection('jobs').doc(newJob.id).get();
      expect(jobDoc.exists).toBe(true);
    });

    it('should update a document', async () => {
      // Seed data
      const testUser = testDataFactory.user({ uid: 'test-user-001', role: 'admin' });
      const testJob = testDataFactory.job();
      await seedTestData(testEnv, {
        users: [testUser],
        jobs: [testJob],
      });

      // Update as authenticated user
      const userContext = getAuthContext(testEnv, testUser.uid);
      const db = userContext.firestore();

      await assertSucceeds(
        db.collection('jobs').doc(testJob.id).update({
          status: 'completed',
        })
      );

      // Verify update
      const updatedDoc = await db.collection('jobs').doc(testJob.id).get();
      expect(updatedDoc.data()?.status).toBe('completed');
    });

    it('should delete a document', async () => {
      // Seed data
      const testUser = testDataFactory.user({ uid: 'test-user-001', role: 'admin' });
      const testJob = testDataFactory.job();
      await seedTestData(testEnv, {
        users: [testUser],
        jobs: [testJob],
      });

      // Delete as authenticated user
      const userContext = getAuthContext(testEnv, testUser.uid);
      const db = userContext.firestore();

      await assertSucceeds(db.collection('jobs').doc(testJob.id).delete());

      // Verify deletion
      const deletedDoc = await db.collection('jobs').doc(testJob.id).get();
      expect(deletedDoc.exists).toBe(false);
    });
  });

  describe('Test Isolation', () => {
    it('should start with empty database', async () => {
      const adminContext = getAuthContext(testEnv, 'admin', { admin: true });
      const db = adminContext.firestore();

      const jobsSnapshot = await db.collection('jobs').get();
      expect(jobsSnapshot.empty).toBe(true);
    });

    it('should clear data between tests', async () => {
      // This test verifies the beforeEach hook is working
      const adminContext = getAuthContext(testEnv, 'admin', { admin: true });
      const db = adminContext.firestore();

      // Add data
      await db.collection('jobs').doc('test-job').set(testDataFactory.job());

      // Verify it exists
      const jobDoc = await db.collection('jobs').doc('test-job').get();
      expect(jobDoc.exists).toBe(true);

      // Data should be cleared by next test's beforeEach
    });

    it('should have clean state after previous test', async () => {
      // This test runs after the previous test which added data
      const adminContext = getAuthContext(testEnv, 'admin', { admin: true });
      const db = adminContext.firestore();

      const jobsSnapshot = await db.collection('jobs').get();
      expect(jobsSnapshot.empty).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle batch operations efficiently', async () => {
      const testUser = testDataFactory.user({ uid: 'test-user-001' });

      // Create 100 jobs
      const jobs = Array.from({ length: 100 }, (_, i) =>
        testDataFactory.job({
          id: `job-${i}`,
          name: `Job ${i}`,
        })
      );

      const startTime = Date.now();
      await seedTestData(testEnv, { users: [testUser], jobs });
      const duration = Date.now() - startTime;

      // Should complete in reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);

      // Verify count
      const adminContext = getAuthContext(testEnv, 'admin', { admin: true });
      const db = adminContext.firestore();
      const jobsSnapshot = await db.collection('jobs').get();
      expect(jobsSnapshot.size).toBe(100);
    });
  });
});

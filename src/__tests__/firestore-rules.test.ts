/**
 * Firestore Security Rules Test Suite
 *
 * Comprehensive tests for multi-tenant security rules covering:
 * - Authentication requirements
 * - Role-based access control (RBAC)
 * - Multi-tenant data isolation
 * - CRUD operation permissions
 * - Data validation rules
 *
 * Target: 90%+ rule coverage
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
  assertFails,
  TEST_COMPANY_ID,
} from '../test/emulator-utils';
import { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp } from 'firebase/firestore';

describe('Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment;
  const COMPANY_A = 'company-a';
  const COMPANY_B = 'company-b';

  beforeAll(async () => {
    testEnv = await setupTestEnvironment();
  });

  afterAll(async () => {
    await cleanupTestEnvironment(testEnv);
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  describe('Helper Functions', () => {
    describe('isAuthenticated()', () => {
      it('should allow authenticated user', async () => {
        const user = testDataFactory.user({ uid: 'user-001' });
        await seedTestData(testEnv, { users: [user] });

        const context = getAuthContext(testEnv, user.uid);
        const db = context.firestore();

        await assertSucceeds(db.collection('users').doc(user.uid).get());
      });

      it('should deny unauthenticated user', async () => {
        const user = testDataFactory.user({ uid: 'user-001' });
        await seedTestData(testEnv, { users: [user] });

        const context = getUnauthContext(testEnv);
        const db = context.firestore();

        await assertFails(db.collection('users').doc(user.uid).get());
      });
    });

    describe('belongsToUserCompany()', () => {
      it('should allow access to same company data', async () => {
        const user = testDataFactory.user({
          uid: 'user-001',
          companyId: COMPANY_A,
        });
        const job = testDataFactory.job({ companyId: COMPANY_A });

        await seedTestData(testEnv, { users: [user], jobs: [job] });

        const context = getAuthContext(testEnv, user.uid);
        const db = context.firestore();

        await assertSucceeds(db.collection('jobs').doc(job.id).get());
      });

      it('should deny access to different company data', async () => {
        const user = testDataFactory.user({
          uid: 'user-001',
          companyId: COMPANY_A,
        });
        const job = testDataFactory.job({ companyId: COMPANY_B });

        await seedTestData(testEnv, { users: [user], jobs: [job] });

        const context = getAuthContext(testEnv, user.uid);
        const db = context.firestore();

        await assertFails(db.collection('jobs').doc(job.id).get());
      });
    });

    describe('Role checks', () => {
      it('should recognize admin role', async () => {
        const admin = testDataFactory.user({
          uid: 'admin-001',
          role: 'admin',
        });
        const job = testDataFactory.job();

        await seedTestData(testEnv, { users: [admin], jobs: [job] });

        const context = getAuthContext(testEnv, admin.uid);
        const db = context.firestore();

        // Admin can delete
        await assertSucceeds(db.collection('jobs').doc(job.id).delete());
      });

      it('should recognize manager role', async () => {
        const manager = testDataFactory.user({
          uid: 'manager-001',
          role: 'manager',
        });
        const job = testDataFactory.job();

        await seedTestData(testEnv, { users: [manager], jobs: [job] });

        const context = getAuthContext(testEnv, manager.uid);
        const db = context.firestore();

        // Manager can update
        await assertSucceeds(db.collection('jobs').doc(job.id).update({ status: 'completed' }));
      });

      it('should recognize worker role with limited permissions', async () => {
        const worker = testDataFactory.user({
          uid: 'worker-001',
          role: 'worker',
        });
        const job = testDataFactory.job({ workers: ['worker-001'] });

        await seedTestData(testEnv, { users: [worker], jobs: [job] });

        const context = getAuthContext(testEnv, worker.uid);
        const db = context.firestore();

        // Worker can read their assigned job
        await assertSucceeds(db.collection('jobs').doc(job.id).get());

        // But cannot update
        await assertFails(db.collection('jobs').doc(job.id).update({ status: 'completed' }));
      });
    });
  });

  describe('Users Collection', () => {
    describe('Read permissions', () => {
      it('should allow user to read their own document', async () => {
        const user = testDataFactory.user({ uid: 'user-001' });
        await seedTestData(testEnv, { users: [user] });

        const context = getAuthContext(testEnv, user.uid);
        const db = context.firestore();

        await assertSucceeds(db.collection('users').doc(user.uid).get());
      });

      it('should allow users to read other users in same company', async () => {
        const user1 = testDataFactory.user({
          uid: 'user-001',
          companyId: COMPANY_A,
        });
        const user2 = testDataFactory.user({
          uid: 'user-002',
          companyId: COMPANY_A,
        });

        await seedTestData(testEnv, { users: [user1, user2] });

        const context = getAuthContext(testEnv, user1.uid);
        const db = context.firestore();

        await assertSucceeds(db.collection('users').doc(user2.uid).get());
      });

      it('should deny reading users from different company', async () => {
        const user1 = testDataFactory.user({
          uid: 'user-001',
          companyId: COMPANY_A,
        });
        const user2 = testDataFactory.user({
          uid: 'user-002',
          companyId: COMPANY_B,
        });

        await seedTestData(testEnv, { users: [user1, user2] });

        const context = getAuthContext(testEnv, user1.uid);
        const db = context.firestore();

        await assertFails(db.collection('users').doc(user2.uid).get());
      });

      it('should allow manager to read all users in company', async () => {
        const manager = testDataFactory.user({
          uid: 'manager-001',
          role: 'manager',
          companyId: COMPANY_A,
        });
        const worker = testDataFactory.user({
          uid: 'worker-001',
          role: 'worker',
          companyId: COMPANY_A,
        });

        await seedTestData(testEnv, { users: [manager, worker] });

        const context = getAuthContext(testEnv, manager.uid);
        const db = context.firestore();

        await assertSucceeds(db.collection('users').doc(worker.uid).get());
      });
    });

    describe('Create permissions', () => {
      it('should allow user to create their own document during signup', async () => {
        const context = getAuthContext(testEnv, 'new-user-001', {
          email: 'new@example.com',
        });
        const db = context.firestore();

        await assertSucceeds(
          db.collection('users').doc('new-user-001').set({
            uid: 'new-user-001',
            email: 'new@example.com',
            displayName: 'New User',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          })
        );
      });

      it('should deny creating user document without required fields', async () => {
        const context = getAuthContext(testEnv, 'new-user-001', {
          email: 'new@example.com',
        });
        const db = context.firestore();

        await assertFails(
          db.collection('users').doc('new-user-001').set({
            displayName: 'New User',
          })
        );
      });

      it('should allow admin to create user documents for their company', async () => {
        const admin = testDataFactory.user({
          uid: 'admin-001',
          role: 'admin',
          companyId: COMPANY_A,
        });

        await seedTestData(testEnv, { users: [admin] });

        const context = getAuthContext(testEnv, admin.uid);
        const db = context.firestore();

        await assertSucceeds(
          db.collection('users').doc('new-employee-001').set({
            uid: 'new-employee-001',
            email: 'employee@company-a.com',
            companyId: COMPANY_A,
            role: 'worker',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          })
        );
      });

      it('should deny admin creating user for different company', async () => {
        const admin = testDataFactory.user({
          uid: 'admin-001',
          role: 'admin',
          companyId: COMPANY_A,
        });

        await seedTestData(testEnv, { users: [admin] });

        const context = getAuthContext(testEnv, admin.uid);
        const db = context.firestore();

        await assertFails(
          db.collection('users').doc('new-employee-001').set({
            uid: 'new-employee-001',
            email: 'employee@company-b.com',
            companyId: COMPANY_B,
            role: 'worker',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          })
        );
      });
    });

    describe('Update permissions', () => {
      it('should allow user to update their own profile', async () => {
        const user = testDataFactory.user({ uid: 'user-001' });
        await seedTestData(testEnv, { users: [user] });

        const context = getAuthContext(testEnv, user.uid);
        const db = context.firestore();

        await assertSucceeds(
          db.collection('users').doc(user.uid).update({
            displayName: 'Updated Name',
          })
        );
      });

      it('should deny user changing their email', async () => {
        const user = testDataFactory.user({ uid: 'user-001' });
        await seedTestData(testEnv, { users: [user] });

        const context = getAuthContext(testEnv, user.uid);
        const db = context.firestore();

        await assertFails(
          db.collection('users').doc(user.uid).update({
            email: 'newemail@example.com',
          })
        );
      });

      it('should allow admin to update users in their company', async () => {
        const admin = testDataFactory.user({
          uid: 'admin-001',
          role: 'admin',
          companyId: COMPANY_A,
        });
        const worker = testDataFactory.user({
          uid: 'worker-001',
          role: 'worker',
          companyId: COMPANY_A,
        });

        await seedTestData(testEnv, { users: [admin, worker] });

        const context = getAuthContext(testEnv, admin.uid);
        const db = context.firestore();

        await assertSucceeds(
          db.collection('users').doc(worker.uid).update({
            role: 'manager',
          })
        );
      });

      it('should allow admin to assign companyId to user', async () => {
        const admin = testDataFactory.user({
          uid: 'admin-001',
          role: 'admin',
          companyId: COMPANY_A,
        });
        const newUser = {
          uid: 'new-user-001',
          email: 'new@example.com',
          displayName: 'New User',
          role: 'worker',
          status: 'active',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        await seedTestData(testEnv, { users: [admin, newUser as any] });

        const context = getAuthContext(testEnv, admin.uid);
        const db = context.firestore();

        await assertSucceeds(
          db.collection('users').doc('new-user-001').update({
            companyId: COMPANY_A,
          })
        );
      });
    });

    describe('Delete permissions', () => {
      it('should allow admin to delete users in their company', async () => {
        const admin = testDataFactory.user({
          uid: 'admin-001',
          role: 'admin',
          companyId: COMPANY_A,
        });
        const worker = testDataFactory.user({
          uid: 'worker-001',
          role: 'worker',
          companyId: COMPANY_A,
        });

        await seedTestData(testEnv, { users: [admin, worker] });

        const context = getAuthContext(testEnv, admin.uid);
        const db = context.firestore();

        await assertSucceeds(db.collection('users').doc(worker.uid).delete());
      });

      it('should deny non-admin deleting users', async () => {
        const manager = testDataFactory.user({
          uid: 'manager-001',
          role: 'manager',
          companyId: COMPANY_A,
        });
        const worker = testDataFactory.user({
          uid: 'worker-001',
          role: 'worker',
          companyId: COMPANY_A,
        });

        await seedTestData(testEnv, { users: [manager, worker] });

        const context = getAuthContext(testEnv, manager.uid);
        const db = context.firestore();

        await assertFails(db.collection('users').doc(worker.uid).delete());
      });

      it('should deny admin deleting users from different company', async () => {
        const admin = testDataFactory.user({
          uid: 'admin-001',
          role: 'admin',
          companyId: COMPANY_A,
        });
        const worker = testDataFactory.user({
          uid: 'worker-001',
          role: 'worker',
          companyId: COMPANY_B,
        });

        await seedTestData(testEnv, { users: [admin, worker] });

        const context = getAuthContext(testEnv, admin.uid);
        const db = context.firestore();

        await assertFails(db.collection('users').doc(worker.uid).delete());
      });
    });
  });

  describe('Jobs Collection', () => {
    describe('Read permissions', () => {
      it('should allow manager to read all jobs in company', async () => {
        const manager = testDataFactory.user({
          uid: 'manager-001',
          role: 'manager',
        });
        const job = testDataFactory.job();

        await seedTestData(testEnv, { users: [manager], jobs: [job] });

        const context = getAuthContext(testEnv, manager.uid);
        const db = context.firestore();

        await assertSucceeds(db.collection('jobs').doc(job.id).get());
      });

      it('should allow worker to read jobs they are assigned to', async () => {
        const worker = testDataFactory.user({
          uid: 'worker-001',
          role: 'worker',
        });
        const job = testDataFactory.job({ workers: ['worker-001'] });

        await seedTestData(testEnv, { users: [worker], jobs: [job] });

        const context = getAuthContext(testEnv, worker.uid);
        const db = context.firestore();

        await assertSucceeds(db.collection('jobs').doc(job.id).get());
      });

      it('should deny worker reading jobs they are not assigned to', async () => {
        const worker = testDataFactory.user({
          uid: 'worker-001',
          role: 'worker',
        });
        const job = testDataFactory.job({ workers: [] });

        await seedTestData(testEnv, { users: [worker], jobs: [job] });

        const context = getAuthContext(testEnv, worker.uid);
        const db = context.firestore();

        await assertFails(db.collection('jobs').doc(job.id).get());
      });

      it('should deny reading jobs from different company', async () => {
        const user = testDataFactory.user({
          uid: 'user-001',
          companyId: COMPANY_A,
        });
        const job = testDataFactory.job({ companyId: COMPANY_B });

        await seedTestData(testEnv, { users: [user], jobs: [job] });

        const context = getAuthContext(testEnv, user.uid);
        const db = context.firestore();

        await assertFails(db.collection('jobs').doc(job.id).get());
      });
    });

    describe('Create permissions', () => {
      it('should allow authenticated user to create job', async () => {
        const user = testDataFactory.user({ uid: 'user-001' });
        await seedTestData(testEnv, { users: [user] });

        const context = getAuthContext(testEnv, user.uid);
        const db = context.firestore();

        await assertSucceeds(
          db.collection('jobs').add({
            name: 'New Job',
            companyId: TEST_COMPANY_ID,
            status: 'scheduled',
            startDate: Timestamp.now(),
            workers: [],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          })
        );
      });

      it('should deny creating job without required fields', async () => {
        const user = testDataFactory.user({ uid: 'user-001' });
        await seedTestData(testEnv, { users: [user] });

        const context = getAuthContext(testEnv, user.uid);
        const db = context.firestore();

        await assertFails(
          db.collection('jobs').add({
            name: 'New Job',
            // Missing companyId, status, etc.
          })
        );
      });

      it('should deny creating job for different company', async () => {
        const user = testDataFactory.user({
          uid: 'user-001',
          companyId: COMPANY_A,
        });
        await seedTestData(testEnv, { users: [user] });

        const context = getAuthContext(testEnv, user.uid);
        const db = context.firestore();

        await assertFails(
          db.collection('jobs').add({
            name: 'New Job',
            companyId: COMPANY_B,
            status: 'scheduled',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          })
        );
      });
    });

    describe('Update permissions', () => {
      it('should allow manager to update jobs in their company', async () => {
        const manager = testDataFactory.user({
          uid: 'manager-001',
          role: 'manager',
        });
        const job = testDataFactory.job();

        await seedTestData(testEnv, { users: [manager], jobs: [job] });

        const context = getAuthContext(testEnv, manager.uid);
        const db = context.firestore();

        await assertSucceeds(
          db.collection('jobs').doc(job.id).update({
            status: 'completed',
          })
        );
      });

      it('should deny worker updating jobs', async () => {
        const worker = testDataFactory.user({
          uid: 'worker-001',
          role: 'worker',
        });
        const job = testDataFactory.job({ workers: ['worker-001'] });

        await seedTestData(testEnv, { users: [worker], jobs: [job] });

        const context = getAuthContext(testEnv, worker.uid);
        const db = context.firestore();

        await assertFails(
          db.collection('jobs').doc(job.id).update({
            status: 'completed',
          })
        );
      });

      it('should deny changing companyId on update', async () => {
        const manager = testDataFactory.user({
          uid: 'manager-001',
          role: 'manager',
          companyId: COMPANY_A,
        });
        const job = testDataFactory.job({ companyId: COMPANY_A });

        await seedTestData(testEnv, { users: [manager], jobs: [job] });

        const context = getAuthContext(testEnv, manager.uid);
        const db = context.firestore();

        await assertFails(
          db.collection('jobs').doc(job.id).update({
            companyId: COMPANY_B,
          })
        );
      });
    });

    describe('Delete permissions', () => {
      it('should allow admin to delete jobs', async () => {
        const admin = testDataFactory.user({
          uid: 'admin-001',
          role: 'admin',
        });
        const job = testDataFactory.job();

        await seedTestData(testEnv, { users: [admin], jobs: [job] });

        const context = getAuthContext(testEnv, admin.uid);
        const db = context.firestore();

        await assertSucceeds(db.collection('jobs').doc(job.id).delete());
      });

      it('should deny manager deleting jobs', async () => {
        const manager = testDataFactory.user({
          uid: 'manager-001',
          role: 'manager',
        });
        const job = testDataFactory.job();

        await seedTestData(testEnv, { users: [manager], jobs: [job] });

        const context = getAuthContext(testEnv, manager.uid);
        const db = context.firestore();

        await assertFails(db.collection('jobs').doc(job.id).delete());
      });

      it('should deny deleting jobs from different company', async () => {
        const admin = testDataFactory.user({
          uid: 'admin-001',
          role: 'admin',
          companyId: COMPANY_A,
        });
        const job = testDataFactory.job({ companyId: COMPANY_B });

        await seedTestData(testEnv, { users: [admin], jobs: [job] });

        const context = getAuthContext(testEnv, admin.uid);
        const db = context.firestore();

        await assertFails(db.collection('jobs').doc(job.id).delete());
      });
    });
  });

  describe('Invoices Collection', () => {
    describe('Read permissions', () => {
      it('should allow manager to read invoices', async () => {
        const manager = testDataFactory.user({
          uid: 'manager-001',
          role: 'manager',
        });
        const invoice = testDataFactory.invoice();

        await seedTestData(testEnv, { users: [manager], invoices: [invoice] });

        const context = getAuthContext(testEnv, manager.uid);
        const db = context.firestore();

        await assertSucceeds(db.collection('invoices').doc(invoice.id).get());
      });

      it('should deny reading invoices from different company', async () => {
        const user = testDataFactory.user({
          uid: 'user-001',
          companyId: COMPANY_A,
        });
        const invoice = testDataFactory.invoice({ companyId: COMPANY_B });

        await seedTestData(testEnv, { users: [user], invoices: [invoice] });

        const context = getAuthContext(testEnv, user.uid);
        const db = context.firestore();

        await assertFails(db.collection('invoices').doc(invoice.id).get());
      });
    });

    describe('Create permissions', () => {
      it('should allow authenticated user to create invoice', async () => {
        const user = testDataFactory.user({ uid: 'user-001' });
        await seedTestData(testEnv, { users: [user] });

        const context = getAuthContext(testEnv, user.uid);
        const db = context.firestore();

        await assertSucceeds(
          db.collection('invoices').add({
            invoiceNumber: 'INV-001',
            companyId: TEST_COMPANY_ID,
            status: 'draft',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          })
        );
      });
    });

    describe('Update permissions', () => {
      it('should allow manager to update invoices', async () => {
        const manager = testDataFactory.user({
          uid: 'manager-001',
          role: 'manager',
        });
        const invoice = testDataFactory.invoice();

        await seedTestData(testEnv, { users: [manager], invoices: [invoice] });

        const context = getAuthContext(testEnv, manager.uid);
        const db = context.firestore();

        await assertSucceeds(
          db.collection('invoices').doc(invoice.id).update({
            status: 'paid',
          })
        );
      });
    });

    describe('Delete permissions', () => {
      it('should allow admin to delete invoices', async () => {
        const admin = testDataFactory.user({
          uid: 'admin-001',
          role: 'admin',
        });
        const invoice = testDataFactory.invoice();

        await seedTestData(testEnv, { users: [admin], invoices: [invoice] });

        const context = getAuthContext(testEnv, admin.uid);
        const db = context.firestore();

        await assertSucceeds(db.collection('invoices').doc(invoice.id).delete());
      });

      it('should deny manager deleting invoices', async () => {
        const manager = testDataFactory.user({
          uid: 'manager-001',
          role: 'manager',
        });
        const invoice = testDataFactory.invoice();

        await seedTestData(testEnv, { users: [manager], invoices: [invoice] });

        const context = getAuthContext(testEnv, manager.uid);
        const db = context.firestore();

        await assertFails(db.collection('invoices').doc(invoice.id).delete());
      });
    });
  });

  describe('Companies Collection', () => {
    describe('Read permissions', () => {
      it('should allow user to read their own company', async () => {
        const user = testDataFactory.user({
          uid: 'user-001',
          companyId: COMPANY_A,
        });
        const company = testDataFactory.company({ id: COMPANY_A });

        await seedTestData(testEnv, { users: [user], companies: [company] });

        const context = getAuthContext(testEnv, user.uid);
        const db = context.firestore();

        await assertSucceeds(db.collection('companies').doc(COMPANY_A).get());
      });

      it('should deny reading other companies', async () => {
        const user = testDataFactory.user({
          uid: 'user-001',
          companyId: COMPANY_A,
        });
        const company = testDataFactory.company({ id: COMPANY_B });

        await seedTestData(testEnv, { users: [user], companies: [company] });

        const context = getAuthContext(testEnv, user.uid);
        const db = context.firestore();

        await assertFails(db.collection('companies').doc(COMPANY_B).get());
      });
    });

    describe('Create permissions', () => {
      it('should allow authenticated user to create company', async () => {
        const user = testDataFactory.user({ uid: 'user-001' });
        await seedTestData(testEnv, { users: [user] });

        const context = getAuthContext(testEnv, user.uid);
        const db = context.firestore();

        await assertSucceeds(
          db.collection('companies').doc('new-company').set({
            id: 'new-company',
            name: 'New Company',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          })
        );
      });
    });

    describe('Update permissions', () => {
      it('should allow admin to update their company', async () => {
        const admin = testDataFactory.user({
          uid: 'admin-001',
          role: 'admin',
          companyId: COMPANY_A,
        });
        const company = testDataFactory.company({ id: COMPANY_A });

        await seedTestData(testEnv, { users: [admin], companies: [company] });

        const context = getAuthContext(testEnv, admin.uid);
        const db = context.firestore();

        await assertSucceeds(
          db.collection('companies').doc(COMPANY_A).update({
            name: 'Updated Company Name',
          })
        );
      });

      it('should deny non-admin updating company', async () => {
        const worker = testDataFactory.user({
          uid: 'worker-001',
          role: 'worker',
          companyId: COMPANY_A,
        });
        const company = testDataFactory.company({ id: COMPANY_A });

        await seedTestData(testEnv, { users: [worker], companies: [company] });

        const context = getAuthContext(testEnv, worker.uid);
        const db = context.firestore();

        await assertFails(
          db.collection('companies').doc(COMPANY_A).update({
            name: 'Updated Company Name',
          })
        );
      });
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should completely isolate data between companies', async () => {
      // Setup two companies with users and jobs
      const userA = testDataFactory.user({
        uid: 'user-a',
        companyId: COMPANY_A,
        role: 'admin',
      });
      const userB = testDataFactory.user({
        uid: 'user-b',
        companyId: COMPANY_B,
        role: 'admin',
      });

      const jobA = testDataFactory.job({ id: 'job-a', companyId: COMPANY_A });
      const jobB = testDataFactory.job({ id: 'job-b', companyId: COMPANY_B });

      await seedTestData(testEnv, {
        users: [userA, userB],
        jobs: [jobA, jobB],
      });

      // User A should not see Company B data
      const contextA = getAuthContext(testEnv, userA.uid);
      const dbA = contextA.firestore();

      await assertSucceeds(dbA.collection('jobs').doc('job-a').get());
      await assertFails(dbA.collection('jobs').doc('job-b').get());

      // User B should not see Company A data
      const contextB = getAuthContext(testEnv, userB.uid);
      const dbB = contextB.firestore();

      await assertSucceeds(dbB.collection('jobs').doc('job-b').get());
      await assertFails(dbB.collection('jobs').doc('job-a').get());
    });

    it('should prevent cross-company data leakage through queries', async () => {
      const userA = testDataFactory.user({
        uid: 'user-a',
        companyId: COMPANY_A,
      });
      const userB = testDataFactory.user({
        uid: 'user-b',
        companyId: COMPANY_B,
      });

      const jobsA = [
        testDataFactory.job({ id: 'job-a-1', companyId: COMPANY_A }),
        testDataFactory.job({ id: 'job-a-2', companyId: COMPANY_A }),
      ];
      const jobsB = [testDataFactory.job({ id: 'job-b-1', companyId: COMPANY_B })];

      await seedTestData(testEnv, {
        users: [userA, userB],
        jobs: [...jobsA, ...jobsB],
      });

      const contextA = getAuthContext(testEnv, userA.uid);
      const dbA = contextA.firestore();

      const snapshot = await dbA.collection('jobs').where('companyId', '==', COMPANY_A).get();

      expect(snapshot.size).toBe(2);
      snapshot.forEach((doc) => {
        expect(doc.data().companyId).toBe(COMPANY_A);
      });
    });
  });
});

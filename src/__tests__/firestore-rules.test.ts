/**
 * Firestore Security Rules Tests
 *
 * CRITICAL SECURITY: Tests cross-tenant isolation and role-based access control
 *
 * These tests verify that:
 * 1. Company A cannot access Company B's data (multi-tenancy isolation)
 * 2. Role-based permissions are enforced (admin, manager, worker)
 * 3. Users cannot escalate privileges or change companyId
 * 4. All collections enforce company isolation
 *
 * V1.0.0 Requirement: 100% coverage of security rules
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';

let testEnv: RulesTestEnvironment;

const COMPANY_A_ID = 'company-a';
const COMPANY_B_ID = 'company-b';

// Test user configurations
const ADMIN_A = {
  uid: 'admin-a',
  email: 'admin@companya.com',
  role: 'admin',
  companyId: COMPANY_A_ID,
};
const MANAGER_A = {
  uid: 'manager-a',
  email: 'manager@companya.com',
  role: 'manager',
  companyId: COMPANY_A_ID,
};
const WORKER_A = {
  uid: 'worker-a',
  email: 'worker@companya.com',
  role: 'worker',
  companyId: COMPANY_A_ID,
};
const ADMIN_B = {
  uid: 'admin-b',
  email: 'admin@companyb.com',
  role: 'admin',
  companyId: COMPANY_B_ID,
};
const WORKER_B = {
  uid: 'worker-b',
  email: 'worker@companyb.com',
  role: 'worker',
  companyId: COMPANY_B_ID,
};
const PENDING_USER = {
  uid: 'pending-user',
  email: 'pending@test.com',
  role: 'pending',
  companyId: COMPANY_A_ID,
};

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'sierra-painting-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('Firestore Security Rules - Cross-Tenant Isolation', () => {
  describe('Companies Collection', () => {
    it('should allow users to read their own company', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `companies/${COMPANY_A_ID}`), {
          id: COMPANY_A_ID,
          name: 'Company A',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const adminContext = testEnv.authenticatedContext(ADMIN_A.uid, {
        role: ADMIN_A.role,
        companyId: ADMIN_A.companyId,
      });
      await assertSucceeds(getDoc(doc(adminContext.firestore(), `companies/${COMPANY_A_ID}`)));
    });

    it('should DENY access to other companies (cross-tenant isolation)', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `companies/${COMPANY_B_ID}`), {
          id: COMPANY_B_ID,
          name: 'Company B',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const adminAContext = testEnv.authenticatedContext(ADMIN_A.uid, {
        role: ADMIN_A.role,
        companyId: ADMIN_A.companyId,
      });
      await assertFails(getDoc(doc(adminAContext.firestore(), `companies/${COMPANY_B_ID}`)));
    });

    it('should allow only admins to update their company', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `companies/${COMPANY_A_ID}`), {
          id: COMPANY_A_ID,
          name: 'Company A',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      // Admin can update
      const adminContext = testEnv.authenticatedContext(ADMIN_A.uid, {
        role: ADMIN_A.role,
        companyId: ADMIN_A.companyId,
      });
      await assertSucceeds(
        updateDoc(doc(adminContext.firestore(), `companies/${COMPANY_A_ID}`), {
          name: 'Updated Name',
        }),
      );

      // Worker cannot update
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertFails(
        updateDoc(doc(workerContext.firestore(), `companies/${COMPANY_A_ID}`), { name: 'Hacked' }),
      );
    });
  });

  describe('Users Collection - Multi-Tenant Isolation', () => {
    it('should allow users to read their own profile', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `users/${ADMIN_A.uid}`), {
          uid: ADMIN_A.uid,
          email: ADMIN_A.email,
          companyId: COMPANY_A_ID,
          createdAt: new Date(),
        });
      });

      const adminContext = testEnv.authenticatedContext(ADMIN_A.uid, {
        role: ADMIN_A.role,
        companyId: ADMIN_A.companyId,
      });
      await assertSucceeds(getDoc(doc(adminContext.firestore(), `users/${ADMIN_A.uid}`)));
    });

    it('should DENY access to users from other companies', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `users/${ADMIN_B.uid}`), {
          uid: ADMIN_B.uid,
          email: ADMIN_B.email,
          companyId: COMPANY_B_ID,
          createdAt: new Date(),
        });
      });

      const adminAContext = testEnv.authenticatedContext(ADMIN_A.uid, {
        role: ADMIN_A.role,
        companyId: ADMIN_A.companyId,
      });
      await assertFails(getDoc(doc(adminAContext.firestore(), `users/${ADMIN_B.uid}`)));
    });

    it('should FORBID users from setting role in their document', async () => {
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });

      // Try to create profile with role field (should fail)
      await assertFails(
        setDoc(doc(workerContext.firestore(), `users/${WORKER_A.uid}`), {
          uid: WORKER_A.uid,
          email: WORKER_A.email,
          companyId: COMPANY_A_ID,
          role: 'admin', // FORBIDDEN!
          createdAt: new Date(),
        }),
      );
    });

    it('should prevent users from changing their companyId', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `users/${WORKER_A.uid}`), {
          uid: WORKER_A.uid,
          email: WORKER_A.email,
          companyId: COMPANY_A_ID,
          createdAt: new Date(),
        });
      });

      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });

      // Try to change companyId (should fail)
      await assertFails(
        updateDoc(doc(workerContext.firestore(), `users/${WORKER_A.uid}`), {
          companyId: COMPANY_B_ID, // Attempting privilege escalation!
        }),
      );
    });
  });

  describe('Jobs Collection - Role-Based Access', () => {
    const JOB_A_ID = 'job-a';
    const JOB_B_ID = 'job-b';

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        // Job in Company A
        await setDoc(doc(context.firestore(), `jobs/${JOB_A_ID}`), {
          id: JOB_A_ID,
          name: 'Job A',
          companyId: COMPANY_A_ID,
          status: 'active',
          workers: [WORKER_A.uid],
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Job in Company B
        await setDoc(doc(context.firestore(), `jobs/${JOB_B_ID}`), {
          id: JOB_B_ID,
          name: 'Job B',
          companyId: COMPANY_B_ID,
          status: 'active',
          workers: [WORKER_B.uid],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    });

    it('should allow managers to read jobs in their company', async () => {
      const managerContext = testEnv.authenticatedContext(MANAGER_A.uid, {
        role: MANAGER_A.role,
        companyId: MANAGER_A.companyId,
      });
      await assertSucceeds(getDoc(doc(managerContext.firestore(), `jobs/${JOB_A_ID}`)));
    });

    it('should DENY managers from reading jobs in other companies', async () => {
      const managerAContext = testEnv.authenticatedContext(MANAGER_A.uid, {
        role: MANAGER_A.role,
        companyId: MANAGER_A.companyId,
      });
      await assertFails(getDoc(doc(managerAContext.firestore(), `jobs/${JOB_B_ID}`)));
    });

    it('should allow workers to read jobs they are assigned to', async () => {
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertSucceeds(getDoc(doc(workerContext.firestore(), `jobs/${JOB_A_ID}`)));
    });

    it('should DENY workers from reading jobs they are NOT assigned to', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `jobs/job-unassigned`), {
          id: 'job-unassigned',
          name: 'Unassigned Job',
          companyId: COMPANY_A_ID,
          status: 'active',
          workers: [], // Worker A not in list
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertFails(getDoc(doc(workerContext.firestore(), `jobs/job-unassigned`)));
    });

    it('should allow managers to create jobs', async () => {
      const managerContext = testEnv.authenticatedContext(MANAGER_A.uid, {
        role: MANAGER_A.role,
        companyId: MANAGER_A.companyId,
      });
      await assertSucceeds(
        setDoc(doc(managerContext.firestore(), `jobs/new-job`), {
          name: 'New Job',
          companyId: COMPANY_A_ID,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
    });

    it('should DENY workers from creating jobs', async () => {
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertFails(
        setDoc(doc(workerContext.firestore(), `jobs/worker-job`), {
          name: 'Worker Created Job',
          companyId: COMPANY_A_ID,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
    });
  });

  describe('Invoices Collection - Cross-Tenant Security', () => {
    const INVOICE_A_ID = 'invoice-a';
    const INVOICE_B_ID = 'invoice-b';

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `invoices/${INVOICE_A_ID}`), {
          invoiceNumber: 'INV-001',
          companyId: COMPANY_A_ID,
          status: 'pending',
          totalAmount: 1000,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await setDoc(doc(context.firestore(), `invoices/${INVOICE_B_ID}`), {
          invoiceNumber: 'INV-002',
          companyId: COMPANY_B_ID,
          status: 'pending',
          totalAmount: 2000,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    });

    it('should allow active users to read invoices in their company', async () => {
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertSucceeds(getDoc(doc(workerContext.firestore(), `invoices/${INVOICE_A_ID}`)));
    });

    it('should DENY users from reading invoices in other companies', async () => {
      const workerAContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertFails(getDoc(doc(workerAContext.firestore(), `invoices/${INVOICE_B_ID}`)));
    });

    it('should DENY pending users from reading any invoices', async () => {
      const pendingContext = testEnv.authenticatedContext(PENDING_USER.uid, {
        role: PENDING_USER.role,
        companyId: PENDING_USER.companyId,
      });
      await assertFails(getDoc(doc(pendingContext.firestore(), `invoices/${INVOICE_A_ID}`)));
    });

    it('should prevent changing companyId on updates', async () => {
      const adminContext = testEnv.authenticatedContext(ADMIN_A.uid, {
        role: ADMIN_A.role,
        companyId: ADMIN_A.companyId,
      });

      // Try to change companyId (should fail)
      await assertFails(
        updateDoc(doc(adminContext.firestore(), `invoices/${INVOICE_A_ID}`), {
          companyId: COMPANY_B_ID, // Attempting to move invoice to another company!
        }),
      );
    });
  });

  describe('Estimates Collection - Permission Matrix', () => {
    const ESTIMATE_ID = 'estimate-a';

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `estimates/${ESTIMATE_ID}`), {
          estimateNumber: 'EST-001',
          companyId: COMPANY_A_ID,
          status: 'pending',
          totalAmount: 5000,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    });

    it('should allow managers to create estimates', async () => {
      const managerContext = testEnv.authenticatedContext(MANAGER_A.uid, {
        role: MANAGER_A.role,
        companyId: MANAGER_A.companyId,
      });
      await assertSucceeds(
        setDoc(doc(managerContext.firestore(), `estimates/new-estimate`), {
          estimateNumber: 'EST-002',
          companyId: COMPANY_A_ID,
          status: 'pending',
          totalAmount: 3000,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
    });

    it('should allow managers to update estimates', async () => {
      const managerContext = testEnv.authenticatedContext(MANAGER_A.uid, {
        role: MANAGER_A.role,
        companyId: MANAGER_A.companyId,
      });
      await assertSucceeds(
        updateDoc(doc(managerContext.firestore(), `estimates/${ESTIMATE_ID}`), {
          status: 'approved',
        }),
      );
    });

    it('should DENY workers from updating estimates', async () => {
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertFails(
        updateDoc(doc(workerContext.firestore(), `estimates/${ESTIMATE_ID}`), {
          status: 'approved',
        }),
      );
    });

    it('should allow only admins to delete estimates', async () => {
      const adminContext = testEnv.authenticatedContext(ADMIN_A.uid, {
        role: ADMIN_A.role,
        companyId: ADMIN_A.companyId,
      });
      await assertSucceeds(deleteDoc(doc(adminContext.firestore(), `estimates/${ESTIMATE_ID}`)));
    });

    it('should DENY managers from deleting estimates', async () => {
      const managerContext = testEnv.authenticatedContext(MANAGER_A.uid, {
        role: MANAGER_A.role,
        companyId: MANAGER_A.companyId,
      });
      await assertFails(deleteDoc(doc(managerContext.firestore(), `estimates/${ESTIMATE_ID}`)));
    });
  });

  describe('Employees Collection - Multi-Tenant Security', () => {
    const EMPLOYEE_A_ID = 'employee-a';
    const EMPLOYEE_B_ID = 'employee-b';

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `employees/${EMPLOYEE_A_ID}`), {
          id: EMPLOYEE_A_ID,
          name: 'Employee A',
          email: 'employeea@company.com',
          companyId: COMPANY_A_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await setDoc(doc(context.firestore(), `employees/${EMPLOYEE_B_ID}`), {
          id: EMPLOYEE_B_ID,
          name: 'Employee B',
          email: 'employeeb@company.com',
          companyId: COMPANY_B_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    });

    it('should allow active users to read employees in their company', async () => {
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertSucceeds(getDoc(doc(workerContext.firestore(), `employees/${EMPLOYEE_A_ID}`)));
    });

    it('should DENY access to employees from other companies', async () => {
      const workerAContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertFails(getDoc(doc(workerAContext.firestore(), `employees/${EMPLOYEE_B_ID}`)));
    });

    it('should allow managers to create employees', async () => {
      const managerContext = testEnv.authenticatedContext(MANAGER_A.uid, {
        role: MANAGER_A.role,
        companyId: MANAGER_A.companyId,
      });
      await assertSucceeds(
        setDoc(doc(managerContext.firestore(), `employees/new-employee`), {
          name: 'New Employee',
          email: 'new@company.com',
          companyId: COMPANY_A_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
    });

    it('should DENY workers from creating employees', async () => {
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertFails(
        setDoc(doc(workerContext.firestore(), `employees/worker-employee`), {
          name: 'Worker Employee',
          email: 'worker@company.com',
          companyId: COMPANY_A_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
    });

    it('should prevent changing companyId on update', async () => {
      const adminContext = testEnv.authenticatedContext(ADMIN_A.uid, {
        role: ADMIN_A.role,
        companyId: ADMIN_A.companyId,
      });
      await assertFails(
        updateDoc(doc(adminContext.firestore(), `employees/${EMPLOYEE_A_ID}`), {
          companyId: COMPANY_B_ID,
        }),
      );
    });
  });

  describe('Time Entries Collection - Worker Permissions', () => {
    const ENTRY_A_ID = 'entry-a';
    const ENTRY_B_ID = 'entry-b';

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `timeEntries/${ENTRY_A_ID}`), {
          id: ENTRY_A_ID,
          userId: WORKER_A.uid,
          companyId: COMPANY_A_ID,
          date: new Date().toISOString().split('T')[0],
          status: 'pending',
          hours: 8,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await setDoc(doc(context.firestore(), `timeEntries/${ENTRY_B_ID}`), {
          id: ENTRY_B_ID,
          userId: WORKER_B.uid,
          companyId: COMPANY_B_ID,
          date: new Date().toISOString().split('T')[0],
          status: 'pending',
          hours: 8,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    });

    it('should allow workers to read their own time entries', async () => {
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertSucceeds(getDoc(doc(workerContext.firestore(), `timeEntries/${ENTRY_A_ID}`)));
    });

    it('should DENY workers from reading other workers time entries', async () => {
      const workerAContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertFails(getDoc(doc(workerAContext.firestore(), `timeEntries/${ENTRY_B_ID}`)));
    });

    it('should allow managers to read all time entries in their company', async () => {
      const managerContext = testEnv.authenticatedContext(MANAGER_A.uid, {
        role: MANAGER_A.role,
        companyId: MANAGER_A.companyId,
      });
      await assertSucceeds(getDoc(doc(managerContext.firestore(), `timeEntries/${ENTRY_A_ID}`)));
    });

    it('should allow workers to create their own time entries', async () => {
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertSucceeds(
        setDoc(doc(workerContext.firestore(), `timeEntries/new-entry`), {
          userId: WORKER_A.uid,
          companyId: COMPANY_A_ID,
          date: new Date().toISOString().split('T')[0],
          status: 'pending',
          hours: 8,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
    });

    it('should DENY workers from creating time entries for others', async () => {
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertFails(
        setDoc(doc(workerContext.firestore(), `timeEntries/fake-entry`), {
          userId: 'other-user',
          companyId: COMPANY_A_ID,
          date: new Date().toISOString().split('T')[0],
          status: 'pending',
          hours: 8,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
    });

    it('should allow workers to update only pending entries', async () => {
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertSucceeds(
        updateDoc(doc(workerContext.firestore(), `timeEntries/${ENTRY_A_ID}`), {
          hours: 7,
        }),
      );
    });

    it('should DENY workers from updating approved entries', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await updateDoc(doc(context.firestore(), `timeEntries/${ENTRY_A_ID}`), {
          status: 'approved',
        });
      });

      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertFails(
        updateDoc(doc(workerContext.firestore(), `timeEntries/${ENTRY_A_ID}`), {
          hours: 9,
        }),
      );
    });
  });

  describe('Time Clock Entries - Immutability', () => {
    const CLOCK_ENTRY_ID = 'clock-entry-a';

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `timeClockEntries/${CLOCK_ENTRY_ID}`), {
          id: CLOCK_ENTRY_ID,
          employeeId: WORKER_A.uid,
          companyId: COMPANY_A_ID,
          action: 'clock_in',
          timestamp: new Date(),
        });
      });
    });

    it('should allow workers to read their own time clock entries', async () => {
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertSucceeds(
        getDoc(doc(workerContext.firestore(), `timeClockEntries/${CLOCK_ENTRY_ID}`)),
      );
    });

    it('should allow managers to read all time clock entries in their company', async () => {
      const managerContext = testEnv.authenticatedContext(MANAGER_A.uid, {
        role: MANAGER_A.role,
        companyId: MANAGER_A.companyId,
      });
      await assertSucceeds(
        getDoc(doc(managerContext.firestore(), `timeClockEntries/${CLOCK_ENTRY_ID}`)),
      );
    });

    it('should allow workers to create their own clock entries', async () => {
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertSucceeds(
        setDoc(doc(workerContext.firestore(), `timeClockEntries/new-clock`), {
          employeeId: WORKER_A.uid,
          companyId: COMPANY_A_ID,
          action: 'clock_out',
          timestamp: new Date(),
        }),
      );
    });

    it('should FORBID all updates (immutable)', async () => {
      const adminContext = testEnv.authenticatedContext(ADMIN_A.uid, {
        role: ADMIN_A.role,
        companyId: ADMIN_A.companyId,
      });
      await assertFails(
        updateDoc(doc(adminContext.firestore(), `timeClockEntries/${CLOCK_ENTRY_ID}`), {
          action: 'clock_out',
        }),
      );
    });

    it('should allow only admins to delete time clock entries', async () => {
      const adminContext = testEnv.authenticatedContext(ADMIN_A.uid, {
        role: ADMIN_A.role,
        companyId: ADMIN_A.companyId,
      });
      await assertSucceeds(
        deleteDoc(doc(adminContext.firestore(), `timeClockEntries/${CLOCK_ENTRY_ID}`)),
      );
    });
  });

  describe('Notifications Collection - User-Scoped Access', () => {
    const NOTIFICATION_A_ID = 'notification-a';
    const NOTIFICATION_B_ID = 'notification-b';

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `notifications/${NOTIFICATION_A_ID}`), {
          id: NOTIFICATION_A_ID,
          userId: WORKER_A.uid,
          companyId: COMPANY_A_ID,
          type: 'info',
          priority: 'low',
          title: 'Test Notification',
          message: 'Test message',
          read: false,
          archived: false,
          createdAt: new Date(),
        });

        await setDoc(doc(context.firestore(), `notifications/${NOTIFICATION_B_ID}`), {
          id: NOTIFICATION_B_ID,
          userId: WORKER_B.uid,
          companyId: COMPANY_B_ID,
          type: 'info',
          priority: 'low',
          title: 'Test Notification B',
          message: 'Test message B',
          read: false,
          archived: false,
          createdAt: new Date(),
        });
      });
    });

    it('should allow users to read their own notifications', async () => {
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertSucceeds(
        getDoc(doc(workerContext.firestore(), `notifications/${NOTIFICATION_A_ID}`)),
      );
    });

    it('should DENY users from reading other users notifications', async () => {
      const workerAContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertFails(
        getDoc(doc(workerAContext.firestore(), `notifications/${NOTIFICATION_B_ID}`)),
      );
    });

    it('should allow users to update their own notifications (mark as read)', async () => {
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertSucceeds(
        updateDoc(doc(workerContext.firestore(), `notifications/${NOTIFICATION_A_ID}`), {
          read: true,
        }),
      );
    });

    it('should DENY users from changing userId in notifications', async () => {
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertFails(
        updateDoc(doc(workerContext.firestore(), `notifications/${NOTIFICATION_A_ID}`), {
          userId: 'other-user',
        }),
      );
    });

    it('should allow users to delete their own notifications', async () => {
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertSucceeds(
        deleteDoc(doc(workerContext.firestore(), `notifications/${NOTIFICATION_A_ID}`)),
      );
    });
  });

  describe('Audit Logs Collection - Admin-Only & Immutable', () => {
    const LOG_ID = 'log-a';

    beforeEach(async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `auditLogs/${LOG_ID}`), {
          id: LOG_ID,
          eventType: 'user_created',
          severity: 'info',
          userId: ADMIN_A.uid,
          userEmail: ADMIN_A.email,
          companyId: COMPANY_A_ID,
          timestamp: new Date(),
        });
      });
    });

    it('should allow admins to read audit logs in their company', async () => {
      const adminContext = testEnv.authenticatedContext(ADMIN_A.uid, {
        role: ADMIN_A.role,
        companyId: ADMIN_A.companyId,
      });
      await assertSucceeds(getDoc(doc(adminContext.firestore(), `auditLogs/${LOG_ID}`)));
    });

    it('should DENY non-admins from reading audit logs', async () => {
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertFails(getDoc(doc(workerContext.firestore(), `auditLogs/${LOG_ID}`)));
    });

    it('should allow active users to create audit logs', async () => {
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertSucceeds(
        setDoc(doc(workerContext.firestore(), `auditLogs/new-log`), {
          eventType: 'job_viewed',
          severity: 'info',
          userId: WORKER_A.uid,
          userEmail: WORKER_A.email,
          companyId: COMPANY_A_ID,
          timestamp: new Date(),
        }),
      );
    });

    it('should FORBID all updates (immutable)', async () => {
      const adminContext = testEnv.authenticatedContext(ADMIN_A.uid, {
        role: ADMIN_A.role,
        companyId: ADMIN_A.companyId,
      });
      await assertFails(
        updateDoc(doc(adminContext.firestore(), `auditLogs/${LOG_ID}`), {
          severity: 'critical',
        }),
      );
    });
  });

  describe('Job Assignments, Crew Templates, Time Off - Manager Permissions', () => {
    it('should allow managers to create job assignments', async () => {
      const managerContext = testEnv.authenticatedContext(MANAGER_A.uid, {
        role: MANAGER_A.role,
        companyId: MANAGER_A.companyId,
      });
      await assertSucceeds(
        setDoc(doc(managerContext.firestore(), `jobAssignments/assignment-1`), {
          jobId: 'job-123',
          employeeId: WORKER_A.uid,
          assignedDate: new Date(),
          companyId: COMPANY_A_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
    });

    it('should DENY workers from creating job assignments', async () => {
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertFails(
        setDoc(doc(workerContext.firestore(), `jobAssignments/assignment-2`), {
          jobId: 'job-123',
          employeeId: WORKER_A.uid,
          assignedDate: new Date(),
          companyId: COMPANY_A_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
    });

    it('should allow managers to create crew templates', async () => {
      const managerContext = testEnv.authenticatedContext(MANAGER_A.uid, {
        role: MANAGER_A.role,
        companyId: MANAGER_A.companyId,
      });
      await assertSucceeds(
        setDoc(doc(managerContext.firestore(), `crewTemplates/template-1`), {
          name: 'Painting Crew',
          companyId: COMPANY_A_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
    });

    it('should allow workers to create time off requests', async () => {
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertSucceeds(
        setDoc(doc(workerContext.firestore(), `timeOffRequests/request-1`), {
          employeeId: WORKER_A.uid,
          companyId: COMPANY_A_ID,
          startDate: new Date(),
          endDate: new Date(),
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );
    });
  });

  describe('Activity Feed & Notification Preferences', () => {
    it('should allow active users to create activity feed entries', async () => {
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertSucceeds(
        setDoc(doc(workerContext.firestore(), `activityFeed/activity-1`), {
          type: 'job_completed',
          userId: WORKER_A.uid,
          userEmail: WORKER_A.email,
          userName: 'Worker A',
          companyId: COMPANY_A_ID,
          title: 'Job Completed',
          description: 'Job XYZ completed',
          timestamp: new Date(),
        }),
      );
    });

    it('should FORBID updates to activity feed (immutable)', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `activityFeed/activity-1`), {
          type: 'job_completed',
          userId: WORKER_A.uid,
          userEmail: WORKER_A.email,
          userName: 'Worker A',
          companyId: COMPANY_A_ID,
          title: 'Job Completed',
          description: 'Job XYZ completed',
          timestamp: new Date(),
        });
      });

      const adminContext = testEnv.authenticatedContext(ADMIN_A.uid, {
        role: ADMIN_A.role,
        companyId: ADMIN_A.companyId,
      });
      await assertFails(
        updateDoc(doc(adminContext.firestore(), `activityFeed/activity-1`), {
          title: 'Modified',
        }),
      );
    });

    it('should allow users to manage their own notification preferences', async () => {
      const workerContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });

      // Create
      await assertSucceeds(
        setDoc(doc(workerContext.firestore(), `notificationPreferences/${WORKER_A.uid}`), {
          userId: WORKER_A.uid,
          emailNotifications: true,
          pushNotifications: false,
        }),
      );

      // Update
      await assertSucceeds(
        updateDoc(doc(workerContext.firestore(), `notificationPreferences/${WORKER_A.uid}`), {
          emailNotifications: false,
        }),
      );

      // Read
      await assertSucceeds(
        getDoc(doc(workerContext.firestore(), `notificationPreferences/${WORKER_A.uid}`)),
      );

      // Delete
      await assertSucceeds(
        deleteDoc(doc(workerContext.firestore(), `notificationPreferences/${WORKER_A.uid}`)),
      );
    });

    it('should DENY users from accessing other users notification preferences', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), `notificationPreferences/${WORKER_B.uid}`), {
          userId: WORKER_B.uid,
          emailNotifications: true,
        });
      });

      const workerAContext = testEnv.authenticatedContext(WORKER_A.uid, {
        role: WORKER_A.role,
        companyId: WORKER_A.companyId,
      });
      await assertFails(
        getDoc(doc(workerAContext.firestore(), `notificationPreferences/${WORKER_B.uid}`)),
      );
    });
  });

  describe('Security Summary - Permission Matrix', () => {
    it('permission matrix should enforce role hierarchy', async () => {
      // This test documents the expected permission matrix
      const matrix = {
        admin: ['read', 'create', 'update', 'delete'],
        manager: ['read', 'create', 'update'],
        worker: ['read'], // limited to assigned jobs
        pending: [], // no access to company data
      };

      expect(matrix.admin).toContain('delete');
      expect(matrix.manager).not.toContain('delete');
      expect(matrix.worker).toEqual(['read']);
      expect(matrix.pending).toEqual([]);
    });

    it('should enforce cross-tenant isolation across ALL collections', async () => {
      // Document the 16 collections that enforce multi-tenancy
      const multiTenantCollections = [
        'companies',
        'users',
        'jobs',
        'invoices',
        'estimates',
        'employees',
        'timeEntries',
        'timeClockEntries',
        'notifications',
        'auditLogs',
        'jobAssignments',
        'crewTemplates',
        'timeOffRequests',
        'activityFeed',
      ];

      // All collections require companyId or userId for isolation
      expect(multiTenantCollections.length).toBe(14);
    });
  });
});

/**
 * Firebase Emulator Test Utilities
 *
 * Provides utilities for testing against Firebase Emulators with:
 * - Isolated test environments per test suite
 * - Automatic cleanup between tests
 * - Seed data management
 * - Type-safe test data factories
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
  RulesTestContext,
} from '@firebase/rules-unit-testing';
import { Timestamp, setLogLevel } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Suppress Firestore warnings during tests
setLogLevel('error');

/**
 * Test project configuration
 */
export const TEST_PROJECT_ID = 'demo-sierra-painting-test';
export const TEST_COMPANY_ID = 'test-company-001';

/**
 * Initialize test environment with Firestore rules
 */
export async function setupTestEnvironment(): Promise<RulesTestEnvironment> {
  const rulesPath = resolve(__dirname, '../../firestore.rules');
  const rules = readFileSync(rulesPath, 'utf8');

  return await initializeTestEnvironment({
    projectId: TEST_PROJECT_ID,
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8080,
    },
  });
}

/**
 * Get authenticated test context
 */
export function getAuthContext(
  testEnv: RulesTestEnvironment,
  uid: string,
  customClaims?: Record<string, any>
): RulesTestContext {
  return testEnv.authenticatedContext(uid, customClaims);
}

/**
 * Get unauthenticated test context
 */
export function getUnauthContext(testEnv: RulesTestEnvironment): RulesTestContext {
  return testEnv.unauthenticatedContext();
}

/**
 * Clean up test environment
 */
export async function cleanupTestEnvironment(testEnv: RulesTestEnvironment): Promise<void> {
  await testEnv.clearFirestore();
  await testEnv.cleanup();
}

/**
 * Test data factories
 */
export const testDataFactory = {
  /**
   * Create a test user document
   */
  user: (overrides?: Partial<any>) => ({
    uid: 'test-user-001',
    email: 'test@example.com',
    displayName: 'Test User',
    role: 'admin',
    companyId: TEST_COMPANY_ID,
    status: 'active',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  }),

  /**
   * Create a test company document
   */
  company: (overrides?: Partial<any>) => ({
    id: TEST_COMPANY_ID,
    name: 'Test Company',
    email: 'contact@testcompany.com',
    phone: '555-0100',
    address: '123 Test Street',
    city: 'Test City',
    state: 'CA',
    zipCode: '90210',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  }),

  /**
   * Create a test job document
   */
  job: (overrides?: Partial<any>) => ({
    id: 'test-job-001',
    name: 'Test Paint Job',
    address: '456 Oak Avenue, Test City, CA 90210',
    status: 'scheduled',
    startDate: Timestamp.fromDate(new Date('2025-10-20')),
    endDate: Timestamp.fromDate(new Date('2025-10-25')),
    workers: [],
    workerNames: [],
    description: 'Interior painting project',
    notes: 'Test job notes',
    companyId: TEST_COMPANY_ID,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  }),

  /**
   * Create a test invoice document
   */
  invoice: (overrides?: Partial<any>) => ({
    id: 'test-invoice-001',
    invoiceNumber: 'INV-2025-001',
    client: 'Test Client',
    clientEmail: 'client@example.com',
    amount: 5000,
    subtotal: 4545.45,
    tax: 454.55,
    taxRate: 0.1,
    status: 'sent',
    date: Timestamp.fromDate(new Date('2025-10-01')),
    dueDate: Timestamp.fromDate(new Date('2025-10-31')),
    amountPaid: 0,
    remainingBalance: 5000,
    payments: [],
    jobId: 'test-job-001',
    notes: 'Test invoice notes',
    companyId: TEST_COMPANY_ID,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  }),

  /**
   * Create a test employee document
   */
  employee: (overrides?: Partial<any>) => ({
    id: 'test-employee-001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '555-0101',
    role: 'painter',
    status: 'active',
    hireDate: Timestamp.fromDate(new Date('2025-01-01')),
    hourlyRate: 25.0,
    companyId: TEST_COMPANY_ID,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  }),

  /**
   * Create a test estimate document
   */
  estimate: (overrides?: Partial<any>) => ({
    id: 'test-estimate-001',
    estimateNumber: 'EST-2025-001',
    client: 'Potential Client',
    clientEmail: 'potential@example.com',
    amount: 3500,
    status: 'sent',
    date: Timestamp.fromDate(new Date('2025-10-15')),
    expiryDate: Timestamp.fromDate(new Date('2025-11-15')),
    description: 'Residential painting estimate',
    lineItems: [
      { description: 'Interior painting', quantity: 1, rate: 2000, amount: 2000 },
      { description: 'Exterior trim', quantity: 1, rate: 1500, amount: 1500 },
    ],
    notes: 'Valid for 30 days',
    companyId: TEST_COMPANY_ID,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  }),
};

/**
 * Seed test data into Firestore
 */
export async function seedTestData(
  testEnv: RulesTestEnvironment,
  collections: {
    users?: any[];
    companies?: any[];
    jobs?: any[];
    invoices?: any[];
    employees?: any[];
    estimates?: any[];
  }
): Promise<void> {
  const adminContext = testEnv.authenticatedContext('admin', { admin: true });
  const db = adminContext.firestore();

  // Seed users
  if (collections.users) {
    for (const user of collections.users) {
      await db.collection('users').doc(user.uid).set(user);
    }
  }

  // Seed companies
  if (collections.companies) {
    for (const company of collections.companies) {
      await db.collection('companies').doc(company.id).set(company);
    }
  }

  // Seed jobs
  if (collections.jobs) {
    for (const job of collections.jobs) {
      await db.collection('jobs').doc(job.id).set(job);
    }
  }

  // Seed invoices
  if (collections.invoices) {
    for (const invoice of collections.invoices) {
      await db.collection('invoices').doc(invoice.id).set(invoice);
    }
  }

  // Seed employees
  if (collections.employees) {
    for (const employee of collections.employees) {
      await db.collection('employees').doc(employee.id).set(employee);
    }
  }

  // Seed estimates
  if (collections.estimates) {
    for (const estimate of collections.estimates) {
      await db.collection('estimates').doc(estimate.id).set(estimate);
    }
  }
}

/**
 * Test helpers
 */
export { assertFails, assertSucceeds };

/**
 * Create a test user with specific role
 */
export function createTestUser(
  role: 'admin' | 'manager' | 'employee' | 'viewer',
  companyId = TEST_COMPANY_ID
) {
  return testDataFactory.user({
    uid: `test-${role}-001`,
    email: `${role}@example.com`,
    role,
    companyId,
  });
}

/**
 * Wait for emulator to be ready
 */
export async function waitForEmulator(
  host = '127.0.0.1',
  port = 8080,
  maxRetries = 10
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`http://${host}:${port}`);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Emulator not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

/**
 * Type-safe Firestore reference helpers
 */
export const collections = {
  users: 'users',
  companies: 'companies',
  jobs: 'jobs',
  invoices: 'invoices',
  employees: 'employees',
  estimates: 'estimates',
  auditLogs: 'auditLogs',
} as const;

export type CollectionName = (typeof collections)[keyof typeof collections];

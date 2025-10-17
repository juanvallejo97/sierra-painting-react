/**
 * Firebase Mock Utilities for Testing
 *
 * Provides mock implementations of Firebase services for unit testing
 */

import { User as FirebaseUser } from 'firebase/auth';
import { User, UserRole } from '../../types';

/**
 * Create a mock Firebase user
 */
export const createMockFirebaseUser = (overrides?: Partial<FirebaseUser>): FirebaseUser => {
  return {
    uid: 'test-user-123',
    email: 'test@example.com',
    emailVerified: true,
    displayName: 'Test User',
    photoURL: null,
    phoneNumber: null,
    isAnonymous: false,
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    },
    providerData: [],
    refreshToken: 'mock-refresh-token',
    tenantId: null,
    delete: vi.fn(),
    getIdToken: vi.fn().mockResolvedValue('mock-id-token'),
    getIdTokenResult: vi.fn(),
    reload: vi.fn(),
    toJSON: vi.fn(),
    ...overrides,
  } as unknown as FirebaseUser;
};

/**
 * Create a mock application user
 */
export const createMockUser = (overrides?: Partial<User>): User => {
  return {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    role: 'admin' as UserRole,
    companyId: 'test-company-001',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

/**
 * Mock Firestore query snapshot
 */
export const createMockQuerySnapshot = (docs: any[] = []) => {
  return {
    docs: docs.map((data, index) => ({
      id: `doc-${index}`,
      data: () => data,
      exists: () => true,
      ref: {},
    })),
    empty: docs.length === 0,
    size: docs.length,
    forEach: (callback: (doc: any) => void) => {
      docs.forEach((data, index) => {
        callback({
          id: `doc-${index}`,
          data: () => data,
          exists: () => true,
        });
      });
    },
  };
};

/**
 * Mock Firestore document snapshot
 */
export const createMockDocumentSnapshot = (data: any, id = 'test-doc') => {
  return {
    id,
    data: () => data,
    exists: () => !!data,
    ref: {},
    metadata: {
      fromCache: false,
      hasPendingWrites: false,
    },
  };
};

/**
 * Mock Firebase error
 */
export const createFirebaseError = (code: string, message: string) => {
  const error = new Error(message) as any;
  error.code = code;
  return error;
};

/**
 * Create a mock Firestore Timestamp
 */
export const createMockTimestamp = (date: Date = new Date()) => ({
  toDate: () => date,
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: 0,
});

/**
 * Common test data generators
 */
export const testData = {
  invoice: (overrides = {}) => ({
    id: 'inv-001',
    invoiceNumber: 'INV-202510-0001',
    client: 'Test Client',
    clientEmail: 'client@example.com',
    amount: 1000,
    subtotal: 900,
    tax: 100,
    taxRate: 10,
    status: 'draft',
    date: '2025-10-17',
    dueDate: '2025-11-17',
    amountPaid: 0,
    remainingBalance: 1000,
    payments: [],
    companyId: 'test-company-001',
    createdAt: createMockTimestamp(),
    updatedAt: createMockTimestamp(),
    ...overrides,
  }),

  job: (overrides = {}) => ({
    id: 'job-001',
    name: 'Test Job',
    address: '123 Test St',
    status: 'scheduled',
    startDate: '2025-10-20',
    endDate: '2025-10-27',
    companyId: 'test-company-001',
    createdAt: createMockTimestamp(),
    updatedAt: createMockTimestamp(),
    ...overrides,
  }),

  employee: (overrides = {}) => ({
    uid: 'emp-001',
    email: 'employee@example.com',
    displayName: 'Test Employee',
    role: 'worker' as UserRole,
    companyId: 'test-company-001',
    status: 'active',
    createdAt: createMockTimestamp(),
    updatedAt: createMockTimestamp(),
    ...overrides,
  }),
};

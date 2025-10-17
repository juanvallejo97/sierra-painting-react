/**
 * Firestore Converters Test Suite
 *
 * Tests for type-safe converters with Zod validation
 */

import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  dateToTimestamp,
  timestampToDate,
  convertTimestampsToDate,
  convertDatesToTimestamp,
  stripUndefined,
} from '../base-converter';
import {
  validateCreateJob,
  validateUpdateJob,
  JobStatus,
} from '../job-converter';
import {
  validateCreateInvoice,
  validateRecordPayment,
  calculateInvoiceAmounts,
  calculateRemainingBalance,
  InvoiceStatus,
  PaymentMethod,
} from '../invoice-converter';
import {
  validateCreateUser,
  hasPermission,
  isAdmin,
  isManager,
  UserRole,
} from '../user-converter';

describe('Base Converter Utilities', () => {
  describe('Timestamp conversion', () => {
    it('should convert Date to Timestamp', () => {
      const date = new Date('2025-10-17');
      const timestamp = dateToTimestamp(date);

      expect(timestamp).toBeInstanceOf(Timestamp);
      expect(timestamp.toDate().getTime()).toBe(date.getTime());
    });

    it('should return Timestamp as-is', () => {
      const timestamp = Timestamp.now();
      const result = dateToTimestamp(timestamp);

      expect(result).toBe(timestamp);
    });

    it('should convert Timestamp to Date', () => {
      const timestamp = Timestamp.now();
      const date = timestampToDate(timestamp);

      expect(date).toBeInstanceOf(Date);
    });

    it('should return Date as-is', () => {
      const date = new Date();
      const result = timestampToDate(date);

      expect(result).toBe(date);
    });
  });

  describe('Recursive timestamp conversion', () => {
    it('should convert all Timestamps to Dates in nested object', () => {
      const obj = {
        date: Timestamp.now(),
        nested: {
          anotherDate: Timestamp.now(),
        },
        array: [Timestamp.now()],
      };

      const result = convertTimestampsToDate(obj);

      expect(result.date).toBeInstanceOf(Date);
      expect(result.nested.anotherDate).toBeInstanceOf(Date);
      expect(result.array[0]).toBeInstanceOf(Date);
    });

    it('should convert all Dates to Timestamps in nested object', () => {
      const obj = {
        date: new Date(),
        nested: {
          anotherDate: new Date(),
        },
        array: [new Date()],
      };

      const result = convertDatesToTimestamp(obj);

      expect(result.date).toBeInstanceOf(Timestamp);
      expect(result.nested.anotherDate).toBeInstanceOf(Timestamp);
      expect(result.array[0]).toBeInstanceOf(Timestamp);
    });
  });

  describe('stripUndefined', () => {
    it('should remove undefined values', () => {
      const obj = {
        a: 1,
        b: undefined,
        c: {
          d: 2,
          e: undefined,
        },
      };

      const result = stripUndefined(obj);

      expect(result).toEqual({
        a: 1,
        c: {
          d: 2,
        },
      });
    });

    it('should handle arrays', () => {
      const obj = {
        arr: [1, undefined, 3],
      };

      const result = stripUndefined(obj);

      expect(result.arr).toEqual([1, undefined, 3]); // Arrays keep undefined
    });
  });
});

describe('Job Converter', () => {
  describe('validateCreateJob', () => {
    it('should validate valid job data', () => {
      const validJob = {
        name: 'Test Job',
        address: '123 Main St',
        status: 'scheduled' as JobStatus,
        startDate: new Date(),
        workers: [],
        companyId: 'company-001',
      };

      expect(() => validateCreateJob(validJob)).not.toThrow();
      const result = validateCreateJob(validJob);
      expect(result.name).toBe('Test Job');
    });

    it('should reject job with short name', () => {
      const invalidJob = {
        name: 'ab',
        address: '123 Main St',
        status: 'scheduled',
        startDate: new Date(),
        companyId: 'company-001',
      };

      expect(() => validateCreateJob(invalidJob)).toThrow();
    });

    it('should reject job with invalid status', () => {
      const invalidJob = {
        name: 'Test Job',
        address: '123 Main St',
        status: 'invalid-status',
        startDate: new Date(),
        companyId: 'company-001',
      };

      expect(() => validateCreateJob(invalidJob)).toThrow();
    });

    it('should apply default values', () => {
      const job = {
        name: 'Test Job',
        address: '123 Main St',
        status: 'scheduled' as JobStatus,
        startDate: new Date(),
        companyId: 'company-001',
      };

      const result = validateCreateJob(job);
      expect(result.workers).toEqual([]);
    });
  });

  describe('validateUpdateJob', () => {
    it('should validate partial update', () => {
      const update = {
        status: 'completed' as JobStatus,
      };

      expect(() => validateUpdateJob(update)).not.toThrow();
    });

    it('should reject invalid field', () => {
      const update = {
        status: 'invalid-status',
      };

      expect(() => validateUpdateJob(update)).toThrow();
    });
  });
});

describe('Invoice Converter', () => {
  describe('validateCreateInvoice', () => {
    it('should validate valid invoice data', () => {
      const validInvoice = {
        invoiceNumber: 'INV-001',
        client: 'John Doe',
        clientEmail: 'john@example.com',
        subtotal: 1000,
        tax: 100,
        amount: 1100,
        taxRate: 10,
        status: 'draft' as InvoiceStatus,
        date: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        companyId: 'company-001',
      };

      expect(() => validateCreateInvoice(validInvoice)).not.toThrow();
      const result = validateCreateInvoice(validInvoice);
      expect(result.invoiceNumber).toBe('INV-001');
    });

    it('should reject invoice with invalid email', () => {
      const invalidInvoice = {
        invoiceNumber: 'INV-001',
        client: 'John Doe',
        clientEmail: 'not-an-email',
        subtotal: 1000,
        amount: 1100,
        tax: 100,
        status: 'draft',
        date: new Date(),
        dueDate: new Date(),
        companyId: 'company-001',
      };

      expect(() => validateCreateInvoice(invalidInvoice)).toThrow();
    });

    it('should reject invoice with negative amount', () => {
      const invalidInvoice = {
        invoiceNumber: 'INV-001',
        client: 'John Doe',
        subtotal: -1000,
        amount: -1100,
        tax: -100,
        status: 'draft',
        date: new Date(),
        dueDate: new Date(),
        companyId: 'company-001',
      };

      expect(() => validateCreateInvoice(invalidInvoice)).toThrow();
    });
  });

  describe('validateRecordPayment', () => {
    it('should validate payment data', () => {
      const payment = {
        invoiceId: 'inv-001',
        amount: 500,
        date: new Date(),
        method: 'cash' as PaymentMethod,
      };

      expect(() => validateRecordPayment(payment)).not.toThrow();
    });

    it('should apply default payment method', () => {
      const payment = {
        invoiceId: 'inv-001',
        amount: 500,
        date: new Date(),
      };

      const result = validateRecordPayment(payment);
      expect(result.method).toBe('cash');
    });
  });

  describe('calculateInvoiceAmounts', () => {
    it('should calculate correct amounts', () => {
      const result = calculateInvoiceAmounts(1000, 10);

      expect(result.subtotal).toBe(1000);
      expect(result.tax).toBe(100);
      expect(result.total).toBe(1100);
      expect(result.taxRate).toBe(10);
    });

    it('should round to 2 decimal places', () => {
      const result = calculateInvoiceAmounts(1000.33, 8.5);

      expect(result.subtotal).toBe(1000.33);
      expect(result.tax).toBe(85.03);
      expect(result.total).toBe(1085.36);
    });
  });

  describe('calculateRemainingBalance', () => {
    it('should calculate remaining balance', () => {
      const payments = [
        { amount: 500, date: Timestamp.now(), method: 'cash' as PaymentMethod },
        { amount: 300, date: Timestamp.now(), method: 'check' as PaymentMethod },
      ];

      const result = calculateRemainingBalance(1000, payments);
      expect(result).toBe(200);
    });

    it('should not return negative balance', () => {
      const payments = [
        { amount: 1200, date: Timestamp.now(), method: 'cash' as PaymentMethod },
      ];

      const result = calculateRemainingBalance(1000, payments);
      expect(result).toBe(0);
    });

    it('should handle empty payments', () => {
      const result = calculateRemainingBalance(1000, []);
      expect(result).toBe(1000);
    });
  });
});

describe('User Converter', () => {
  describe('validateCreateUser', () => {
    it('should validate valid user data', () => {
      const validUser = {
        uid: 'user-001',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'worker' as UserRole,
        companyId: 'company-001',
      };

      expect(() => validateCreateUser(validUser)).not.toThrow();
    });

    it('should apply default status', () => {
      const user = {
        uid: 'user-001',
        email: 'user@example.com',
        role: 'worker' as UserRole,
      };

      const result = validateCreateUser(user);
      expect(result.status).toBe('active');
    });

    it('should reject invalid email', () => {
      const invalidUser = {
        uid: 'user-001',
        email: 'not-an-email',
        role: 'worker',
      };

      expect(() => validateCreateUser(invalidUser)).toThrow();
    });
  });

  describe('hasPermission', () => {
    it('should allow admin all permissions', () => {
      const admin = {
        uid: 'admin-001',
        email: 'admin@example.com',
        role: 'admin' as UserRole,
        status: 'active' as const,
      };

      expect(hasPermission(admin, 'viewer')).toBe(true);
      expect(hasPermission(admin, 'worker')).toBe(true);
      expect(hasPermission(admin, 'manager')).toBe(true);
      expect(hasPermission(admin, 'admin')).toBe(true);
    });

    it('should restrict worker permissions', () => {
      const worker = {
        uid: 'worker-001',
        email: 'worker@example.com',
        role: 'worker' as UserRole,
        status: 'active' as const,
      };

      expect(hasPermission(worker, 'viewer')).toBe(true);
      expect(hasPermission(worker, 'worker')).toBe(true);
      expect(hasPermission(worker, 'manager')).toBe(false);
      expect(hasPermission(worker, 'admin')).toBe(false);
    });
  });

  describe('Role helpers', () => {
    it('should identify admin', () => {
      const admin = {
        uid: 'admin-001',
        email: 'admin@example.com',
        role: 'admin' as UserRole,
        status: 'active' as const,
      };

      expect(isAdmin(admin)).toBe(true);
      expect(isManager(admin)).toBe(true);
    });

    it('should identify manager', () => {
      const manager = {
        uid: 'manager-001',
        email: 'manager@example.com',
        role: 'manager' as UserRole,
        status: 'active' as const,
      };

      expect(isAdmin(manager)).toBe(false);
      expect(isManager(manager)).toBe(true);
    });

    it('should identify non-manager', () => {
      const worker = {
        uid: 'worker-001',
        email: 'worker@example.com',
        role: 'worker' as UserRole,
        status: 'active' as const,
      };

      expect(isAdmin(worker)).toBe(false);
      expect(isManager(worker)).toBe(false);
    });
  });
});

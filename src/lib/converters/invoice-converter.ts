/**
 * Invoice Document Converter
 *
 * Type-safe converter for Invoice collection with Zod validation
 */

import { z } from 'zod';
import { createConverter } from './base-converter';
import { Timestamp } from 'firebase/firestore';

/**
 * Invoice status enum
 */
export const InvoiceStatus = z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']);
export type InvoiceStatus = z.infer<typeof InvoiceStatus>;

/**
 * Payment method enum
 */
export const PaymentMethod = z.enum(['cash', 'check', 'credit', 'bank_transfer', 'other']);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

/**
 * Payment record schema
 */
export const paymentSchema = z.object({
  amount: z.number().positive(),
  date: z.union([z.date(), z.instanceof(Timestamp)]),
  method: PaymentMethod,
  reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export type Payment = z.infer<typeof paymentSchema>;

/**
 * Invoice document schema for Firestore
 */
export const invoiceSchema = z.object({
  id: z.string().optional(),
  invoiceNumber: z.string().min(1).max(50),
  client: z.string().min(2).max(200),
  clientEmail: z.string().email().optional(),
  amount: z.number().positive().max(10000000),
  subtotal: z.number().positive().max(10000000),
  tax: z.number().min(0).max(10000000),
  taxRate: z.number().min(0).max(100).default(8.5),
  status: InvoiceStatus,
  date: z.union([z.date(), z.instanceof(Timestamp)]),
  dueDate: z.union([z.date(), z.instanceof(Timestamp)]),
  sentDate: z.union([z.date(), z.instanceof(Timestamp)]).optional(),
  paidDate: z.union([z.date(), z.instanceof(Timestamp)]).optional(),
  amountPaid: z.number().min(0).default(0),
  remainingBalance: z.number().min(0),
  payments: z.array(paymentSchema).default([]),
  jobId: z.string().optional(),
  notes: z.string().max(1000).optional(),
  companyId: z.string(),
  createdAt: z.union([z.date(), z.instanceof(Timestamp)]).optional(),
  updatedAt: z.union([z.date(), z.instanceof(Timestamp)]).optional(),
});

/**
 * Invoice document type
 */
export type Invoice = z.infer<typeof invoiceSchema>;

/**
 * Invoice document interface (with Date types for app use)
 */
export interface InvoiceDocument extends Omit<Invoice, 'date' | 'dueDate' | 'sentDate' | 'paidDate' | 'createdAt' | 'updatedAt' | 'payments'> {
  date: Date;
  dueDate: Date;
  sentDate?: Date;
  paidDate?: Date;
  payments: Array<Omit<Payment, 'date'> & { date: Date }>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Invoice data for creation (form data)
 */
export const createInvoiceInputSchema = invoiceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sentDate: true,
  paidDate: true,
  amountPaid: true,
  remainingBalance: true,
  payments: true,
}).extend({
  status: InvoiceStatus.default('draft'),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceInputSchema>;

/**
 * Invoice data for updates (partial)
 */
export const updateInvoiceInputSchema = invoiceSchema.partial().omit({
  id: true,
  companyId: true,
  createdAt: true,
  invoiceNumber: true, // Invoice number should not be changed
});

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceInputSchema>;

/**
 * Payment recording schema
 */
export const recordPaymentInputSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
  date: z.union([z.date(), z.instanceof(Timestamp), z.string().transform(str => new Date(str))]),
  method: PaymentMethod.default('cash'),
  reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentInputSchema>;

/**
 * Invoice Firestore converter
 */
export const invoiceConverter = createConverter<Invoice>(
  invoiceSchema,
  'invoices',
  {
    validateOnRead: true,
    validateOnWrite: true,
    convertTimestamps: true,
    stripUndefined: true,
  }
);

/**
 * Helper to validate invoice creation data
 */
export function validateCreateInvoice(data: unknown): CreateInvoiceInput {
  return createInvoiceInputSchema.parse(data);
}

/**
 * Helper to validate invoice update data
 */
export function validateUpdateInvoice(data: unknown): UpdateInvoiceInput {
  return updateInvoiceInputSchema.parse(data);
}

/**
 * Helper to validate payment recording data
 */
export function validateRecordPayment(data: unknown): RecordPaymentInput {
  return recordPaymentInputSchema.parse(data);
}

/**
 * Calculate invoice amounts
 */
export function calculateInvoiceAmounts(subtotal: number, taxRate: number): {
  subtotal: number;
  tax: number;
  total: number;
  taxRate: number;
} {
  const tax = (subtotal * taxRate) / 100;
  const total = subtotal + tax;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
    taxRate,
  };
}

/**
 * Calculate remaining balance
 */
export function calculateRemainingBalance(total: number, payments: Payment[]): number {
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  return Math.max(0, total - totalPaid);
}

import { z } from 'zod';

/**
 * Invoice creation schema
 */
export const createInvoiceSchema = z.object({
  client: z
    .string()
    .min(2, 'Client name must be at least 2 characters')
    .max(200, 'Client name must be less than 200 characters')
    .trim(),
  clientEmail: z
    .string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  subtotal: z
    .number()
    .positive('Subtotal must be greater than 0')
    .max(1000000, 'Subtotal must be less than $1,000,000')
    .or(
      z.string().transform((val) => {
        const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
        if (isNaN(num)) throw new Error('Invalid number');
        return num;
      })
    ),
  taxRate: z
    .number()
    .min(0, 'Tax rate must be at least 0%')
    .max(100, 'Tax rate must be less than 100%')
    .default(8.5)
    .or(
      z.string().transform((val) => {
        const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
        if (isNaN(num)) throw new Error('Invalid number');
        return num;
      })
    ),
  dueDate: z
    .string()
    .min(1, 'Due date is required')
    .refine((date) => /^\d{4}-\d{2}-\d{2}$/.test(date), 'Invalid date format')
    .refine((date) => {
      // Due date should be in the future or today
      const dueDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate >= today;
    }, 'Due date must be today or in the future'),
  jobId: z.string().optional(),
  notes: z
    .string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
});

export type CreateInvoiceFormData = z.infer<typeof createInvoiceSchema>;

/**
 * Invoice update schema
 */
export const updateInvoiceSchema = z.object({
  client: z
    .string()
    .min(2, 'Client name must be at least 2 characters')
    .max(200)
    .trim()
    .optional(),
  clientEmail: z
    .string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  subtotal: z
    .number()
    .positive()
    .max(1000000)
    .or(z.string().transform((val) => parseFloat(val.replace(/[^0-9.-]/g, ''))))
    .optional(),
  taxRate: z
    .number()
    .min(0)
    .max(100)
    .or(z.string().transform((val) => parseFloat(val.replace(/[^0-9.-]/g, ''))))
    .optional(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional(),
  dueDate: z
    .string()
    .refine((date) => /^\d{4}-\d{2}-\d{2}$/.test(date), 'Invalid date format')
    .optional(),
  paidDate: z
    .string()
    .refine((date) => /^\d{4}-\d{2}-\d{2}$/.test(date), 'Invalid date format')
    .optional(),
  jobId: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export type UpdateInvoiceFormData = z.infer<typeof updateInvoiceSchema>;

/**
 * Payment recording schema
 */
export const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  paidDate: z
    .string()
    .min(1, 'Payment date is required')
    .refine((date) => /^\d{4}-\d{2}-\d{2}$/.test(date), 'Invalid date format')
    .refine((date) => {
      // Payment date should not be in the future
      const paymentDate = new Date(date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return paymentDate <= today;
    }, 'Payment date cannot be in the future'),
  paymentMethod: z.enum(['cash', 'check', 'credit', 'bank_transfer', 'other']).default('cash'),
  reference: z
    .string()
    .max(100, 'Reference must be less than 100 characters')
    .optional(),
  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional(),
});

export type RecordPaymentFormData = z.infer<typeof recordPaymentSchema>;

/**
 * Invoice filter schema
 */
export const invoiceFilterSchema = z.object({
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled', 'all']).default('all'),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  client: z.string().optional(),
});

export type InvoiceFilterData = z.infer<typeof invoiceFilterSchema>;

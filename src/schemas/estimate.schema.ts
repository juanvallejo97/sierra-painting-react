import { z } from 'zod';

/**
 * Line item schema for estimates
 */
export const lineItemSchema = z.object({
  description: z
    .string()
    .min(1, 'Description is required')
    .max(200, 'Description must be less than 200 characters')
    .trim(),
  quantity: z
    .number()
    .positive('Quantity must be greater than 0')
    .max(10000, 'Quantity must be less than 10,000')
    .or(
      z.string().transform((val) => {
        const num = parseFloat(val);
        if (isNaN(num)) throw new Error('Invalid number');
        return num;
      })
    ),
  rate: z
    .number()
    .positive('Rate must be greater than 0')
    .max(100000, 'Rate must be less than $100,000')
    .or(
      z.string().transform((val) => {
        const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
        if (isNaN(num)) throw new Error('Invalid number');
        return num;
      })
    ),
  amount: z.number().optional(), // Calculated automatically
});

export type LineItemData = z.infer<typeof lineItemSchema>;

/**
 * Estimate creation schema
 */
export const createEstimateSchema = z.object({
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
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .max(1000000, 'Amount must be less than $1,000,000')
    .or(
      z.string().transform((val) => {
        const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
        if (isNaN(num)) throw new Error('Invalid number');
        return num;
      })
    ),
  expiryDate: z
    .string()
    .optional()
    .refine((date) => {
      if (!date) return true;
      return /^\d{4}-\d{2}-\d{2}$/.test(date);
    }, 'Invalid date format')
    .refine((date) => {
      if (!date) return true;
      // Expiry date should be in the future
      const expiryDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return expiryDate > today;
    }, 'Expiry date must be in the future'),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  lineItems: z
    .array(lineItemSchema)
    .min(1, 'At least one line item is required')
    .optional(),
  notes: z
    .string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
});

export type CreateEstimateFormData = z.infer<typeof createEstimateSchema>;

/**
 * Estimate update schema
 */
export const updateEstimateSchema = z.object({
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
  amount: z
    .number()
    .positive()
    .max(1000000)
    .or(z.string().transform((val) => parseFloat(val.replace(/[^0-9.-]/g, ''))))
    .optional(),
  status: z.enum(['draft', 'sent', 'approved', 'rejected', 'expired']).optional(),
  expiryDate: z
    .string()
    .refine((date) => /^\d{4}-\d{2}-\d{2}$/.test(date), 'Invalid date format')
    .optional(),
  description: z.string().max(1000).optional(),
  lineItems: z.array(lineItemSchema).optional(),
  notes: z.string().max(1000).optional(),
});

export type UpdateEstimateFormData = z.infer<typeof updateEstimateSchema>;

/**
 * Convert estimate to job schema
 */
export const convertToJobSchema = z.object({
  estimateId: z.string().min(1, 'Estimate ID is required'),
  jobName: z
    .string()
    .min(3, 'Job name must be at least 3 characters')
    .max(200)
    .trim()
    .optional(), // Defaults to estimate description
  startDate: z
    .string()
    .min(1, 'Start date is required')
    .refine((date) => /^\d{4}-\d{2}-\d{2}$/.test(date), 'Invalid date format'),
  workers: z
    .array(z.string())
    .min(1, 'At least one worker must be assigned'),
});

export type ConvertToJobFormData = z.infer<typeof convertToJobSchema>;

/**
 * Convert estimate to invoice schema
 */
export const convertToInvoiceSchema = z.object({
  estimateId: z.string().min(1, 'Estimate ID is required'),
  dueDate: z
    .string()
    .min(1, 'Due date is required')
    .refine((date) => /^\d{4}-\d{2}-\d{2}$/.test(date), 'Invalid date format')
    .refine((date) => {
      const dueDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate >= today;
    }, 'Due date must be today or in the future'),
  taxRate: z
    .number()
    .min(0)
    .max(100)
    .default(8.5)
    .or(z.string().transform((val) => parseFloat(val.replace(/[^0-9.-]/g, '')))),
});

export type ConvertToInvoiceFormData = z.infer<typeof convertToInvoiceSchema>;

/**
 * Estimate filter schema
 */
export const estimateFilterSchema = z.object({
  status: z.enum(['draft', 'sent', 'approved', 'rejected', 'expired', 'all']).default('all'),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  client: z.string().optional(),
});

export type EstimateFilterData = z.infer<typeof estimateFilterSchema>;

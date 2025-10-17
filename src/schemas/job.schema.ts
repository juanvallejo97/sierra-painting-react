import { z } from 'zod';

/**
 * Job creation schema
 */
export const createJobSchema = z.object({
  name: z
    .string()
    .min(3, 'Job name must be at least 3 characters')
    .max(200, 'Job name must be less than 200 characters')
    .trim(),
  client: z
    .string()
    .min(2, 'Client name must be at least 2 characters')
    .max(200, 'Client name must be less than 200 characters')
    .trim(),
  address: z
    .string()
    .min(5, 'Address must be at least 5 characters')
    .max(300, 'Address must be less than 300 characters')
    .trim(),
  startDate: z
    .string()
    .min(1, 'Start date is required')
    .refine((date) => {
      // Ensure it's a valid date format YYYY-MM-DD
      return /^\d{4}-\d{2}-\d{2}$/.test(date);
    }, 'Invalid date format'),
  endDate: z
    .string()
    .optional()
    .refine((date) => {
      if (!date) return true;
      return /^\d{4}-\d{2}-\d{2}$/.test(date);
    }, 'Invalid date format'),
  workers: z
    .array(z.string())
    .default([])
    .optional(),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  notes: z
    .string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
}).refine(
  (data) => {
    // Validate end date is after start date
    if (!data.endDate) return true;
    return new Date(data.endDate) >= new Date(data.startDate);
  },
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);

export type CreateJobFormData = z.infer<typeof createJobSchema>;

/**
 * Job update schema
 */
export const updateJobSchema = z.object({
  name: z
    .string()
    .min(3, 'Job name must be at least 3 characters')
    .max(200, 'Job name must be less than 200 characters')
    .trim()
    .optional(),
  client: z
    .string()
    .min(2, 'Client name must be at least 2 characters')
    .max(200, 'Client name must be less than 200 characters')
    .trim()
    .optional(),
  address: z
    .string()
    .min(5, 'Address must be at least 5 characters')
    .max(300, 'Address must be less than 300 characters')
    .trim()
    .optional(),
  status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled']).optional(),
  startDate: z
    .string()
    .refine((date) => /^\d{4}-\d{2}-\d{2}$/.test(date), 'Invalid date format')
    .optional(),
  endDate: z
    .string()
    .refine((date) => /^\d{4}-\d{2}-\d{2}$/.test(date), 'Invalid date format')
    .optional(),
  workers: z.array(z.string()).optional(),
  description: z.string().max(1000).optional(),
  notes: z.string().max(1000).optional(),
});

export type UpdateJobFormData = z.infer<typeof updateJobSchema>;

/**
 * Job search/filter schema
 */
export const jobFilterSchema = z.object({
  status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled', 'all']).default('all'),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  workerId: z.string().optional(),
});

export type JobFilterData = z.infer<typeof jobFilterSchema>;

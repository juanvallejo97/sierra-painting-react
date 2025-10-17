/**
 * Job Document Converter
 *
 * Type-safe converter for Job collection with Zod validation
 */

import { z } from 'zod';
import { createConverter } from './base-converter';
import { Timestamp } from 'firebase/firestore';

/**
 * Job status enum
 */
export const JobStatus = z.enum(['scheduled', 'in-progress', 'completed', 'cancelled']);
export type JobStatus = z.infer<typeof JobStatus>;

/**
 * Job document schema for Firestore
 */
export const jobSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3).max(200),
  address: z.string().min(5).max(300),
  status: JobStatus,
  startDate: z.union([z.date(), z.instanceof(Timestamp)]),
  endDate: z.union([z.date(), z.instanceof(Timestamp)]).optional(),
  workers: z.array(z.string()).default([]),
  workerNames: z.array(z.string()).optional().default([]),
  description: z.string().max(1000).optional(),
  notes: z.string().max(1000).optional(),
  companyId: z.string(),
  createdAt: z.union([z.date(), z.instanceof(Timestamp)]).optional(),
  updatedAt: z.union([z.date(), z.instanceof(Timestamp)]).optional(),
});

/**
 * Job document type
 */
export type Job = z.infer<typeof jobSchema>;

/**
 * Job document interface (with Date types for app use)
 */
export interface JobDocument extends Omit<Job, 'startDate' | 'endDate' | 'createdAt' | 'updatedAt'> {
  startDate: Date;
  endDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Job data for creation (form data)
 */
export const createJobInputSchema = jobSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  workerNames: true,
}).extend({
  status: JobStatus.default('scheduled'),
});

export type CreateJobInput = z.infer<typeof createJobInputSchema>;

/**
 * Job data for updates (partial)
 */
export const updateJobInputSchema = jobSchema.partial().omit({
  id: true,
  companyId: true,
  createdAt: true,
});

export type UpdateJobInput = z.infer<typeof updateJobInputSchema>;

/**
 * Job Firestore converter
 */
export const jobConverter = createConverter<Job>(
  jobSchema,
  'jobs',
  {
    validateOnRead: true,
    validateOnWrite: true,
    convertTimestamps: true,
    stripUndefined: true,
  }
);

/**
 * Helper to validate job creation data
 */
export function validateCreateJob(data: unknown): CreateJobInput {
  return createJobInputSchema.parse(data);
}

/**
 * Helper to validate job update data
 */
export function validateUpdateJob(data: unknown): UpdateJobInput {
  return updateJobInputSchema.parse(data);
}

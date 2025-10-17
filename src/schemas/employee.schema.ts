import { z } from 'zod';

/**
 * Phone number validation (E.164 format or common US formats)
 */
const phoneRegex = /^(\+?1)?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;

/**
 * Employee creation schema
 */
export const createEmployeeSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
  phone: z
    .string()
    .regex(phoneRegex, 'Invalid phone number format. Use (555) 123-4567 or 555-123-4567')
    .transform((val) => {
      // Normalize phone number to E.164 format
      const digits = val.replace(/\D/g, '');
      if (digits.length === 10) {
        return `+1${digits}`;
      } else if (digits.length === 11 && digits.startsWith('1')) {
        return `+${digits}`;
      }
      return val;
    }),
  role: z.enum(['admin', 'manager', 'worker', 'staff', 'crew'], {
    errorMap: () => ({ message: 'Invalid role selected' }),
  }),
});

export type CreateEmployeeFormData = z.infer<typeof createEmployeeSchema>;

/**
 * Employee update schema (all fields optional except those required for business logic)
 */
export const updateEmployeeSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .optional(),
  email: z
    .string()
    .email('Invalid email format')
    .toLowerCase()
    .trim()
    .optional(),
  phone: z
    .string()
    .regex(phoneRegex, 'Invalid phone number format')
    .transform((val) => {
      const digits = val.replace(/\D/g, '');
      if (digits.length === 10) {
        return `+1${digits}`;
      } else if (digits.length === 11 && digits.startsWith('1')) {
        return `+${digits}`;
      }
      return val;
    })
    .optional(),
  role: z.enum(['admin', 'manager', 'worker', 'staff', 'crew']).optional(),
  status: z.enum(['active', 'inactive', 'invited']).optional(),
});

export type UpdateEmployeeFormData = z.infer<typeof updateEmployeeSchema>;

/**
 * Bulk employee import schema (CSV upload)
 */
export const bulkEmployeeSchema = z.array(
  z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().regex(phoneRegex),
    role: z.enum(['admin', 'manager', 'worker', 'staff', 'crew']),
  })
);

export type BulkEmployeeData = z.infer<typeof bulkEmployeeSchema>;

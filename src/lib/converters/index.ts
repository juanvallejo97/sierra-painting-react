/**
 * Firestore Data Converters
 *
 * Centralized exports for all Firestore data converters with type-safe validation
 */

// Base converter utilities
export {
  createConverter,
  createSimpleConverter,
  dateToTimestamp,
  timestampToDate,
  convertTimestampsToDate,
  convertDatesToTimestamp,
  stripUndefined,
  isTimestamp,
  isDate,
  type BaseDocument,
  type ConverterOptions,
} from './base-converter';

// Job converter
export {
  jobConverter,
  jobSchema,
  createJobInputSchema,
  updateJobInputSchema,
  validateCreateJob,
  validateUpdateJob,
  JobStatus,
  type Job,
  type JobDocument,
  type CreateJobInput,
  type UpdateJobInput,
} from './job-converter';

// Invoice converter
export {
  invoiceConverter,
  invoiceSchema,
  paymentSchema,
  createInvoiceInputSchema,
  updateInvoiceInputSchema,
  recordPaymentInputSchema,
  validateCreateInvoice,
  validateUpdateInvoice,
  validateRecordPayment,
  calculateInvoiceAmounts,
  calculateRemainingBalance,
  InvoiceStatus,
  PaymentMethod,
  type Invoice,
  type InvoiceDocument,
  type Payment,
  type CreateInvoiceInput,
  type UpdateInvoiceInput,
  type RecordPaymentInput,
} from './invoice-converter';

// User converter
export {
  userConverter,
  userSchema,
  userProfileSchema,
  createUserInputSchema,
  updateUserInputSchema,
  validateCreateUser,
  validateUpdateUser,
  toUserProfile,
  hasPermission,
  isAdmin,
  isManager,
  UserRole,
  UserStatus,
  type User,
  type UserDocument,
  type UserProfile,
  type CreateUserInput,
  type UpdateUserInput,
} from './user-converter';

/**
 * Collection names constant
 */
export const COLLECTIONS = {
  USERS: 'users',
  JOBS: 'jobs',
  INVOICES: 'invoices',
  EMPLOYEES: 'employees',
  ESTIMATES: 'estimates',
  COMPANIES: 'companies',
  TIME_ENTRIES: 'timeEntries',
  AUDIT_LOGS: 'auditLogs',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

/**
 * User role types for RBAC (Role-Based Access Control)
 */
export type UserRole = 'admin' | 'manager' | 'worker' | 'crew' | 'staff';

/**
 * User entity from Firebase Auth + Firestore
 */
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  companyId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Authentication context state
 */
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

/**
 * Job status types
 */
export type JobStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Job entity
 */
export interface Job {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  address: string;
  status: JobStatus;
  active: boolean;
  estimatedStartDate?: Date;
  estimatedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  assignedWorkers?: string[]; // Employee UIDs
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // User UID
}

/**
 * Invoice status workflow
 */
export type InvoiceStatus = 'draft' | 'sent' | 'paid_cash' | 'overdue';

/**
 * Invoice entity
 */
export interface Invoice {
  id: string;
  companyId: string;
  number: string; // Format: INV-YYYYMM-####
  customerName: string;
  customerId?: string;
  jobId?: string;
  status: InvoiceStatus;
  subtotal: number;
  tax: number;
  amount: number; // subtotal + tax
  dueDate?: Date;
  paidAt?: Date;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Employee status
 */
export type EmployeeStatus = 'invited' | 'active' | 'inactive';

/**
 * Employee entity
 */
export interface Employee {
  id: string;
  companyId: string;
  uid?: string; // Firebase Auth UID (set after phone onboarding)
  email: string;
  displayName: string;
  phone?: string; // E.164 format
  role: UserRole;
  status: EmployeeStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Time entry entity
 */
export interface TimeEntry {
  id: string;
  companyId: string;
  userId: string;
  jobId: string;
  clockInAt: Date;
  clockOutAt?: Date;
  breakMinutes?: number;
  totalMinutes?: number;
  notes?: string;
  gpsLocation?: {
    latitude: number;
    longitude: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Activity log for admin dashboard
 */
export interface ActivityLog {
  id: string;
  companyId: string;
  type: 'time_entry' | 'invoice_paid' | 'job_completed' | 'estimate_created';
  text: string;
  userId?: string;
  relatedId?: string; // Job ID, Invoice ID, etc.
  timestamp: Date;
}

/**
 * KPI data for admin dashboard
 */
export interface AdminKPIData {
  revenue: number;
  activeJobs: number;
  pendingInvoices: number;
  activeWorkers: number;
}

/**
 * Navigation item
 */
export interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  badge?: number;
}

/**
 * Invoice Type Definitions
 * Centralized type definitions for invoices and payments
 */

export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

/**
 * Company information for PDFs and documents
 */
export interface CompanyInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string; // Base64 image data
}

export interface PaymentRecord {
  id: string;
  amount: number;
  paidDate: string;
  paymentMethod: 'cash' | 'check' | 'credit' | 'bank_transfer' | 'other';
  reference?: string;
  notes?: string;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  client: string;
  clientEmail?: string;
  amount: number;
  subtotal: number;
  tax: number;
  taxRate: number;
  status: InvoiceStatus;
  date: string;
  dueDate: string;
  sentDate?: string;
  paidDate?: string;
  amountPaid: number;
  remainingBalance: number;
  payments: PaymentRecord[];
  jobId?: string;
  notes?: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvoiceData {
  client: string;
  clientEmail?: string;
  subtotal: number;
  taxRate: number;
  dueDate: string;
  jobId?: string;
  notes?: string;
}

export interface UpdateInvoiceData extends Partial<CreateInvoiceData> {
  status?: InvoiceStatus;
  paidDate?: string;
}

export interface RecordPaymentData {
  amount: number;
  paidDate: string;
  paymentMethod: 'cash' | 'check' | 'credit' | 'bank_transfer' | 'other';
  reference?: string;
  notes?: string;
}

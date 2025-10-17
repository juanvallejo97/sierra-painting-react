import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth-context';

export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

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

/**
 * Generate invoice number in format: INV-YYYYMM-XXXX
 */
async function generateInvoiceNumber(companyId: string): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `INV-${yearMonth}-`;

  // Get all invoices for current month to find next number
  const invoicesRef = collection(db, 'invoices');
  const q = query(
    invoicesRef,
    where('companyId', '==', companyId),
    where('invoiceNumber', '>=', prefix),
    where('invoiceNumber', '<', `INV-${yearMonth}-9999`)
  );

  const snapshot = await getDocs(q);
  const nextNumber = snapshot.docs.length + 1;

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

/**
 * Fetch all invoices for the current company
 */
export function useInvoices(statusFilter?: InvoiceStatus) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['invoices', user?.companyId, statusFilter],
    queryFn: async () => {
      if (!user?.companyId) {
        throw new Error('User must belong to a company');
      }

      const invoicesRef = collection(db, 'invoices');
      let q = query(
        invoicesRef,
        where('companyId', '==', user.companyId),
        orderBy('date', 'desc')
      );

      if (statusFilter) {
        q = query(
          invoicesRef,
          where('companyId', '==', user.companyId),
          where('status', '==', statusFilter),
          orderBy('date', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      const now = new Date();

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        let status = data.status as InvoiceStatus;

        // Backward compatibility: Default values for new fields
        const payments = (data.payments || []).map((p: any) => ({
          ...p,
          createdAt: p.createdAt?.toDate() || new Date(),
        }));
        const amountPaid = data.amountPaid ?? 0;
        const remainingBalance = data.remainingBalance ?? data.amount;

        // Compute overdue status
        if ((status === 'sent' || status === 'partially_paid') && data.dueDate) {
          const dueDate = new Date(data.dueDate);
          if (dueDate < now) {
            status = 'overdue';
          }
        }

        return {
          id: doc.id,
          invoiceNumber: data.invoiceNumber,
          client: data.client,
          clientEmail: data.clientEmail,
          amount: data.amount,
          subtotal: data.subtotal,
          tax: data.tax,
          taxRate: data.taxRate,
          status,
          date: data.date,
          dueDate: data.dueDate,
          sentDate: data.sentDate,
          paidDate: data.paidDate,
          amountPaid,
          remainingBalance,
          payments,
          jobId: data.jobId,
          notes: data.notes,
          companyId: data.companyId,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Invoice;
      });
    },
    enabled: !!user?.companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch a single invoice by ID
 */
export function useInvoice(invoiceId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      if (!invoiceId) {
        throw new Error('Invoice ID is required');
      }

      const invoiceRef = doc(db, 'invoices', invoiceId);
      const snapshot = await getDoc(invoiceRef);

      if (!snapshot.exists()) {
        throw new Error('Invoice not found');
      }

      const data = snapshot.data();

      // Security: Verify invoice belongs to same company
      if (data.companyId !== user?.companyId) {
        throw new Error('Unauthorized access');
      }

      let status = data.status as InvoiceStatus;
      const now = new Date();

      // Backward compatibility: Default values for new fields
      const payments = (data.payments || []).map((p: any) => ({
        ...p,
        createdAt: p.createdAt?.toDate() || new Date(),
      }));
      const amountPaid = data.amountPaid ?? 0;
      const remainingBalance = data.remainingBalance ?? data.amount;

      // Compute overdue status
      if ((status === 'sent' || status === 'partially_paid') && data.dueDate) {
        const dueDate = new Date(data.dueDate);
        if (dueDate < now) {
          status = 'overdue';
        }
      }

      return {
        id: snapshot.id,
        invoiceNumber: data.invoiceNumber,
        client: data.client,
        clientEmail: data.clientEmail,
        amount: data.amount,
        subtotal: data.subtotal,
        tax: data.tax,
        taxRate: data.taxRate,
        status,
        date: data.date,
        dueDate: data.dueDate,
        sentDate: data.sentDate,
        paidDate: data.paidDate,
        amountPaid,
        remainingBalance,
        payments,
        jobId: data.jobId,
        notes: data.notes,
        companyId: data.companyId,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Invoice;
    },
    enabled: !!invoiceId && !!user?.companyId,
  });
}

/**
 * Create a new invoice
 */
export function useCreateInvoice() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateInvoiceData) => {
      if (!user?.companyId) {
        throw new Error('User must belong to a company');
      }

      const invoiceNumber = await generateInvoiceNumber(user.companyId);
      const tax = data.subtotal * (data.taxRate / 100);
      const amount = data.subtotal + tax;
      const today = new Date().toISOString().split('T')[0];

      const invoicesRef = collection(db, 'invoices');
      const docRef = await addDoc(invoicesRef, {
        invoiceNumber,
        client: data.client,
        clientEmail: data.clientEmail,
        subtotal: data.subtotal,
        tax,
        taxRate: data.taxRate,
        amount,
        status: 'draft' as InvoiceStatus,
        date: today,
        dueDate: data.dueDate,
        amountPaid: 0,
        remainingBalance: amount,
        payments: [],
        jobId: data.jobId,
        notes: data.notes,
        companyId: user.companyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', user?.companyId] });
    },
  });
}

/**
 * Update an existing invoice
 */
export function useUpdateInvoice() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateInvoiceData }) => {
      const invoiceRef = doc(db, 'invoices', id);

      // Verify invoice exists and belongs to same company
      const snapshot = await getDoc(invoiceRef);
      if (!snapshot.exists()) {
        throw new Error('Invoice not found');
      }

      const invoiceData = snapshot.data();
      if (invoiceData.companyId !== user?.companyId) {
        throw new Error('Unauthorized access');
      }

      const updateData: any = {
        updatedAt: serverTimestamp(),
      };

      if (data.client !== undefined) updateData.client = data.client;
      if (data.clientEmail !== undefined) updateData.clientEmail = data.clientEmail;
      if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
      if (data.jobId !== undefined) updateData.jobId = data.jobId;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.status !== undefined) {
        updateData.status = data.status;
        if (data.status === 'paid' && !invoiceData.paidDate) {
          updateData.paidDate = new Date().toISOString().split('T')[0];
        }
      }
      if (data.paidDate !== undefined) updateData.paidDate = data.paidDate;

      // Recalculate amounts if subtotal or taxRate changed
      if (data.subtotal !== undefined || data.taxRate !== undefined) {
        const subtotal = data.subtotal ?? invoiceData.subtotal;
        const taxRate = data.taxRate ?? invoiceData.taxRate;
        const tax = subtotal * (taxRate / 100);
        const amount = subtotal + tax;

        updateData.subtotal = subtotal;
        updateData.taxRate = taxRate;
        updateData.tax = tax;
        updateData.amount = amount;
      }

      await updateDoc(invoiceRef, updateData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', user?.companyId] });
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
    },
  });
}

/**
 * Delete an invoice
 */
export function useDeleteInvoice() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const invoiceRef = doc(db, 'invoices', invoiceId);

      // Verify invoice exists and belongs to same company
      const snapshot = await getDoc(invoiceRef);
      if (!snapshot.exists()) {
        throw new Error('Invoice not found');
      }

      const invoiceData = snapshot.data();
      if (invoiceData.companyId !== user?.companyId) {
        throw new Error('Unauthorized access');
      }

      // Only allow deleting draft invoices
      if (invoiceData.status !== 'draft') {
        throw new Error('Can only delete draft invoices');
      }

      await deleteDoc(invoiceRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', user?.companyId] });
    },
  });
}

/**
 * Send an invoice (draft → sent)
 */
export function useSendInvoice() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const invoiceRef = doc(db, 'invoices', invoiceId);

      // Verify invoice exists and belongs to same company
      const snapshot = await getDoc(invoiceRef);
      if (!snapshot.exists()) {
        throw new Error('Invoice not found');
      }

      const invoiceData = snapshot.data();
      if (invoiceData.companyId !== user?.companyId) {
        throw new Error('Unauthorized access');
      }

      // Can only send draft invoices
      if (invoiceData.status !== 'draft') {
        throw new Error('Can only send draft invoices');
      }

      await updateDoc(invoiceRef, {
        status: 'sent',
        sentDate: new Date().toISOString().split('T')[0],
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: (_, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', user?.companyId] });
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
    },
  });
}

/**
 * Record a payment (partial or full)
 */
export interface RecordPaymentData {
  amount: number;
  paidDate: string;
  paymentMethod: 'cash' | 'check' | 'credit' | 'bank_transfer' | 'other';
  reference?: string;
  notes?: string;
}

export function useRecordPayment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invoiceId, payment }: { invoiceId: string; payment: RecordPaymentData }) => {
      const invoiceRef = doc(db, 'invoices', invoiceId);

      // Verify invoice exists and belongs to same company
      const snapshot = await getDoc(invoiceRef);
      if (!snapshot.exists()) {
        throw new Error('Invoice not found');
      }

      const invoiceData = snapshot.data();
      if (invoiceData.companyId !== user?.companyId) {
        throw new Error('Unauthorized access');
      }

      // Calculate new amounts
      const currentAmountPaid = invoiceData.amountPaid || 0;
      const newAmountPaid = currentAmountPaid + payment.amount;
      const newRemainingBalance = invoiceData.amount - newAmountPaid;

      // Validate payment amount
      if (newRemainingBalance < -0.01) {
        throw new Error('Payment amount exceeds remaining balance');
      }

      // Create new payment record
      const newPayment: PaymentRecord = {
        id: `PAY-${Date.now()}`,
        amount: payment.amount,
        paidDate: payment.paidDate,
        paymentMethod: payment.paymentMethod,
        reference: payment.reference,
        notes: payment.notes,
        createdAt: new Date(),
      };

      // Determine new status
      let newStatus: InvoiceStatus;
      if (Math.abs(newRemainingBalance) < 0.01) {
        // Fully paid
        newStatus = 'paid';
      } else {
        // Partially paid
        newStatus = 'partially_paid';
      }

      // Update invoice
      const payments = invoiceData.payments || [];
      await updateDoc(invoiceRef, {
        amountPaid: newAmountPaid,
        remainingBalance: newRemainingBalance,
        payments: [...payments, newPayment],
        status: newStatus,
        paidDate: newStatus === 'paid' ? payment.paidDate : invoiceData.paidDate,
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', user?.companyId] });
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
    },
  });
}

/**
 * Cancel an invoice
 */
export function useCancelInvoice() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invoiceId, reason }: { invoiceId: string; reason?: string }) => {
      const invoiceRef = doc(db, 'invoices', invoiceId);

      // Verify invoice exists and belongs to same company
      const snapshot = await getDoc(invoiceRef);
      if (!snapshot.exists()) {
        throw new Error('Invoice not found');
      }

      const invoiceData = snapshot.data();
      if (invoiceData.companyId !== user?.companyId) {
        throw new Error('Unauthorized access');
      }

      // Cannot cancel paid invoices
      if (invoiceData.status === 'paid') {
        throw new Error('Cannot cancel a paid invoice');
      }

      const updateData: any = {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      };

      if (reason) {
        updateData.cancellationReason = reason;
        updateData.notes = invoiceData.notes
          ? `${invoiceData.notes}\n\nCancellation reason: ${reason}`
          : `Cancellation reason: ${reason}`;
      }

      await updateDoc(invoiceRef, updateData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', user?.companyId] });
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
    },
  });
}

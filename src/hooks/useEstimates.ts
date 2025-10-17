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

export type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';

export interface EstimateLineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  // Future: Add for government contracts
  category?: string; // e.g., "Materials", "Labor", "Equipment"
  specifications?: string; // Detailed specs
}

export interface Estimate {
  id: string;
  estimateNumber: string;
  client: string;
  clientEmail?: string;
  amount: number;
  subtotal: number;
  tax: number;
  taxRate: number;
  status: EstimateStatus;
  date: string;
  expiryDate?: string;
  sentDate?: string;
  approvedDate?: string;
  rejectedDate?: string;
  description?: string;
  lineItems?: EstimateLineItem[];
  notes?: string;
  jobId?: string;
  invoiceId?: string; // Set when converted to invoice
  companyId: string;
  createdAt: Date;
  updatedAt: Date;

  // AI & Government Contract Support (Phase 6+)
  templateType?: 'standard' | 'government'; // Estimate template type
  aiGenerated?: boolean; // Whether AI assisted in creation
  aiAnalysisData?: {
    documentUrl?: string; // Uploaded contract document
    extractedData?: any; // AI-extracted requirements
    suggestions?: string[]; // AI suggestions
    confidence?: number; // AI confidence score (0-1)
  };
  projectTimeline?: {
    startDate?: string;
    endDate?: string;
    milestones?: Array<{
      name: string;
      date: string;
      amount?: number;
    }>;
  };
  compliance?: {
    certifications?: string[]; // Required certifications
    prevailingWage?: boolean; // Government prevailing wage rates
    bonded?: boolean;
    insured?: boolean;
  };
}

export interface CreateEstimateData {
  client: string;
  clientEmail?: string;
  taxRate: number;
  expiryDate?: string;
  description?: string;
  lineItems?: EstimateLineItem[];
  notes?: string;
  jobId?: string;
}

export interface UpdateEstimateData extends Partial<CreateEstimateData> {
  status?: EstimateStatus;
}

/**
 * Generate estimate number in format: EST-YYYYMM-XXXX
 */
async function generateEstimateNumber(companyId: string): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `EST-${yearMonth}-`;

  const estimatesRef = collection(db, 'estimates');
  const q = query(
    estimatesRef,
    where('companyId', '==', companyId),
    where('estimateNumber', '>=', prefix),
    where('estimateNumber', '<', `EST-${yearMonth}-9999`)
  );

  const snapshot = await getDocs(q);
  const nextNumber = snapshot.docs.length + 1;

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

/**
 * Fetch all estimates for the current company
 */
export function useEstimates(statusFilter?: EstimateStatus) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['estimates', user?.companyId, statusFilter],
    queryFn: async () => {
      if (!user?.companyId) {
        throw new Error('User must belong to a company');
      }

      const estimatesRef = collection(db, 'estimates');
      let q = query(
        estimatesRef,
        where('companyId', '==', user.companyId),
        orderBy('date', 'desc')
      );

      if (statusFilter) {
        q = query(
          estimatesRef,
          where('companyId', '==', user.companyId),
          where('status', '==', statusFilter),
          orderBy('date', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      const now = new Date();

      return snapshot.docs.map((doc) => {
        const data = doc.data();
        let status = data.status as EstimateStatus;

        // Compute expired status
        if (status === 'sent' && data.expiryDate) {
          const expiryDate = new Date(data.expiryDate);
          if (expiryDate < now) {
            status = 'expired';
          }
        }

        return {
          id: doc.id,
          estimateNumber: data.estimateNumber,
          client: data.client,
          clientEmail: data.clientEmail,
          amount: data.amount,
          subtotal: data.subtotal || data.amount || 0,
          tax: data.tax || 0,
          taxRate: data.taxRate || 0,
          status,
          date: data.date,
          expiryDate: data.expiryDate,
          sentDate: data.sentDate,
          approvedDate: data.approvedDate,
          rejectedDate: data.rejectedDate,
          description: data.description,
          lineItems: data.lineItems || [],
          notes: data.notes,
          jobId: data.jobId,
          invoiceId: data.invoiceId,
          companyId: data.companyId,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          // AI & Government Contract fields (optional)
          templateType: data.templateType,
          aiGenerated: data.aiGenerated,
          aiAnalysisData: data.aiAnalysisData,
          projectTimeline: data.projectTimeline,
          compliance: data.compliance,
        } as Estimate;
      });
    },
    enabled: !!user?.companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch a single estimate by ID
 */
export function useEstimate(estimateId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['estimate', estimateId],
    queryFn: async () => {
      if (!estimateId) {
        throw new Error('Estimate ID is required');
      }

      const estimateRef = doc(db, 'estimates', estimateId);
      const snapshot = await getDoc(estimateRef);

      if (!snapshot.exists()) {
        throw new Error('Estimate not found');
      }

      const data = snapshot.data();

      // Security: Verify estimate belongs to same company
      if (data.companyId !== user?.companyId) {
        throw new Error('Unauthorized access');
      }

      let status = data.status as EstimateStatus;
      const now = new Date();

      if (status === 'sent' && data.expiryDate) {
        const expiryDate = new Date(data.expiryDate);
        if (expiryDate < now) {
          status = 'expired';
        }
      }

      return {
        id: snapshot.id,
        estimateNumber: data.estimateNumber,
        client: data.client,
        clientEmail: data.clientEmail,
        amount: data.amount,
        subtotal: data.subtotal || data.amount || 0,
        tax: data.tax || 0,
        taxRate: data.taxRate || 0,
        status,
        date: data.date,
        expiryDate: data.expiryDate,
        sentDate: data.sentDate,
        approvedDate: data.approvedDate,
        rejectedDate: data.rejectedDate,
        description: data.description,
        lineItems: data.lineItems || [],
        notes: data.notes,
        jobId: data.jobId,
        invoiceId: data.invoiceId,
        companyId: data.companyId,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        // AI & Government Contract fields (optional)
        templateType: data.templateType,
        aiGenerated: data.aiGenerated,
        aiAnalysisData: data.aiAnalysisData,
        projectTimeline: data.projectTimeline,
        compliance: data.compliance,
      } as Estimate;
    },
    enabled: !!estimateId && !!user?.companyId,
  });
}

/**
 * Create a new estimate
 */
export function useCreateEstimate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEstimateData) => {
      if (!user?.companyId) {
        throw new Error('User must belong to a company');
      }

      const estimateNumber = await generateEstimateNumber(user.companyId);
      const today = new Date().toISOString().split('T')[0];

      // Calculate totals
      const lineItems = data.lineItems || [];
      const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const tax = subtotal * (data.taxRate / 100);
      const amount = subtotal + tax;

      const estimateData: any = {
        estimateNumber,
        client: data.client,
        subtotal,
        tax,
        taxRate: data.taxRate,
        amount,
        status: 'draft' as EstimateStatus,
        date: today,
        lineItems,
        companyId: user.companyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Add optional fields
      if (data.clientEmail) estimateData.clientEmail = data.clientEmail;
      if (data.expiryDate) estimateData.expiryDate = data.expiryDate;
      if (data.description) estimateData.description = data.description;
      if (data.notes) estimateData.notes = data.notes;
      if (data.jobId) estimateData.jobId = data.jobId;

      const estimatesRef = collection(db, 'estimates');
      const docRef = await addDoc(estimatesRef, estimateData);

      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates', user?.companyId] });
    },
  });
}

/**
 * Update an existing estimate
 */
export function useUpdateEstimate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEstimateData }) => {
      const estimateRef = doc(db, 'estimates', id);

      // Verify estimate exists and belongs to same company
      const snapshot = await getDoc(estimateRef);
      if (!snapshot.exists()) {
        throw new Error('Estimate not found');
      }

      const estimateData = snapshot.data();
      if (estimateData.companyId !== user?.companyId) {
        throw new Error('Unauthorized access');
      }

      const updateData: any = {
        updatedAt: serverTimestamp(),
      };

      if (data.client !== undefined) updateData.client = data.client;
      if (data.clientEmail !== undefined) updateData.clientEmail = data.clientEmail;
      if (data.expiryDate !== undefined) updateData.expiryDate = data.expiryDate;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.jobId !== undefined) updateData.jobId = data.jobId;

      // Handle status changes with date tracking
      if (data.status !== undefined) {
        updateData.status = data.status;
        const today = new Date().toISOString().split('T')[0];

        if (data.status === 'sent' && !estimateData.sentDate) {
          updateData.sentDate = today;
        }
        if (data.status === 'approved' && !estimateData.approvedDate) {
          updateData.approvedDate = today;
        }
        if (data.status === 'rejected' && !estimateData.rejectedDate) {
          updateData.rejectedDate = today;
        }
      }

      // Recalculate totals if line items or tax rate changed
      if (data.lineItems !== undefined || data.taxRate !== undefined) {
        const lineItems = data.lineItems ?? estimateData.lineItems ?? [];
        const taxRate = data.taxRate ?? estimateData.taxRate ?? 0;
        const subtotal = lineItems.reduce((sum: number, item: EstimateLineItem) => sum + item.amount, 0);
        const tax = subtotal * (taxRate / 100);
        const amount = subtotal + tax;

        updateData.lineItems = lineItems;
        updateData.taxRate = taxRate;
        updateData.subtotal = subtotal;
        updateData.tax = tax;
        updateData.amount = amount;
      }

      await updateDoc(estimateRef, updateData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimates', user?.companyId] });
      queryClient.invalidateQueries({ queryKey: ['estimate', variables.id] });
    },
  });
}

/**
 * Delete an estimate
 */
export function useDeleteEstimate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (estimateId: string) => {
      const estimateRef = doc(db, 'estimates', estimateId);

      // Verify estimate exists and belongs to same company
      const snapshot = await getDoc(estimateRef);
      if (!snapshot.exists()) {
        throw new Error('Estimate not found');
      }

      const estimateData = snapshot.data();
      if (estimateData.companyId !== user?.companyId) {
        throw new Error('Unauthorized access');
      }

      await deleteDoc(estimateRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimates', user?.companyId] });
    },
  });
}

/**
 * Send an estimate (draft → sent)
 */
export function useSendEstimate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (estimateId: string) => {
      const estimateRef = doc(db, 'estimates', estimateId);

      // Verify estimate exists and belongs to same company
      const snapshot = await getDoc(estimateRef);
      if (!snapshot.exists()) {
        throw new Error('Estimate not found');
      }

      const estimateData = snapshot.data();
      if (estimateData.companyId !== user?.companyId) {
        throw new Error('Unauthorized access');
      }

      // Can only send draft estimates
      if (estimateData.status !== 'draft') {
        throw new Error('Can only send draft estimates');
      }

      await updateDoc(estimateRef, {
        status: 'sent',
        sentDate: new Date().toISOString().split('T')[0],
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: (_, estimateId) => {
      queryClient.invalidateQueries({ queryKey: ['estimates', user?.companyId] });
      queryClient.invalidateQueries({ queryKey: ['estimate', estimateId] });
    },
  });
}

/**
 * Convert an estimate to an invoice
 */
export function useConvertEstimateToInvoice() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (estimateId: string) => {
      const estimateRef = doc(db, 'estimates', estimateId);

      // Verify estimate exists and belongs to same company
      const snapshot = await getDoc(estimateRef);
      if (!snapshot.exists()) {
        throw new Error('Estimate not found');
      }

      const estimateData = snapshot.data();
      if (estimateData.companyId !== user?.companyId) {
        throw new Error('Unauthorized access');
      }

      // Can only convert approved estimates
      if (estimateData.status !== 'approved') {
        throw new Error('Can only convert approved estimates to invoices');
      }

      // Check if already converted
      if (estimateData.invoiceId) {
        throw new Error('Estimate has already been converted to an invoice');
      }

      // Create invoice from estimate
      const invoicesRef = collection(db, 'invoices');

      // Generate invoice number
      const now = new Date();
      const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const prefix = `INV-${yearMonth}-`;

      const invoiceQuery = query(
        invoicesRef,
        where('companyId', '==', user!.companyId),
        where('invoiceNumber', '>=', prefix),
        where('invoiceNumber', '<', `INV-${yearMonth}-9999`)
      );
      const invoiceSnapshot = await getDocs(invoiceQuery);
      const nextNumber = invoiceSnapshot.docs.length + 1;
      const invoiceNumber = `${prefix}${String(nextNumber).padStart(4, '0')}`;

      const today = new Date().toISOString().split('T')[0];

      // Calculate due date (30 days from now by default)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      const invoiceData: any = {
        invoiceNumber,
        client: estimateData.client,
        subtotal: estimateData.subtotal,
        tax: estimateData.tax,
        taxRate: estimateData.taxRate,
        amount: estimateData.amount,
        status: 'draft',
        date: today,
        dueDate: dueDateStr,
        amountPaid: 0,
        remainingBalance: estimateData.amount,
        payments: [],
        companyId: user!.companyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Add optional fields
      if (estimateData.clientEmail) invoiceData.clientEmail = estimateData.clientEmail;
      if (estimateData.jobId) invoiceData.jobId = estimateData.jobId;
      if (estimateData.description) {
        invoiceData.notes = `Converted from Estimate ${estimateData.estimateNumber}\n\n${estimateData.description}`;
      } else {
        invoiceData.notes = `Converted from Estimate ${estimateData.estimateNumber}`;
      }

      const invoiceDocRef = await addDoc(invoicesRef, invoiceData);

      // Update estimate with invoice reference
      await updateDoc(estimateRef, {
        invoiceId: invoiceDocRef.id,
        updatedAt: serverTimestamp(),
      });

      return { invoiceId: invoiceDocRef.id, estimateId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['estimates', user?.companyId] });
      queryClient.invalidateQueries({ queryKey: ['estimate', data.estimateId] });
      queryClient.invalidateQueries({ queryKey: ['invoices', user?.companyId] });
    },
  });
}

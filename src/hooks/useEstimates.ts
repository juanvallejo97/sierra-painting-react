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

export interface Estimate {
  id: string;
  estimateNumber: string;
  client: string;
  clientEmail?: string;
  amount: number;
  status: EstimateStatus;
  date: string;
  expiryDate?: string;
  description?: string;
  lineItems?: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  notes?: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEstimateData {
  client: string;
  clientEmail?: string;
  amount: number;
  expiryDate?: string;
  description?: string;
  lineItems?: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  notes?: string;
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
          status,
          date: data.date,
          expiryDate: data.expiryDate,
          description: data.description,
          lineItems: data.lineItems || [],
          notes: data.notes,
          companyId: data.companyId,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
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
        status,
        date: data.date,
        expiryDate: data.expiryDate,
        description: data.description,
        lineItems: data.lineItems || [],
        notes: data.notes,
        companyId: data.companyId,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
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

      const estimatesRef = collection(db, 'estimates');
      const docRef = await addDoc(estimatesRef, {
        estimateNumber,
        client: data.client,
        clientEmail: data.clientEmail,
        amount: data.amount,
        status: 'draft' as EstimateStatus,
        date: today,
        expiryDate: data.expiryDate,
        description: data.description,
        lineItems: data.lineItems || [],
        notes: data.notes,
        companyId: user.companyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

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
      if (data.amount !== undefined) updateData.amount = data.amount;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.expiryDate !== undefined) updateData.expiryDate = data.expiryDate;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.lineItems !== undefined) updateData.lineItems = data.lineItems;
      if (data.notes !== undefined) updateData.notes = data.notes;

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

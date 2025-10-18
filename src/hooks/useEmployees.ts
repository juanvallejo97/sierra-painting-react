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
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import { useAuth } from '../lib/auth-context';
import type { UserRole } from '../types';

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'invited';
  companyId: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmployeeData {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
}

export interface UpdateEmployeeData extends Partial<CreateEmployeeData> {
  status?: 'active' | 'inactive' | 'invited';
}

/**
 * Fetch all employees for the current company
 */
export function useEmployees() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['employees', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) {
        throw new Error('User must belong to a company');
      }

      const employeesRef = collection(db, 'users');
      const q = query(
        employeesRef,
        where('companyId', '==', user.companyId),
        orderBy('createdAt', 'desc'),
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.displayName || data.email.split('@')[0],
          email: data.email,
          phone: data.phone || '',
          role: data.role,
          status: data.status || 'active',
          companyId: data.companyId,
          photoURL: data.photoURL,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Employee;
      });
    },
    enabled: !!user?.companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a single employee by ID
 */
export function useEmployee(employeeId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      if (!employeeId) {
        throw new Error('Employee ID is required');
      }

      const employeeRef = doc(db, 'users', employeeId);
      const snapshot = await getDoc(employeeRef);

      if (!snapshot.exists()) {
        throw new Error('Employee not found');
      }

      const data = snapshot.data();

      // Security: Verify employee belongs to same company
      if (data.companyId !== user?.companyId) {
        throw new Error('Unauthorized access');
      }

      return {
        id: snapshot.id,
        name: data.displayName || data.email.split('@')[0],
        email: data.email,
        phone: data.phone || '',
        role: data.role,
        status: data.status || 'active',
        companyId: data.companyId,
        photoURL: data.photoURL,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Employee;
    },
    enabled: !!employeeId && !!user?.companyId,
  });
}

/**
 * Create a new employee
 */
export function useCreateEmployee() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEmployeeData) => {
      if (!user?.companyId) {
        throw new Error('User must belong to a company');
      }

      const employeesRef = collection(db, 'users');
      const docRef = await addDoc(employeesRef, {
        displayName: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        status: 'invited',
        companyId: user.companyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return docRef.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', user?.companyId] });
    },
  });
}

/**
 * Update an existing employee
 */
export function useUpdateEmployee() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEmployeeData }) => {
      const employeeRef = doc(db, 'users', id);

      // Verify employee exists and belongs to same company
      const snapshot = await getDoc(employeeRef);
      if (!snapshot.exists()) {
        throw new Error('Employee not found');
      }

      const employeeData = snapshot.data();
      if (employeeData.companyId !== user?.companyId) {
        throw new Error('Unauthorized access');
      }

      const updateData: any = {
        updatedAt: serverTimestamp(),
      };

      if (data.name !== undefined) updateData.displayName = data.name;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.role !== undefined) updateData.role = data.role;
      if (data.status !== undefined) updateData.status = data.status;

      await updateDoc(employeeRef, updateData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees', user?.companyId] });
      queryClient.invalidateQueries({ queryKey: ['employee', variables.id] });
    },
  });
}

/**
 * Delete an employee
 */
export function useDeleteEmployee() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const employeeRef = doc(db, 'users', employeeId);

      // Verify employee exists and belongs to same company
      const snapshot = await getDoc(employeeRef);
      if (!snapshot.exists()) {
        throw new Error('Employee not found');
      }

      const employeeData = snapshot.data();
      if (employeeData.companyId !== user?.companyId) {
        throw new Error('Unauthorized access');
      }

      // In production, you might want to soft delete by setting status='inactive'
      // For now, we'll do a hard delete
      await deleteDoc(employeeRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', user?.companyId] });
    },
  });
}

/**
 * Send employee invitation email
 */
export interface InviteEmployeeData {
  employeeEmail: string;
  employeeName: string;
  role: UserRole;
}

export function useInviteEmployee() {
  return useMutation({
    mutationFn: async (data: InviteEmployeeData) => {
      const sendEmployeeInvitationFn = httpsCallable<
        { employeeEmail: string; employeeName: string; role: string },
        { success: boolean; message: string }
      >(functions, 'sendEmployeeInvitation');

      const result = await sendEmployeeInvitationFn({
        employeeEmail: data.employeeEmail,
        employeeName: data.employeeName,
        role: data.role,
      });

      return result.data;
    },
  });
}

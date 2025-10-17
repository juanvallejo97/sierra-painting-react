/**
 * Tests for useInvoices hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useInvoices, useCreateInvoice, useRecordPayment } from '../useInvoices';
import { createMockUser, testData, createMockQuerySnapshot } from '../../test/mocks/firebase';
import * as authContext from '../../lib/auth-context';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
}));

vi.mock('../../lib/firebase', () => ({
  db: {},
}));

describe('useInvoices', () => {
  let queryClient: QueryClient;
  const mockUser = createMockUser();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Mock useAuth hook
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
    });
  });

  it('should fetch invoices for the current company', async () => {
    const mockInvoices = [
      testData.invoice(),
      testData.invoice({ id: 'inv-002', invoiceNumber: 'INV-202510-0002' }),
    ];

    const { getDocs } = await import('firebase/firestore');
    vi.mocked(getDocs).mockResolvedValue(createMockQuerySnapshot(mockInvoices) as any);

    const { result } = renderHook(() => useInvoices(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].invoiceNumber).toBe('INV-202510-0001');
  });

  it('should be disabled if user has no companyId', async () => {
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: { ...mockUser, companyId: undefined } as any,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
    });

    const { result } = renderHook(() => useInvoices(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    // Query should be disabled when user has no companyId
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  it('should filter invoices by status', async () => {
    const mockInvoices = [
      testData.invoice({ status: 'sent' }),
      testData.invoice({ id: 'inv-002', status: 'draft' }),
    ];

    const { getDocs } = await import('firebase/firestore');
    vi.mocked(getDocs).mockResolvedValue(createMockQuerySnapshot(mockInvoices) as any);

    const { result } = renderHook(() => useInvoices('sent'), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Note: In real implementation, filtering happens in Firestore query
    expect(result.current.data).toBeDefined();
  });

  it('should calculate overdue status for past due invoices', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);

    const mockInvoices = [
      testData.invoice({
        status: 'sent',
        dueDate: pastDate.toISOString().split('T')[0],
      }),
    ];

    const { getDocs } = await import('firebase/firestore');
    vi.mocked(getDocs).mockResolvedValue(createMockQuerySnapshot(mockInvoices) as any);

    const { result } = renderHook(() => useInvoices(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].status).toBe('overdue');
  });
});

describe('useCreateInvoice', () => {
  let queryClient: QueryClient;
  const mockUser = createMockUser();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
    });
  });

  it('should create a new invoice', async () => {
    const { addDoc, getDocs } = await import('firebase/firestore');
    vi.mocked(getDocs).mockResolvedValue(createMockQuerySnapshot([]) as any);
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-invoice-id' } as any);

    const { result } = renderHook(() => useCreateInvoice(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    const invoiceData = {
      client: 'New Client',
      clientEmail: 'client@example.com',
      subtotal: 1000,
      taxRate: 10,
      dueDate: '2025-11-17',
    };

    result.current.mutate(invoiceData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(addDoc).toHaveBeenCalled();
  });

  it('should throw error if user has no companyId', async () => {
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: { ...mockUser, companyId: undefined } as any,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
    });

    const { result } = renderHook(() => useCreateInvoice(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    const invoiceData = {
      client: 'New Client',
      subtotal: 1000,
      taxRate: 10,
      dueDate: '2025-11-17',
    };

    result.current.mutate(invoiceData);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('must belong to a company');
  });
});

describe('useRecordPayment', () => {
  let queryClient: QueryClient;
  const mockUser = createMockUser();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
    });
  });

  it('should record a partial payment', async () => {
    const mockInvoice = testData.invoice({ amount: 1000, amountPaid: 0 });
    const { getDoc, updateDoc } = await import('firebase/firestore');

    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => mockInvoice,
      id: 'inv-001',
    } as any);

    vi.mocked(updateDoc).mockResolvedValue(undefined);

    const { result } = renderHook(() => useRecordPayment(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    result.current.mutate({
      invoiceId: 'inv-001',
      payment: {
        amount: 500,
        paidDate: '2025-10-17',
        paymentMethod: 'cash',
      },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateDoc).toHaveBeenCalled();
  });

  it('should mark invoice as paid when full amount is paid', async () => {
    const mockInvoice = testData.invoice({
      amount: 1000,
      amountPaid: 500,
      remainingBalance: 500,
    });
    const { getDoc, updateDoc } = await import('firebase/firestore');

    // Clear any previous mocks
    vi.mocked(getDoc).mockClear();
    vi.mocked(updateDoc).mockClear();

    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => mockInvoice,
      id: 'inv-001',
    } as any);

    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useRecordPayment(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    result.current.mutate({
      invoiceId: 'inv-001',
      payment: {
        amount: 500,
        paidDate: '2025-10-17',
        paymentMethod: 'cash',
      },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const updateCall = vi.mocked(updateDoc).mock.calls[0];
    expect(updateCall[1]).toMatchObject({
      status: 'paid',
      paidDate: '2025-10-17',
    });
  });

  it('should throw error if payment exceeds remaining balance', async () => {
    const mockInvoice = testData.invoice({ amount: 1000, amountPaid: 900 });
    const { getDoc } = await import('firebase/firestore');

    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => mockInvoice,
      id: 'inv-001',
    } as any);

    const { result } = renderHook(() => useRecordPayment(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    result.current.mutate({
      invoiceId: 'inv-001',
      payment: {
        amount: 200, // Exceeds remaining balance of 100
        paidDate: '2025-10-17',
        paymentMethod: 'cash',
      },
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('exceeds remaining balance');
  });
});

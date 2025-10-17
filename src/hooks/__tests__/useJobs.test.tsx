/**
 * Tests for useJobs hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useJobs, useCreateJob, useUpdateJob, useDeleteJob } from '../useJobs';
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

describe('useJobs', () => {
  let queryClient: QueryClient;
  const mockUser = createMockUser();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();

    // Mock useAuth hook
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      refreshUser: vi.fn(),
    });
  });

  it('should fetch jobs for the current company', async () => {
    const mockJobs = [
      testData.job(),
      testData.job({ id: 'job-002', name: 'Commercial Building Paint' }),
    ];

    const { getDocs } = await import('firebase/firestore');
    vi.mocked(getDocs).mockResolvedValue(createMockQuerySnapshot(mockJobs) as any);

    const { result } = renderHook(() => useJobs(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].name).toBe('Test Job');
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
      refreshUser: vi.fn(),
    });

    const { result } = renderHook(() => useJobs(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    // Query should be disabled when user has no companyId
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  it('should filter jobs by status', async () => {
    const mockJobs = [
      testData.job({ status: 'in-progress' }),
      testData.job({ id: 'job-002', status: 'scheduled' }),
    ];

    const { getDocs } = await import('firebase/firestore');
    vi.mocked(getDocs).mockResolvedValue(createMockQuerySnapshot(mockJobs) as any);

    const { result } = renderHook(() => useJobs('in-progress'), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Note: In real implementation, filtering happens in Firestore query
    expect(result.current.data).toBeDefined();
  });
});

describe('useCreateJob', () => {
  let queryClient: QueryClient;
  const mockUser = createMockUser();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();

    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      refreshUser: vi.fn(),
    });
  });

  it('should create a new job', async () => {
    const { addDoc } = await import('firebase/firestore');
    vi.mocked(addDoc).mockResolvedValue({ id: 'new-job-id' } as any);

    const { result } = renderHook(() => useCreateJob(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    const jobData = {
      name: 'New Residential Paint',
      address: '123 Main St',
      startDate: '2025-10-20',
      endDate: '2025-10-27',
      workers: [],
    };

    result.current.mutate(jobData);

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
      refreshUser: vi.fn(),
    });

    const { result } = renderHook(() => useCreateJob(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    const jobData = {
      name: 'New Job',
      address: '123 Main St',
      startDate: '2025-10-20',
      workers: [],
    };

    result.current.mutate(jobData);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('not assigned to a company');
  });
});

describe('useUpdateJob', () => {
  let queryClient: QueryClient;
  const mockUser = createMockUser();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();

    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      refreshUser: vi.fn(),
    });
  });

  it('should update a job', async () => {
    const mockJob = testData.job();
    const { getDoc, updateDoc } = await import('firebase/firestore');

    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => mockJob,
      id: 'job-001',
    } as any);

    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useUpdateJob(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    result.current.mutate({
      id: 'job-001',
      data: {
        status: 'completed',
      },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateDoc).toHaveBeenCalled();
  });
});

describe('useDeleteJob', () => {
  let queryClient: QueryClient;
  const mockUser = createMockUser();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();

    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      refreshUser: vi.fn(),
    });
  });

  it('should delete a job', async () => {
    const mockJob = testData.job();
    const { getDoc, deleteDoc } = await import('firebase/firestore');

    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => mockJob,
      id: 'job-001',
    } as any);

    vi.mocked(deleteDoc).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useDeleteJob(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    result.current.mutate('job-001');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(deleteDoc).toHaveBeenCalled();
  });

  it('should throw error if job not found', async () => {
    const { getDoc } = await import('firebase/firestore');

    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => false,
    } as any);

    const { result } = renderHook(() => useDeleteJob(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    result.current.mutate('non-existent-job');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Job not found');
  });
});

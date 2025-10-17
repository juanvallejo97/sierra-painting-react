/**
 * Testing Utilities
 *
 * Custom render functions and test helpers for React Testing Library
 */

import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../lib/auth-context';
import { User } from '../../types';

/**
 * Create a new QueryClient for testing
 * Disables retries and sets cache time to 0 for predictable tests
 */
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Silence errors in tests
    },
  });
};

interface AllProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
  initialUser?: User | null;
}

/**
 * Wrapper component with all necessary providers for testing
 */
export const AllProviders = ({
  children,
  queryClient = createTestQueryClient(),
  initialUser = null,
}: AllProvidersProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider initialUser={initialUser}>{children}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialUser?: User | null;
}

/**
 * Custom render function that includes all providers
 */
export const renderWithProviders = (ui: ReactElement, options?: CustomRenderOptions) => {
  const { queryClient, initialUser, ...renderOptions } = options || {};

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <AllProviders queryClient={queryClient} initialUser={initialUser}>
      {children}
    </AllProviders>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient: queryClient || createTestQueryClient(),
  };
};

/**
 * Wait for async operations to complete
 */
export const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Mock Firebase timestamp
 */
export const mockTimestamp = (date: Date = new Date()) => ({
  toDate: () => date,
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: 0,
});

/**
 * Create mock local storage
 */
export const createMockLocalStorage = () => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
};

/**
 * Setup localStorage mock for tests
 */
export const setupLocalStorageMock = () => {
  const mockStorage = createMockLocalStorage();
  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    writable: true,
  });
  return mockStorage;
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

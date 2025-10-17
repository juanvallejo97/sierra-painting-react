import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vitest configuration for Firebase Emulator tests
 *
 * This config is used specifically for tests that interact with Firebase Emulators.
 * It includes:
 * - Longer timeouts for network operations
 * - Sequential test execution to avoid emulator conflicts
 * - Separate coverage tracking
 * - Custom setup file for emulator initialization
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node', // Use node environment for emulator tests
    setupFiles: './src/test/emulator-setup.ts',

    // Include only emulator test files
    include: [
      'src/**/*.emulator.test.{ts,tsx}',
      'src/__tests__/**/*.test.{ts,tsx}',
    ],

    // Exclude regular unit tests
    exclude: [
      'node_modules/',
      'src/test/',
      'src/hooks/__tests__/**/*.test.{ts,tsx}',
      'src/components/__tests__/**/*.test.{ts,tsx}',
    ],

    // Run tests sequentially to avoid emulator conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Use single process for all tests
      },
    },

    // Longer timeouts for network operations
    testTimeout: 30000, // 30 seconds
    hookTimeout: 30000,

    // Coverage configuration
    coverage: {
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/emulator',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'node_modules/',
        'src/test/',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.emulator.test.{ts,tsx}',
      ],
      // Coverage thresholds
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },

    // Reporter configuration
    reporters: ['verbose'],

    // Retry failed tests once (for flaky network operations)
    retry: 1,
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@utils': resolve(__dirname, './src/utils'),
      '@types': resolve(__dirname, './src/types'),
      '@api': resolve(__dirname, './src/api'),
      '@store': resolve(__dirname, './src/store'),
    },
  },
});

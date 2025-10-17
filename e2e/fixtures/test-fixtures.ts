/* eslint-disable react-hooks/rules-of-hooks */
import { test as base } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { JobsPage } from '../page-objects/JobsPage';
import { InvoicesPage } from '../page-objects/InvoicesPage';
import { NavigationBar } from '../page-objects/NavigationBar';

/**
 * Extended test fixtures with page objects
 *
 * Usage:
 * import { test, expect } from '../fixtures/test-fixtures';
 *
 * test('my test', async ({ loginPage, jobsPage }) => {
 *   await loginPage.goto();
 *   // ...
 * });
 */

type PageFixtures = {
  loginPage: LoginPage;
  jobsPage: JobsPage;
  invoicesPage: InvoicesPage;
  navigationBar: NavigationBar;
};

export const test = base.extend<PageFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  jobsPage: async ({ page }, use) => {
    await use(new JobsPage(page));
  },

  invoicesPage: async ({ page }, use) => {
    await use(new InvoicesPage(page));
  },

  navigationBar: async ({ page }, use) => {
    await use(new NavigationBar(page));
  },
});

export { expect } from '@playwright/test';

/**
 * Test user credentials for authentication tests
 * These should match the emulator test data
 */
export const testUsers = {
  admin: {
    email: 'admin@sierrapainting.com',
    password: 'admin123',
    role: 'admin',
  },
  manager: {
    email: 'manager@sierrapainting.com',
    password: 'manager123',
    role: 'manager',
  },
  employee: {
    email: 'employee@sierrapainting.com',
    password: 'employee123',
    role: 'employee',
  },
};

/**
 * Test data generators
 */
export const testData = {
  job: () => ({
    name: `Test Job ${Date.now()}`,
    status: 'pending',
    description: 'E2E test job',
  }),

  invoice: () => ({
    customerName: `Test Customer ${Date.now()}`,
    amount: Math.floor(Math.random() * 10000) + 1000,
    description: 'E2E test invoice',
  }),
};

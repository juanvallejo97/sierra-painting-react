import { Page } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { testUsers } from '../fixtures/test-fixtures';

/**
 * Authentication helper utilities
 */

/**
 * Login as admin user
 */
export async function loginAsAdmin(page: Page) {
  const loginPage = new LoginPage(page);
  await loginPage.loginWithCredentials(testUsers.admin.email, testUsers.admin.password);
}

/**
 * Login as manager user
 */
export async function loginAsManager(page: Page) {
  const loginPage = new LoginPage(page);
  await loginPage.loginWithCredentials(testUsers.manager.email, testUsers.manager.password);
}

/**
 * Login as employee user
 */
export async function loginAsEmployee(page: Page) {
  const loginPage = new LoginPage(page);
  await loginPage.loginWithCredentials(testUsers.employee.email, testUsers.employee.password);
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  // Check if we're not on the login page
  const url = page.url();
  return !url.includes('/login');
}

/**
 * Wait for authentication to complete
 */
export async function waitForAuth(page: Page, timeout = 10000) {
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout,
  });
}

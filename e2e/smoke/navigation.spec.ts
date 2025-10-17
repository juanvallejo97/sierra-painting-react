import { test, expect } from '../fixtures/test-fixtures';
import { loginAsAdmin } from '../utils/auth-helpers';

/**
 * Smoke Tests: Navigation
 *
 * Critical flows:
 * - Navigate between main pages
 * - Verify page loads
 */

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsAdmin(page);
  });

  test('should navigate to Jobs page', async ({ page, navigationBar }) => {
    await navigationBar.goToJobs();

    // Verify URL
    expect(page.url()).toContain('/jobs');

    // Verify page loaded
    const heading = page.getByRole('heading', { name: /jobs/i });
    await expect(heading).toBeVisible();
  });

  test('should navigate to Invoices page', async ({ page, navigationBar }) => {
    await navigationBar.goToInvoices();

    // Verify URL
    expect(page.url()).toContain('/invoices');

    // Verify page loaded
    const heading = page.getByRole('heading', { name: /invoices/i });
    await expect(heading).toBeVisible();
  });

  test('should navigate to Employees page', async ({ page, navigationBar }) => {
    await navigationBar.goToEmployees();

    // Verify URL
    expect(page.url()).toContain('/employees');

    // Verify page loaded
    const heading = page.getByRole('heading', { name: /employees/i });
    await expect(heading).toBeVisible();
  });

  test('should navigate to Settings page', async ({ page, navigationBar }) => {
    await navigationBar.goToSettings();

    // Verify URL
    expect(page.url()).toContain('/settings');

    // Verify page loaded
    const heading = page.getByRole('heading', { name: /settings/i });
    await expect(heading).toBeVisible();
  });

  test('should navigate between multiple pages', async ({ page, navigationBar }) => {
    // Jobs → Invoices → Employees → Settings
    await navigationBar.goToJobs();
    expect(page.url()).toContain('/jobs');

    await navigationBar.goToInvoices();
    expect(page.url()).toContain('/invoices');

    await navigationBar.goToEmployees();
    expect(page.url()).toContain('/employees');

    await navigationBar.goToSettings();
    expect(page.url()).toContain('/settings');
  });
});

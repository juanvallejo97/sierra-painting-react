import { test, expect, testData } from '../fixtures/test-fixtures';
import { loginAsAdmin } from '../utils/auth-helpers';

/**
 * Smoke Tests: Invoices
 *
 * Critical flows:
 * - View invoices list
 * - Create new invoice
 * - Search invoices
 */

test.describe('Invoices Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);
  });

  test('should display invoices list', async ({ invoicesPage }) => {
    await invoicesPage.goto();

    // Verify invoices table is visible
    await invoicesPage.expectInvoicesTableVisible();

    // Verify create button is visible
    await expect(invoicesPage.createInvoiceButton).toBeVisible();
  });

  test('should open create invoice dialog', async ({ page, invoicesPage }) => {
    await invoicesPage.goto();

    // Click create button
    await invoicesPage.clickCreateInvoice();

    // Verify dialog opened
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Verify form fields are present
    await expect(invoicesPage.customerNameInput).toBeVisible();
    await expect(invoicesPage.amountInput).toBeVisible();
    await expect(invoicesPage.saveInvoiceButton).toBeVisible();
  });

  test('should create a new invoice', async ({ invoicesPage }) => {
    await invoicesPage.goto();

    const invoice = testData.invoice();

    // Create invoice
    await invoicesPage.createInvoice(invoice);

    // Verify invoice appears in list
    await invoicesPage.expectInvoiceInList(invoice.customerName);
  });

  test('should search invoices', async ({ invoicesPage }) => {
    await invoicesPage.goto();

    // Create an invoice first
    const invoice = testData.invoice();
    await invoicesPage.createInvoice(invoice);

    // Search for the invoice
    await invoicesPage.searchInvoices(invoice.customerName);

    // Verify invoice appears in filtered results
    await invoicesPage.expectInvoiceInList(invoice.customerName);
  });
});

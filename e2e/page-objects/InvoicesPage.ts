import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Invoices Screen
 *
 * Handles invoice listing and creation
 */
export class InvoicesPage {
  readonly page: Page;
  readonly createInvoiceButton: Locator;
  readonly customerNameInput: Locator;
  readonly amountInput: Locator;
  readonly saveInvoiceButton: Locator;
  readonly invoicesTable: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createInvoiceButton = page.getByRole('button', { name: /create invoice|new invoice/i });
    this.customerNameInput = page.getByLabel(/customer|client/i);
    this.amountInput = page.getByLabel(/amount|total/i);
    this.saveInvoiceButton = page.getByRole('button', { name: /save|create/i });
    this.invoicesTable = page.getByRole('table');
    this.searchInput = page.getByPlaceholder(/search/i);
  }

  async goto() {
    await this.page.goto('/invoices');
  }

  async clickCreateInvoice() {
    await this.createInvoiceButton.click();
  }

  async fillInvoiceForm(data: {
    customerName: string;
    amount: number;
    description?: string;
  }) {
    await this.customerNameInput.fill(data.customerName);
    await this.amountInput.fill(data.amount.toString());

    if (data.description) {
      const descInput = this.page.getByLabel(/description|notes/i);
      await descInput.fill(data.description);
    }
  }

  async saveInvoice() {
    await this.saveInvoiceButton.click();

    // Wait for dialog to close
    await this.page.waitForTimeout(500);
  }

  async createInvoice(data: {
    customerName: string;
    amount: number;
    description?: string;
  }) {
    await this.clickCreateInvoice();
    await this.fillInvoiceForm(data);
    await this.saveInvoice();
  }

  async searchInvoices(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Debounce
  }

  async expectInvoiceInList(customerName: string) {
    await this.page.getByRole('cell', { name: customerName }).waitFor({ state: 'visible' });
  }

  async expectInvoicesTableVisible() {
    await this.invoicesTable.waitFor({ state: 'visible' });
  }
}

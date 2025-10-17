import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Navigation Bar
 *
 * Handles app-wide navigation
 */
export class NavigationBar {
  readonly page: Page;
  readonly jobsLink: Locator;
  readonly invoicesLink: Locator;
  readonly employeesLink: Locator;
  readonly settingsLink: Locator;
  readonly userMenu: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.jobsLink = page.getByRole('link', { name: /jobs/i });
    this.invoicesLink = page.getByRole('link', { name: /invoices/i });
    this.employeesLink = page.getByRole('link', { name: /employees/i });
    this.settingsLink = page.getByRole('link', { name: /settings/i });
    this.userMenu = page.getByRole('button', { name: /user menu|account/i });
    this.logoutButton = page.getByRole('menuitem', { name: /logout|sign out/i });
  }

  async goToJobs() {
    await this.jobsLink.click();
    await this.page.waitForURL(/\/jobs/);
  }

  async goToInvoices() {
    await this.invoicesLink.click();
    await this.page.waitForURL(/\/invoices/);
  }

  async goToEmployees() {
    await this.employeesLink.click();
    await this.page.waitForURL(/\/employees/);
  }

  async goToSettings() {
    await this.settingsLink.click();
    await this.page.waitForURL(/\/settings/);
  }

  async logout() {
    await this.userMenu.click();
    await this.logoutButton.click();

    // Wait for redirect to login
    await this.page.waitForURL(/\/login/);
  }

  async expectNavigationVisible() {
    await this.jobsLink.waitFor({ state: 'visible' });
  }
}

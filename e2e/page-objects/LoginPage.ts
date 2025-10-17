import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Login Screen
 *
 * Handles authentication flows
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByPlaceholder(/email/i);
    this.passwordInput = page.getByPlaceholder(/password/i);
    this.loginButton = page.getByRole('button', { name: /sign in|login/i });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();

    // Wait for navigation
    await this.page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 10000,
    });
  }

  async loginWithCredentials(email: string, password: string) {
    await this.goto();
    await this.login(email, password);
  }

  async expectLoggedIn() {
    // Should redirect away from login page
    await this.page.waitForURL((url) => !url.pathname.includes('/login'));
  }

  async expectLoginError() {
    await this.errorMessage.waitFor({ state: 'visible' });
  }
}

import { test, expect, testUsers } from '../fixtures/test-fixtures';

/**
 * Smoke Tests: Authentication
 *
 * Critical flows:
 * - Login with valid credentials
 * - Logout
 * - Login error handling
 */

test.describe('Authentication', () => {
  test('should login with valid admin credentials', async ({ page, loginPage }) => {
    await loginPage.goto();

    // Fill credentials
    await loginPage.login(testUsers.admin.email, testUsers.admin.password);

    // Should redirect away from login page
    await loginPage.expectLoggedIn();
    expect(page.url()).not.toContain('/login');
  });

  test('should logout successfully', async ({ page, loginPage, navigationBar }) => {
    // Login first
    await loginPage.loginWithCredentials(testUsers.admin.email, testUsers.admin.password);

    // Wait for navigation to be visible
    await navigationBar.expectNavigationVisible();

    // Logout
    await navigationBar.logout();

    // Should redirect to login page
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
  });

  test('should show error for invalid credentials', async ({ loginPage }) => {
    await loginPage.goto();

    // Try to login with invalid credentials
    await loginPage.emailInput.fill('invalid@example.com');
    await loginPage.passwordInput.fill('wrongpassword');
    await loginPage.loginButton.click();

    // Should show error message
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should login with manager credentials', async ({ page, loginPage }) => {
    await loginPage.loginWithCredentials(testUsers.manager.email, testUsers.manager.password);

    await loginPage.expectLoggedIn();
    expect(page.url()).not.toContain('/login');
  });
});

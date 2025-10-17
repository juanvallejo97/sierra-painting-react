# End-to-End (E2E) Testing with Playwright

Complete guide for E2E smoke tests using Playwright to verify critical user flows in the Sierra Painting React application.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Page Objects](#page-objects)
- [CI Integration](#ci-integration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

### What are Smoke Tests?

Smoke tests are **high-level E2E tests** that verify critical user flows work end-to-end:

- ✅ **Fast**: Run in ~2-5 minutes
- ✅ **Critical paths only**: Login, job creation, invoice creation, navigation
- ✅ **Real browser**: Tests actual user experience
- ✅ **Cross-browser**: Chrome, Firefox, Safari, Mobile
- ✅ **CI-ready**: Runs in GitHub Actions

### Test Coverage

**Current smoke tests** (4 test suites):

1. **Authentication** (`e2e/smoke/auth.spec.ts`)
   - Login with valid credentials
   - Logout
   - Invalid credentials error

2. **Navigation** (`e2e/smoke/navigation.spec.ts`)
   - Navigate to Jobs, Invoices, Employees, Settings
   - Verify page loads
   - Multiple page transitions

3. **Jobs Management** (`e2e/smoke/jobs.spec.ts`)
   - View jobs list
   - Create new job
   - Search jobs

4. **Invoices Management** (`e2e/smoke/invoices.spec.ts`)
   - View invoices list
   - Create new invoice
   - Search invoices

### Technology Stack

- **Playwright** v1.56+
- **TypeScript**
- **Page Object Model** pattern
- **Test fixtures** for code reuse

## Setup

### 1. Install Dependencies

```bash
npm install
```

Playwright is already in `devDependencies`.

### 2. Install Playwright Browsers

**First time setup**:
```bash
npm run playwright:install
```

This installs:
- Chromium
- Firefox
- WebKit (Safari)
- Browser dependencies

**System requirements**:
- Node.js 18+
- ~1GB disk space for browsers

### 3. Verify Setup

```bash
# Run tests to verify everything works
npm run test:e2e:smoke
```

## Running Tests

### Basic Commands

**Run all E2E tests**:
```bash
npm run test:e2e
```

**Run smoke tests only**:
```bash
npm run test:e2e:smoke
```

**Run with UI (interactive)**:
```bash
npm run test:e2e:ui
```

**Run in headed mode (see browser)**:
```bash
npm run test:e2e:headed
```

**Run in debug mode**:
```bash
npm run test:e2e:debug
```

**View HTML report**:
```bash
npm run test:e2e:report
```

### Advanced Usage

**Run specific test file**:
```bash
npx playwright test e2e/smoke/auth.spec.ts
```

**Run specific test**:
```bash
npx playwright test -g "should login with valid credentials"
```

**Run on specific browser**:
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

**Run on mobile**:
```bash
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

**Run with trace**:
```bash
npx playwright test --trace on
```

**Update snapshots**:
```bash
npx playwright test --update-snapshots
```

### Before Running Tests

**Start the app**:
```bash
# Option 1: Production build
npm run build
npm run preview

# Option 2: Dev server (slower)
npm run dev
```

The tests use `http://localhost:4173` by default (preview server).

**Override base URL**:
```bash
PLAYWRIGHT_BASE_URL=http://localhost:5173 npm run test:e2e
```

## Test Structure

### Directory Layout

```
e2e/
├── smoke/                  # Smoke test suites
│   ├── auth.spec.ts       # Authentication tests
│   ├── navigation.spec.ts # Navigation tests
│   ├── jobs.spec.ts       # Jobs management tests
│   └── invoices.spec.ts   # Invoices management tests
├── page-objects/          # Page object models
│   ├── LoginPage.ts
│   ├── JobsPage.ts
│   ├── InvoicesPage.ts
│   └── NavigationBar.ts
├── fixtures/              # Test fixtures and utilities
│   └── test-fixtures.ts   # Shared fixtures
└── utils/                 # Helper utilities
    └── auth-helpers.ts    # Authentication helpers
```

### Configuration

**File**: `playwright.config.ts`

**Key settings**:
```typescript
{
  testDir: './e2e',
  timeout: 30 * 1000,           // 30s per test
  retries: 2,                   // Retry failed tests on CI
  workers: 1,                   // Run 1 test at a time on CI
  baseURL: 'http://localhost:5173',

  use: {
    trace: 'on-first-retry',    // Trace on retry
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium' },
    { name: 'firefox' },
    { name: 'webkit' },
    { name: 'Mobile Chrome' },
    { name: 'Mobile Safari' },
  ],
}
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '../fixtures/test-fixtures';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await loginAsAdmin(page);
  });

  test('should do something', async ({ page, jobsPage }) => {
    // Arrange
    await jobsPage.goto();

    // Act
    await jobsPage.createJob({ name: 'Test Job' });

    // Assert
    await jobsPage.expectJobInList('Test Job');
  });
});
```

### Using Page Objects

**Import page objects**:
```typescript
import { test, expect } from '../fixtures/test-fixtures';
import { loginAsAdmin } from '../utils/auth-helpers';

test('example', async ({ loginPage, jobsPage, navigationBar }) => {
  // Use page objects
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password');

  await navigationBar.goToJobs();

  await jobsPage.createJob({ name: 'New Job' });
});
```

### Authentication

**Login helpers**:
```typescript
import { loginAsAdmin, loginAsManager } from '../utils/auth-helpers';

test('as admin', async ({ page }) => {
  await loginAsAdmin(page);
  // Now logged in as admin
});

test('as manager', async ({ page }) => {
  await loginAsManager(page);
  // Now logged in as manager
});
```

### Test Data

**Use test data generators**:
```typescript
import { testData } from '../fixtures/test-fixtures';

test('create job', async ({ jobsPage }) => {
  const job = testData.job();
  // Returns: { name: 'Test Job 1234567890', status: 'pending', ... }

  await jobsPage.createJob(job);
});

test('create invoice', async ({ invoicesPage }) => {
  const invoice = testData.invoice();
  // Returns: { customerName: 'Test Customer 1234567890', amount: 5000, ... }

  await invoicesPage.createInvoice(invoice);
});
```

### Assertions

**Playwright assertions**:
```typescript
// Visibility
await expect(page.getByRole('button')).toBeVisible();
await expect(page.getByRole('button')).toBeHidden();

// Text content
await expect(page.getByRole('heading')).toHaveText('Jobs');
await expect(page.getByRole('cell')).toContainText('Test Job');

// URL
expect(page.url()).toContain('/jobs');
await page.waitForURL(/\/jobs/);

// Count
await expect(page.getByRole('row')).toHaveCount(5);

// Attribute
await expect(page.getByRole('button')).toBeEnabled();
await expect(page.getByRole('button')).toBeDisabled();
```

## Page Objects

### What are Page Objects?

Page Objects **encapsulate page interactions** in reusable classes:

**Benefits**:
- ✅ **Maintainable**: Change selectors in one place
- ✅ **Readable**: `loginPage.login()` vs complex selectors
- ✅ **Reusable**: Share across tests

### Creating a Page Object

```typescript
import { Page, Locator } from '@playwright/test';

export class MyPage {
  readonly page: Page;
  readonly myButton: Locator;
  readonly myInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.myButton = page.getByRole('button', { name: /submit/i });
    this.myInput = page.getByPlaceholder(/enter text/i);
  }

  async goto() {
    await this.page.goto('/my-page');
  }

  async fillForm(text: string) {
    await this.myInput.fill(text);
    await this.myButton.click();
  }

  async expectSuccess() {
    await this.page.getByText(/success/i).waitFor({ state: 'visible' });
  }
}
```

### Using Page Objects

```typescript
// In test file
import { MyPage } from '../page-objects/MyPage';

test('my test', async ({ page }) => {
  const myPage = new MyPage(page);

  await myPage.goto();
  await myPage.fillForm('test');
  await myPage.expectSuccess();
});
```

### Existing Page Objects

#### LoginPage

```typescript
loginPage.goto()
loginPage.login(email, password)
loginPage.loginWithCredentials(email, password)
loginPage.expectLoggedIn()
loginPage.expectLoginError()
```

#### JobsPage

```typescript
jobsPage.goto()
jobsPage.createJob({ name, status, description })
jobsPage.searchJobs(query)
jobsPage.expectJobInList(jobName)
jobsPage.expectJobsTableVisible()
```

#### InvoicesPage

```typescript
invoicesPage.goto()
invoicesPage.createInvoice({ customerName, amount, description })
invoicesPage.searchInvoices(query)
invoicesPage.expectInvoiceInList(customerName)
invoicesPage.expectInvoicesTableVisible()
```

#### NavigationBar

```typescript
navigationBar.goToJobs()
navigationBar.goToInvoices()
navigationBar.goToEmployees()
navigationBar.goToSettings()
navigationBar.logout()
navigationBar.expectNavigationVisible()
```

## CI Integration

### GitHub Actions

Tests are integrated into production deployment workflow:

**File**: `.github/workflows/deploy-production.yml`

```yaml
- name: Run E2E smoke tests
  run: npm run test:e2e:smoke
  env:
    PLAYWRIGHT_BASE_URL: https://sierra-painting.web.app
```

**When tests run**:
- After production deployment
- Verify production is working
- Alert if critical flows break

### Running on Different Environments

**Staging**:
```bash
PLAYWRIGHT_BASE_URL=https://sierra-painting-staging.web.app npm run test:e2e:smoke
```

**Production**:
```bash
PLAYWRIGHT_BASE_URL=https://sierra-painting.web.app npm run test:e2e:smoke
```

**Local**:
```bash
PLAYWRIGHT_BASE_URL=http://localhost:5173 npm run test:e2e:smoke
```

## Best Practices

### 1. Use Semantic Locators

**✅ Good** (accessible, resilient):
```typescript
page.getByRole('button', { name: /submit/i })
page.getByLabel(/email/i)
page.getByPlaceholder(/search/i)
page.getByText(/welcome/i)
```

**❌ Bad** (fragile, breaks on small changes):
```typescript
page.locator('#btn-123')
page.locator('.css-class-name')
page.locator('div > button:nth-child(2)')
```

### 2. Avoid Hard-Coded Waits

**✅ Good** (waits until condition):
```typescript
await page.waitForURL(/\/jobs/);
await expect(element).toBeVisible();
await page.waitForLoadState('networkidle');
```

**❌ Bad** (arbitrary timeout):
```typescript
await page.waitForTimeout(3000); // Flaky!
```

### 3. Use Page Objects

**✅ Good**:
```typescript
await loginPage.login(email, password);
await jobsPage.createJob({ name: 'Test' });
```

**❌ Bad**:
```typescript
await page.getByPlaceholder(/email/i).fill(email);
await page.getByPlaceholder(/password/i).fill(password);
await page.getByRole('button', { name: /login/i }).click();
// Repeated across tests
```

### 4. Isolate Tests

**Each test should be independent**:

```typescript
test.beforeEach(async ({ page }) => {
  // Login before EACH test
  await loginAsAdmin(page);
});

test('test 1', async ({ jobsPage }) => {
  // Doesn't depend on test 2
  await jobsPage.createJob({ name: 'Job 1' });
});

test('test 2', async ({ jobsPage }) => {
  // Doesn't depend on test 1
  await jobsPage.createJob({ name: 'Job 2' });
});
```

### 5. Use Descriptive Test Names

**✅ Good**:
```typescript
test('should create a new job with valid data');
test('should show error when creating job with empty name');
test('should redirect to login page after logout');
```

**❌ Bad**:
```typescript
test('job test');
test('test 1');
test('check if it works');
```

### 6. Keep Smoke Tests Fast

**Smoke tests should run in < 5 minutes**:

- ✅ Test happy paths only
- ✅ Use minimal test data
- ✅ Skip edge cases (save for unit tests)
- ✅ Parallelize when possible

## Troubleshooting

### Tests Failing Locally

**1. Check app is running**:
```bash
# Make sure app is running on port 4173
npm run build
npm run preview
```

**2. Check base URL**:
```bash
# Verify Playwright is using correct URL
cat playwright.config.ts | grep baseURL
```

**3. Run with debug mode**:
```bash
npm run test:e2e:debug
```

**4. Check browser compatibility**:
```bash
# Re-install browsers
npm run playwright:install
```

### Tests Passing Locally But Failing on CI

**Common causes**:

**1. Timing issues**:
- CI is slower than local
- Add retry: `retries: 2` in config

**2. Viewport differences**:
- Test on different screen sizes
- Use mobile projects

**3. Missing environment variables**:
- Check GitHub secrets are set

**4. Firebase emulator not running**:
- Start emulators in CI before tests

### Flaky Tests

**Test fails intermittently**:

**Solutions**:

**1. Use proper waits**:
```typescript
// ❌ Bad
await page.waitForTimeout(1000);

// ✅ Good
await expect(element).toBeVisible();
```

**2. Wait for network**:
```typescript
await page.waitForLoadState('networkidle');
```

**3. Increase timeout**:
```typescript
await expect(element).toBeVisible({ timeout: 10000 });
```

**4. Use retry**:
```typescript
test.describe.configure({ retries: 2 });
```

### Debugging Failed Tests

**1. View screenshot**:
```bash
# Screenshots saved to test-results/
open test-results/smoke-auth-should-login/test-failed-1.png
```

**2. View video**:
```bash
# Videos saved to test-results/
open test-results/smoke-auth-should-login/video.webm
```

**3. View trace**:
```bash
# Open Playwright trace viewer
npx playwright show-trace test-results/trace.zip
```

**4. Run in headed mode**:
```bash
npm run test:e2e:headed
```

**5. Use Playwright Inspector**:
```bash
npm run test:e2e:debug
```

### Element Not Found

**Error**: `Element not found`

**Fixes**:

**1. Check selector**:
```typescript
// Try different selectors
page.getByRole('button', { name: /login/i })
page.getByLabel(/email/i)
page.getByPlaceholder(/search/i)
```

**2. Wait for element**:
```typescript
await element.waitFor({ state: 'visible' });
```

**3. Check if element exists**:
```typescript
const count = await page.getByRole('button').count();
console.log('Found buttons:', count);
```

## Advanced Topics

### Visual Regression Testing

**Add screenshots**:
```typescript
test('visual test', async ({ page }) => {
  await page.goto('/jobs');
  await expect(page).toHaveScreenshot('jobs-page.png');
});
```

### Testing API Responses

**Mock API**:
```typescript
await page.route('**/api/jobs', async (route) => {
  await route.fulfill({
    status: 200,
    body: JSON.stringify({ jobs: [] }),
  });
});
```

### Testing File Uploads

```typescript
await page.getByLabel('Upload').setInputFiles('path/to/file.pdf');
```

### Testing Downloads

```typescript
const downloadPromise = page.waitForEvent('download');
await page.getByRole('button', { name: /download/i }).click();
const download = await downloadPromise;
await download.saveAs('path/to/save/file.pdf');
```

## Metrics

### Success Criteria

**Healthy E2E test suite**:
- ✅ 95%+ pass rate
- ✅ < 5 minutes execution time
- ✅ < 5% flaky tests
- ✅ All critical paths covered

### Coverage

**Current coverage**:
- ✅ Authentication: 100%
- ✅ Navigation: 100%
- ✅ Job creation: 100%
- ✅ Invoice creation: 100%

**Future coverage**:
- ⏳ Payment processing
- ⏳ Employee management
- ⏳ Report generation

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [Page Object Model](https://playwright.dev/docs/pom)

---

**Last Updated**: 2025-10-17
**Version**: 1.0.0
**Test Coverage**: 4 smoke test suites, 15+ tests

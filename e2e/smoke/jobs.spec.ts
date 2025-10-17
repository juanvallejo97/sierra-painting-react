import { test, expect, testData } from '../fixtures/test-fixtures';
import { loginAsAdmin } from '../utils/auth-helpers';

/**
 * Smoke Tests: Jobs
 *
 * Critical flows:
 * - View jobs list
 * - Create new job
 * - Search jobs
 */

test.describe('Jobs Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);
  });

  test('should display jobs list', async ({ jobsPage }) => {
    await jobsPage.goto();

    // Verify jobs table is visible
    await jobsPage.expectJobsTableVisible();

    // Verify create button is visible
    await expect(jobsPage.createJobButton).toBeVisible();
  });

  test('should open create job dialog', async ({ page, jobsPage }) => {
    await jobsPage.goto();

    // Click create button
    await jobsPage.clickCreateJob();

    // Verify dialog opened
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Verify form fields are present
    await expect(jobsPage.jobNameInput).toBeVisible();
    await expect(jobsPage.saveJobButton).toBeVisible();
  });

  test('should create a new job', async ({ jobsPage }) => {
    await jobsPage.goto();

    const job = testData.job();

    // Create job
    await jobsPage.createJob(job);

    // Verify job appears in list
    await jobsPage.expectJobInList(job.name);
  });

  test('should search jobs', async ({ jobsPage }) => {
    await jobsPage.goto();

    // Create a job first
    const job = testData.job();
    await jobsPage.createJob(job);

    // Search for the job
    await jobsPage.searchJobs(job.name);

    // Verify job appears in filtered results
    await jobsPage.expectJobInList(job.name);
  });
});

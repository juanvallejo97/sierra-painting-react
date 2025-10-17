import { Page, Locator } from '@playwright/test';

/**
 * Page Object for Jobs Screen
 *
 * Handles job listing and creation
 */
export class JobsPage {
  readonly page: Page;
  readonly createJobButton: Locator;
  readonly jobNameInput: Locator;
  readonly jobStatusSelect: Locator;
  readonly saveJobButton: Locator;
  readonly jobsTable: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createJobButton = page.getByRole('button', { name: /create job|new job/i });
    this.jobNameInput = page.getByLabel(/job name|name/i);
    this.jobStatusSelect = page.getByLabel(/status/i);
    this.saveJobButton = page.getByRole('button', { name: /save|create/i });
    this.jobsTable = page.getByRole('table');
    this.searchInput = page.getByPlaceholder(/search/i);
  }

  async goto() {
    await this.page.goto('/jobs');
  }

  async clickCreateJob() {
    await this.createJobButton.click();
  }

  async fillJobForm(data: {
    name: string;
    status?: string;
    description?: string;
  }) {
    await this.jobNameInput.fill(data.name);

    if (data.status) {
      await this.jobStatusSelect.click();
      await this.page.getByRole('option', { name: data.status }).click();
    }

    if (data.description) {
      const descInput = this.page.getByLabel(/description/i);
      await descInput.fill(data.description);
    }
  }

  async saveJob() {
    await this.saveJobButton.click();

    // Wait for dialog to close
    await this.page.waitForTimeout(500);
  }

  async createJob(data: { name: string; status?: string; description?: string }) {
    await this.clickCreateJob();
    await this.fillJobForm(data);
    await this.saveJob();
  }

  async searchJobs(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Debounce
  }

  async expectJobInList(jobName: string) {
    await this.page.getByRole('cell', { name: jobName }).waitFor({ state: 'visible' });
  }

  async expectJobsTableVisible() {
    await this.jobsTable.waitFor({ state: 'visible' });
  }
}

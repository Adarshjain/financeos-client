import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { resetLlm, scriptLlm, setLlmMode } from '../fixtures/control';
import { BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { categorizeScript } from '../fixtures/llm';
import { createBankAccount } from '../fixtures/seed/accounts';
import { uploadAndIngest, uploadStatements } from '../fixtures/seed/statements';
import { expect, test } from '../fixtures/test';

test.describe('Background Jobs UI (@ui)', () => {
  test.describe.configure({ mode: 'serial' });
  let currentUser: CreatedUser;

  const standardBankSpec: BankSpec = {
    bank: 'HDFC Bank',
    accountLast10: '4455667788',
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    opening: 10000.0,
    rows: [
      { date: '2026-04-05', description: 'SALARY CREDIT', credit: 25000.0 },
      { date: '2026-04-15', description: 'SUPERMARKET GROCERY', debit: 1500.0 },
    ],
  };

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-jobs');
    await loginContext(context, currentUser.cookie);
    const api = makeApi(currentUser.cookie);
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
  });

  test.afterEach(async () => {
    const api = makeApi(currentUser.cookie);
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
  });

  test('/settings/jobs: list history, filter by status and type', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const account = await createBankAccount(api, { name: 'Jobs History Bank' });
    const pdf = await genBankPdf(standardBankSpec);

    // Ingest statement to create a completed job
    await uploadAndIngest(api, account.id, [
      { filename: 'jobs-ui-test.pdf', buffer: pdf },
    ]);

    await page.goto('/settings/jobs');

    // 1. Verify Page Heading
    await expect(
      page.getByRole('heading', { name: 'Background Jobs History' })
    ).toBeVisible();

    // 2. Verify Table contains the job
    await expect(page.getByText('Statement Ingest').first()).toBeVisible();
    await expect(page.locator('tbody').getByText('SUCCEEDED').first()).toBeVisible();

    // 3. Filter by Status: Succeeded
    await page.getByRole('link', { name: 'Succeeded' }).first().click();
    await expect(page).toHaveURL(/status=SUCCEEDED/);
    await expect(page.locator('tbody').getByText('SUCCEEDED').first()).toBeVisible();

    // 4. Filter by Type: Statement Ingest (the type pill, not the table cell)
    await page.getByRole('link', { name: 'Statement Ingest' }).first().click();
    await expect(page).toHaveURL(/type=STATEMENT_INGEST/);
    await expect(page.locator('tbody').getByText('Statement Ingest').first()).toBeVisible();

    // 5. A status with no jobs shows the empty state, and "All Statuses" brings them back
    await page.getByRole('link', { name: 'Failed' }).first().click();
    await expect(page).toHaveURL(/status=FAILED/);
    await expect(page.locator('tbody').getByText('SUCCEEDED')).toHaveCount(0);
    await page.getByRole('link', { name: 'All Statuses' }).first().click();
    await expect(page.locator('tbody').getByText('SUCCEEDED').first()).toBeVisible();
  });

  test('/settings/jobs: retry a CANCELLED job from row action -> spawns new completing job', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const account = await createBankAccount(api, { name: 'Jobs Retry Bank' });
    const pdf = await genBankPdf(standardBankSpec);

    // 1. Create rule first so it's ready to apply
    const { createCategory, createRule } = await import('../fixtures/seed/categories');
    const cat = await createCategory(api, 'UI Retry Rule Cat');
    const rule = await createRule(api, {
      merchantKey: 'UI_RETRY_MERCHANT',
      categoryIds: [cat.id],
    });

    // 2. Temporarily fill worker concurrency slots with delayed jobs
    await scriptLlm(api, '*', [
      {
        json: categorizeScript([
          { index: 0, merchantKey: 'SALARY', categoryNames: ['Salary'] },
        ]),
        delayMs: 15000,
      },
      {
        json: categorizeScript([
          { index: 0, merchantKey: 'SALARY', categoryNames: ['Salary'] },
        ]),
        delayMs: 15000,
      },
      {
        json: categorizeScript([
          { index: 0, merchantKey: 'SALARY', categoryNames: ['Salary'] },
        ]),
        delayMs: 15000,
      },
      {
        json: categorizeScript([
          { index: 0, merchantKey: 'SALARY', categoryNames: ['Salary'] },
        ]),
        delayMs: 15000,
      },
    ]);

    await uploadStatements(api, account.id, [
      { filename: 'ui-slot1.pdf', buffer: pdf },
      { filename: 'ui-slot2.pdf', buffer: pdf },
    ]);
    await uploadStatements(api, account.id, [
      { filename: 'ui-slot3.pdf', buffer: pdf },
      { filename: 'ui-slot4.pdf', buffer: pdf },
    ]);

    // 3. Trigger apply while slots are full -> queued in PENDING
    const applyRes = await api.POST('/api/v1/rules/{id}/apply', {
      params: { path: { id: rule.id } },
      body: { all: true },
    });
    const ruleJobId = (applyRes.data as { jobId: string }).jobId;

    // Cancel the PENDING rule job -> transitions to CANCELLED
    await api.POST('/api/v1/jobs/{id}/cancel', {
      params: { path: { id: ruleJobId } },
    });

    await page.goto('/settings/jobs');

    // Wait for CANCELLED badge to show on the page
    await expect(page.locator('tbody').getByText('CANCELLED').first()).toBeVisible({ timeout: 20000 });

    // Click "Retry" button on the cancelled job row
    const retryBtn = page.locator('tbody').getByRole('button', { name: /Retry/i }).first();
    await retryBtn.click();

    // Verify toast or new job completion
    await expect(page.getByText(/Job retried/i)).toBeVisible();

    // Verify a SUCCEEDED row appears
    await expect(page.locator('tbody').getByText('SUCCEEDED').first()).toBeVisible({ timeout: 25000 });
  });

  test('/settings/jobs: cancel a RUNNING job from row action', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const account = await createBankAccount(api, { name: 'Jobs Cancel Bank' });
    const pdf = await genBankPdf(standardBankSpec);

    // Delay LLM response by 15000ms
    await scriptLlm(api, 'categorize', [
      {
        json: categorizeScript([
          { index: 0, merchantKey: 'SALARY', categoryNames: ['Salary'] },
        ]),
        delayMs: 15000,
      },
    ]);

    await uploadStatements(api, account.id, [
      { filename: 'cancel-ui-test.pdf', buffer: pdf },
    ]);

    await page.goto('/settings/jobs');

    // Verify RUNNING status or Cancel button is visible
    const cancelBtn = page.getByRole('button', { name: /Cancel/i }).first();
    await expect(cancelBtn).toBeVisible({ timeout: 15000 });

    // Click Cancel
    await cancelBtn.click();

    // Verify cancellation toast
    await expect(page.getByText(/Cancellation requested/i)).toBeVisible();
  });
});

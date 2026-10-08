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
import { clickUntilRequest } from '../fixtures/ui';

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

  test('/settings/activity: list history, filter by status and type', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const account = await createBankAccount(api, { name: 'Jobs History Bank' });
    const pdf = await genBankPdf(standardBankSpec);

    // Ingest statement to create a completed job
    await uploadAndIngest(api, account.id, [
      { filename: 'jobs-ui-test.pdf', buffer: pdf },
    ]);

    await page.goto('/settings/activity');

    // 1. Verify Page Heading
    await expect(
      page.getByRole('heading', { name: 'Activity', exact: true })
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

  test('/settings/activity: retry a CANCELLED job from row action -> spawns new completing job', async ({
    page,
  }) => {
    // The retried job waits out the 15s LLM delay holding both worker slots
    test.slow();
    const api = makeApi(currentUser.cookie);
    const account = await createBankAccount(api, { name: 'Jobs Retry Bank' });
    // One PDF per upload, each for its own period: a second statement for the same account and
    // period is skipped as already ingested, so that job never calls the LLM and frees its worker
    // slot at once.
    const pdfA = await genBankPdf(standardBankSpec);
    const pdfB = await genBankPdf({
      ...standardBankSpec,
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      rows: [
        { date: '2026-05-08', description: 'RENT TRANSFER', debit: 12000.0 },
        { date: '2026-05-20', description: 'ELECTRICITY BILL', debit: 2200.0 },
      ],
    });

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

    // Each upload is one job; the worker has 2 slots, so two delayed jobs fill it.
    await uploadStatements(api, account.id, [{ filename: 'ui-slot1.pdf', buffer: pdfA }]);
    await uploadStatements(api, account.id, [{ filename: 'ui-slot2.pdf', buffer: pdfB }]);

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

    await page.goto('/settings/activity');

    const ruleRows = page.locator('tbody tr').filter({ hasText: 'Rule Apply' });
    const cancelledRow = ruleRows.filter({ hasText: 'CANCELLED' });
    await expect(cancelledRow).toBeVisible({ timeout: 20000 });

    await clickUntilRequest(
      page,
      cancelledRow.getByRole('button', { name: /Retry/i }),
      /\/api\/v1\/jobs\/[^/]+\/retry/
    );
    await expect(page.getByText(/Job retried/i)).toBeVisible();

    // The retried rule job runs once the delayed ingest jobs free their slots
    await expect(ruleRows.filter({ hasText: 'SUCCEEDED' })).toBeVisible({ timeout: 25000 });
  });

  test('/settings/activity: cancel a RUNNING job from row action', async ({
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

    await page.goto('/settings/activity');

    // Verify RUNNING status or Cancel button is visible
    const cancelBtn = page.getByRole('button', { name: /Cancel/i }).first();
    await expect(cancelBtn).toBeVisible({ timeout: 15000 });

    await clickUntilRequest(page, cancelBtn, /\/api\/v1\/jobs\/[^/]+\/cancel/);

    // Verify cancellation toast
    await expect(page.getByText(/Cancellation requested/i)).toBeVisible();
  });
});

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { resetLlm, setLlmMode } from '../fixtures/control';
import { BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { createBankAccount } from '../fixtures/seed/accounts';
import { genSlowStatementPdf, uploadAndIngest, uploadStatements } from '../fixtures/seed/statements';
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

    // 1. Verify the page: the Status and Type filter chips
    await expect(page.getByRole('button', { name: 'Status', exact: true })).toBeVisible({ timeout: 45000 });

    // 2. The table contains the job
    const jobRows = page.locator('[role="table"] [role="button"]');
    await expect(jobRows.filter({ hasText: 'Statement ingest' }).first()).toBeVisible();
    await expect(jobRows.filter({ hasText: 'Succeeded' }).first()).toBeVisible();

    // 3. Filter by Status: Succeeded
    await page.getByRole('button', { name: 'Status', exact: true }).click();
    await page.getByRole('option', { name: 'Succeeded' }).click();
    await expect(page).toHaveURL(/status=SUCCEEDED/);
    await expect(jobRows.filter({ hasText: 'Succeeded' }).first()).toBeVisible();

    // 4. Filter by Type: Statement ingest
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    await page.getByRole('option', { name: 'Statement ingest' }).click();
    await expect(page).toHaveURL(/type=STATEMENT_INGEST/);
    await expect(jobRows.filter({ hasText: 'Statement ingest' }).first()).toBeVisible();

    // 5. A status with no jobs shows the empty state, and clearing the filters brings them back
    await page.getByRole('button', { name: /^Succeeded/ }).click();
    await page.getByRole('option', { name: 'Failed' }).click();
    await expect(page).toHaveURL(/status=FAILED/);
    await expect(page.getByText('No jobs match')).toBeVisible();
    await expect(jobRows.filter({ hasText: 'Succeeded' })).toHaveCount(0);
    await page.getByRole('link', { name: 'Clear filters' }).click();
    await expect(jobRows.filter({ hasText: 'Succeeded' }).first()).toBeVisible();
  });

  test('/settings/activity: retry a CANCELLED job from row action -> spawns new completing job', async ({
    page,
  }) => {
    // The retried job waits for the two big statements to free the worker slots
    test.slow();
    const api = makeApi(currentUser.cookie);
    const account = await createBankAccount(api, { name: 'Jobs Retry Bank' });
    // Two big statements keep both worker slots busy for a few seconds each
    const slow = await genSlowStatementPdf();

    // 1. Create rule first so it's ready to apply
    const { createRule } = await import('../fixtures/seed/categories');
    const rule = await createRule(api, {
      merchantKey: 'UI_RETRY_MERCHANT',
    });

    // 2. Fill the worker's concurrency slots

    // Each upload is one job; the worker has 2 slots, so two delayed jobs fill it.
    await uploadStatements(api, account.id, [{ filename: 'ui-slot1.pdf', buffer: slow }]);
    await uploadStatements(api, account.id, [{ filename: 'ui-slot2.pdf', buffer: slow }]);

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

    const ruleRows = page.locator('[role="table"] [role="button"]').filter({ hasText: 'Rule apply' });
    const cancelledRow = ruleRows.filter({ hasText: 'Cancelled' });
    await expect(cancelledRow).toBeVisible({ timeout: 20000 });

    // Opening the job shows its result card, where Retry sits. Retry runs through a server action, so the
    // browser posts the job id to the page, not to /api/v1/jobs/<id>/retry.
    await cancelledRow.click();
    const card = page.getByTestId('job-result-card');
    await expect(card).toBeVisible();
    await clickUntilRequest(
      page,
      card.getByRole('button', { name: 'Retry' }),
      (request) => request.headers()['next-action'] !== undefined && (request.postData() ?? '').includes(ruleJobId)
    );
    await expect(page.getByText(/Job retried/i)).toBeVisible();

    // The retried rule job runs once the delayed ingest jobs free their slots
    await expect(ruleRows.filter({ hasText: 'Succeeded' })).toBeVisible({ timeout: 25000 });
  });

  test('/settings/activity: cancel a RUNNING job from row action', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const account = await createBankAccount(api, { name: 'Jobs Cancel Bank' });
    // A big statement keeps the ingest job RUNNING while the page is open
    const pdf = await genSlowStatementPdf();

    const uploadRes = await uploadStatements(api, account.id, [
      { filename: 'cancel-ui-test.pdf', buffer: pdf },
    ]);
    const jobId = (uploadRes.data as { jobId: string }).jobId;

    await page.goto(`/settings/activity?job=${jobId}`);

    // The job's result card shows its Cancel button while it is running
    const cancelBtn = page.getByTestId('job-result-card').getByRole('button', { name: 'Cancel' });
    await expect(cancelBtn).toBeVisible({ timeout: 15000 });

    // Cancel runs through a server action, so the browser posts the job id to the page, not to /api/v1/jobs/<id>/cancel.
    await clickUntilRequest(
      page,
      cancelBtn,
      (request) => request.headers()['next-action'] !== undefined && (request.postData() ?? '').includes(jobId)
    );

    // Verify cancellation toast
    await expect(page.getByText(/Cancellation requested/i)).toBeVisible();
  });
});

import { expect as pwExpect } from '@playwright/test';

import { type ApiClient, makeApi, waitForJob } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { resetLlm } from '../fixtures/control';
import { genBankPdf } from '../fixtures/gen/statements';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createRule } from '../fixtures/seed/categories';
import { uploadAndIngest } from '../fixtures/seed/statements';
import { expect, test } from '../fixtures/test';

// A rule apply that categorises a transaction adds one feed row naming the rule; rules only match
// ingested transactions, so seed one through a statement first.
async function addFeedRow(api: ApiClient, key: string): Promise<void> {
  await resetLlm(api);
  const account = await createBankAccount(api);
  const pdf = await genBankPdf({
    bank: 'HDFC Bank',
    accountLast10: '4455667788',
    periodStart: '2026-04-01',
    periodEnd: '2026-04-30',
    opening: 20000,
    rows: [{ date: '2026-04-03', description: `${key} PURCHASE`, debit: 450 }],
  });
  const { job } = await uploadAndIngest(api, account.id, [{ filename: 'feed.pdf', buffer: pdf }]);
  pwExpect(job.status).toBe('SUCCEEDED');
  const rule = await createRule(api, { merchantKey: key, displayName: 'Feed shop', matchType: 'CONTAINS' });
  const res = await api.POST('/api/v1/rules/{id}/apply', { params: { path: { id: rule.id } }, body: { all: true } });
  pwExpect(res.response.status).toBe(202);
  pwExpect((await waitForJob(api, res.data!.jobId)).status).toBe('SUCCEEDED');
}

test.describe('/notifications (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request, page }) => {
    currentUser = await createUser(request, 'ui-notifications-feed');
    await loginContext(context, currentUser.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('a new user sees the empty state', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page.getByText('No notifications yet')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('button', { name: 'Clear all' })).toHaveCount(0);
  });

  test('a finished rule shows in the feed by day; Clear removes it', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    await addFeedRow(api, 'FEEDSHOP');

    await page.goto('/notifications');
    const row = page.getByTestId('notification-row');
    await expect(row).toHaveCount(1, { timeout: 45_000 });
    await expect(row).toContainText("Rule 'Feed shop' applied");
    await expect(row).toContainText('1 transaction categorised');
    await expect(page.getByTestId('notification-day')).toHaveCount(1);

    await row.getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByText('No notifications yet')).toBeVisible({ timeout: 15_000 });
  });

  test('Clear all asks first, then empties the feed', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    await addFeedRow(api, 'FEEDSHOPTWO');

    await page.goto('/notifications');
    await expect(page.getByTestId('notification-row')).toHaveCount(1, { timeout: 45_000 });
    await page.getByRole('button', { name: 'Clear all' }).click();
    const dialog = page.getByRole('dialog', { name: 'Clear all notifications?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByTestId('notification-row')).toHaveCount(1);

    await page.getByRole('button', { name: 'Clear all' }).click();
    await dialog.getByRole('button', { name: 'Clear all' }).click();
    await expect(page.getByText('No notifications yet')).toBeVisible({ timeout: 15_000 });
    const feed = await api.GET('/api/v1/notifications/feed', { params: { query: { page: 0, size: 10 } } });
    expect(feed.data!.content).toEqual([]);
  });
});

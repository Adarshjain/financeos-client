import type { Page } from '@playwright/test';

import type { ApiClient } from '../fixtures/api';
import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { resetLlm, setLlmMode } from '../fixtures/control';
import { createBankAccount } from '../fixtures/seed/accounts';
import { seedDueSoonLoan } from '../fixtures/seed/obligations';
import { createTransaction, todayString } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

/**
 * One transaction waiting for review. An overlapping statement no longer flags its repeated rows (the matcher folds them
 * into one), so the review queue is seeded by flagging a row directly.
 */
async function seedReviewRow(api: ApiClient, accountId: string) {
  const t = await createTransaction(api, accountId, { amount: -450, date: todayString(-1), description: 'Swiggy Dinner' });
  const res = await api.PUT('/api/v1/transactions/{id}', {
    params: { path: { id: t.id } },
    body: { accountId, amount: t.amount ?? undefined, date: t.date, description: t.description ?? undefined, reviewType: 'NEEDS_REVIEW', reviewReasons: ['DUPLICATE_SUSPECT'] },
  });
  if (res.response.status !== 200) throw new Error(`flag failed (${res.response.status}): ${JSON.stringify(res.error)}`);
}

const row = (page: Page, key: string) => page.locator(`[data-inbox-key="${key}"]`);

test.describe('/ds Inbox rows only point, desktop 1440px (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request, page }) => {
    currentUser = await createUser(request, 'ui-ds-inbox');
    await loginContext(context, currentUser.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('an EMI row is one link to the installment: no buttons, and right-click offers no Snooze', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const loan = await seedDueSoonLoan(api, 'Ds Inbox Loan');
    const emiKey = `emi:${loan.id}:1`;
    await page.goto('/inbox');
    await expect(page).toHaveTitle('Inbox · FinanceOS');
    await expect(row(page, emiKey)).toBeVisible({ timeout: 45_000 });
    await expect(row(page, emiKey)).toHaveAttribute('href', `/loans/${loan.id}?installment=1`);
    await expect(row(page, emiKey).getByRole('button')).toHaveCount(0);

    await row(page, emiKey).click({ button: 'right' });
    await expect(page.getByRole('menuitem', { name: 'Snooze' })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: 'Dismiss' })).toHaveCount(0);
  });

  test('the review summary row is one link to the transactions to review, with no buttons', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');
    const bank = await createBankAccount(api, { name: 'Ds Inbox Bank' });
    await seedReviewRow(api, bank.id);

    await page.goto('/inbox');
    await expect(row(page, 'review')).toBeVisible({ timeout: 45_000 });
    await expect(row(page, 'review')).toHaveAttribute('href', '/transactions?review=needs_review');
    await expect(row(page, 'review').getByRole('button')).toHaveCount(0);
    await row(page, 'review').click();
    await page.waitForURL(/\/transactions\?review=needs_review/);
  });
});

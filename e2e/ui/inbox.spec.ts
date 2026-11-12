import type { Page } from '@playwright/test';

import type { ApiClient } from '../fixtures/api';
import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { resetLlm, setLlmMode } from '../fixtures/control';
import { createBankAccount } from '../fixtures/seed/accounts';
import { seedCardBill, seedDueSoonLoan } from '../fixtures/seed/obligations';
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

function row(page: Page, key: string) {
  return page.locator(`[data-inbox-key="${key}"]`);
}

/** Where the review summary row sends you: Transactions filtered to the ones needing review. */
const REVIEW_HREF = '/transactions?review=needs_review';

test.describe('Inbox UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-inbox');
    await loginContext(context, currentUser.cookie);
  });

  test('@mobile a user with nothing pending sees All clear with links onward', async ({ page }) => {
    await page.goto('/inbox');
    await expect(page).toHaveTitle('Inbox · FinanceOS');
    await expect(page.getByText('All clear')).toBeVisible();
    await expect(page.getByTestId('inbox-section-act_now')).toHaveCount(0);
    await expect(page.locator('main').getByRole('link', { name: 'Upcoming', exact: true })).toHaveAttribute('href', '/upcoming');
    await expect(page.locator('main').getByRole('link', { name: 'Transactions', exact: true })).toHaveAttribute('href', '/transactions');
  });

  test('sections, rows that only point, grouped rows, and the old ?item= link', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');

    // Seed: an EMI due in 3 days, a card bill due in 2 days and a review queue (the server builds no Info rows any more).
    const loan = await seedDueSoonLoan(api, 'Inbox Home Loan');
    const bill = await seedCardBill(api, { name: 'Inbox Card', last4: '7101', dueInDays: 2 });
    const bank = await createBankAccount(api, { name: 'Inbox Bank' });
    await seedReviewRow(api, bank.id);

    const emiKey = `emi:${loan.id}:1`;
    const billKey = `bill:${bill.statementId}`;

    try {
      await page.goto('/inbox');
      await expect(page).toHaveTitle('Inbox · FinanceOS');

      // Sections: act now holds the EMI and the bill, needs a look holds the review summary.
      const actNow = page.getByTestId('inbox-section-act_now');
      await expect(actNow).toBeVisible();
      await expect(actNow.locator(`[data-inbox-key="${emiKey}"]`)).toBeVisible();
      await expect(actNow.locator(`[data-inbox-key="${billKey}"]`)).toBeVisible();
      await expect(page.getByTestId('inbox-section-needs_look').locator('[data-inbox-key="review"]')).toBeVisible();
      await expect(page.getByTestId('inbox-section-info')).toHaveCount(0);
      // Each section header carries its count: two to act on, one to look at.
      await expect(actNow.getByRole('heading', { level: 2 })).toContainText('2');
      await expect(page.getByTestId('inbox-section-needs_look').getByRole('heading', { level: 2 })).toContainText('1');

      // Every row is one link to the page that decides it, with no buttons, menu, snooze or dismiss.
      const emiRow = row(page, emiKey);
      await expect(emiRow).toContainText('Inbox Home Loan: EMI #1');
      await expect(emiRow).toHaveAttribute('href', `/loans/${loan.id}?installment=1`);
      await expect(row(page, billKey)).toContainText('Inbox Card ••7101 bill');
      await expect(row(page, billKey)).toHaveAttribute('href', `/accounts/${bill.cardId}`);
      const reviewRow = row(page, 'review');
      await expect(reviewRow).toContainText('Transactions to review');
      await expect(reviewRow).toHaveAttribute('href', REVIEW_HREF);
      await expect(page.getByTestId('inbox-row')).toHaveCount(3);
      await expect(page.getByTestId('inbox-row').getByRole('button')).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^(Snooze|Dismiss)/ })).toHaveCount(0);

      // The nav item counts act-now plus needs-a-look rows.
      await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: /^Inbox\s*\d+/ })).toBeVisible();

      // An old notification link ?item=<key> sends you to that row's page.
      await page.goto(`/inbox?item=${emiKey}`);
      await page.waitForURL(`**/loans/${loan.id}?installment=1`);

      // A key that is no longer listed stays on the Inbox, with no error.
      await page.goto('/inbox?item=gone');
      await expect(page.getByTestId('inbox-section-act_now')).toBeVisible();
      await expect(page).toHaveURL(/\/inbox\?item=gone/);

      // Clicking a row opens its page.
      await page.goto('/inbox');
      await row(page, emiKey).click();
      await page.waitForURL(`**/loans/${loan.id}?installment=1`);
    } finally {
      await resetLlm(api);
      await setLlmMode(api, 'SCHEMA_DEFAULT');
    }
  });
});

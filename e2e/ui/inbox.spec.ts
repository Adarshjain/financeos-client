import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { resetLlm, setLlmMode } from '../fixtures/control';
import { istToday } from '../fixtures/dates';
import { BankSpec, genBankPdf } from '../fixtures/gen/statements';
import { createBankAccount } from '../fixtures/seed/accounts';
import { seedCardBill, seedDueSoonLoan } from '../fixtures/seed/obligations';
import { uploadAndIngest } from '../fixtures/seed/statements';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

// Synthetic statement: three rows that land in the review queue (a possible duplicate pair and one more).
const reviewSeedSpec: BankSpec = {
  bank: 'HDFC Bank',
  accountLast10: '7788990022',
  periodStart: '2026-04-01',
  periodEnd: '2026-04-30',
  opening: 50000.0,
  rows: [
    { date: '2026-04-05', description: 'SWIGGY ORDER BANGALORE', debit: 450.0 },
    { date: '2026-04-05', description: 'SWIGGY ORDER BANGALORE', debit: 450.0 },
    { date: '2026-04-12', description: 'UBER TRIP AIRPORT', debit: 1250.0 },
  ],
};

function row(page: Page, key: string) {
  return page.locator(`[data-inbox-key="${key}"]`);
}

function toastAction(page: Page, label: string) {
  return page.locator('[data-sonner-toast]').getByRole('button', { name: label }).first();
}

test.describe('Inbox UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-inbox');
    await loginContext(context, currentUser.cookie);
  });

  test('@mobile a user with nothing pending sees All clear with links onward', async ({ page }) => {
    await page.goto('/inbox');
    await expect(page.getByRole('heading', { name: 'Inbox', level: 1 })).toBeVisible();
    await expect(page.getByText('All clear')).toBeVisible();
    await expect(page.getByTestId('inbox-counts')).toHaveCount(0);
    await expect(page.locator('main').getByRole('link', { name: 'Upcoming', exact: true })).toHaveAttribute('href', '/upcoming');
    await expect(page.locator('main').getByRole('link', { name: 'Transactions', exact: true })).toHaveAttribute('href', '/transactions');
  });

  test('sections, item vs summary rows, snooze + undo, custom date, dismiss + undo, mark paid, deep links', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');

    // Seed: an EMI due in 3 days, a card bill due in 2 days, a review queue and a finished import job.
    const loan = await seedDueSoonLoan(api, 'Inbox Home Loan');
    const bill = await seedCardBill(api, { name: 'Inbox Card', last4: '7101', dueInDays: 2 });
    const bank = await createBankAccount(api, { name: 'Inbox Bank', openingBalance: reviewSeedSpec.opening });
    await uploadAndIngest(api, bank.id, [{ filename: 'inbox-review.pdf', buffer: await genBankPdf(reviewSeedSpec) }]);

    const emiKey = `emi:${loan.id}:1`;
    const billKey = `bill:${bill.statementId}`;
    const inboxKeys = async () => (await api.GET('/api/v1/inbox')).data!.items.map((i) => i.key);

    try {
      await page.goto('/inbox');
      await expect(page.getByRole('heading', { name: 'Inbox', level: 1 })).toBeVisible();

      // Sections: act now holds the EMI and the bill, needs a look holds the review summary, info the job.
      const actNow = page.getByTestId('inbox-section-act_now');
      await expect(actNow).toBeVisible();
      await expect(actNow.locator(`[data-inbox-key="${emiKey}"]`)).toBeVisible();
      await expect(actNow.locator(`[data-inbox-key="${billKey}"]`)).toBeVisible();
      await expect(page.getByTestId('inbox-section-needs_look').locator('[data-inbox-key="review"]')).toBeVisible();
      const jobRow = page.getByTestId('inbox-section-info').locator('[data-inbox-key^="job:"]').first();
      await expect(jobRow).toBeVisible();
      await expect(page.getByTestId('inbox-counts')).toContainText('to act');
      await expect(page.getByTestId('inbox-counts')).toContainText('to look');

      // Item row: EMI title, amount, Open link, snooze but no dismiss.
      const emiRow = row(page, emiKey);
      await expect(emiRow).toHaveAttribute('data-testid', 'inbox-item-row');
      await expect(emiRow).toContainText('Inbox Home Loan: EMI #1');
      await expect(emiRow.getByRole('link', { name: 'Open' })).toHaveAttribute('href', `/loans/${loan.id}?installment=1`);
      await expect(emiRow.getByRole('button', { name: /^Snooze / })).toBeVisible();
      await expect(emiRow.getByRole('button', { name: /^Dismiss / })).toHaveCount(0);

      // Bill row carries the card label and a Mark paid action.
      await expect(row(page, billKey)).toContainText('Inbox Card ••7101 bill');
      await expect(row(page, billKey).getByRole('button', { name: 'Mark paid' })).toBeVisible();

      // Summary row: a count behind one link; it can neither be snoozed nor (here) dismissed.
      const reviewRow = row(page, 'review');
      await expect(reviewRow).toHaveAttribute('data-testid', 'inbox-summary-row');
      await expect(reviewRow).toContainText('Transactions to review');
      await expect(reviewRow.getByRole('link', { name: 'Review' })).toHaveAttribute('href', '/transactions/review');
      await expect(reviewRow.getByRole('button', { name: /^Snooze / })).toHaveCount(0);

      // Job row: dismissable, not snoozable.
      await expect(jobRow.getByRole('button', { name: /^Snooze / })).toHaveCount(0);

      // The nav badge counts act-now plus needs-a-look rows.
      await expect(page.getByTestId('inbox-nav-badge').filter({ visible: true }).first()).toHaveText(/^\d+$/);

      // Snooze the EMI until tomorrow: the row disappears, the server hides it, Undo brings it back.
      await emiRow.getByRole('button', { name: /^Snooze / }).click();
      await page.getByRole('menuitem', { name: 'Tomorrow' }).click();
      await expectToast(page, /Snoozed until/);
      await expect(emiRow).toHaveCount(0);
      await expect.poll(inboxKeys).not.toContain(emiKey);
      await toastAction(page, 'Undo').click();
      await expectToast(page, 'Restored');
      await expect(emiRow).toBeVisible();
      await expect.poll(inboxKeys).toContain(emiKey);

      // Snooze to a custom date: a date that is not after today is refused, a later one is accepted.
      await emiRow.getByRole('button', { name: /^Snooze / }).click();
      await page.getByRole('menuitem', { name: 'Pick a date…' }).click();
      const dateDialog = page.getByRole('dialog');
      await expect(dateDialog.getByText('Snooze until')).toBeVisible();
      await dateDialog.locator('#inbox-snooze-until').fill(istToday());
      await dateDialog.getByRole('button', { name: 'Snooze', exact: true }).click();
      await expect(dateDialog.getByText('Pick a date after today')).toBeVisible();
      await dateDialog.locator('#inbox-snooze-until').fill(istToday(5));
      await dateDialog.getByRole('button', { name: 'Snooze', exact: true }).click();
      await expectToast(page, /Snoozed until/);
      await expect(emiRow).toHaveCount(0);
      await expect.poll(inboxKeys).not.toContain(emiKey);
      await toastAction(page, 'Undo').click();
      await expect(emiRow).toBeVisible();

      // Dismiss the finished job: it goes, and Undo restores it.
      const jobKey = (await jobRow.getAttribute('data-inbox-key'))!;
      await jobRow.getByRole('button', { name: /^Dismiss / }).click();
      await expectToast(page, 'Dismissed');
      await expect(row(page, jobKey)).toHaveCount(0);
      await expect.poll(inboxKeys).not.toContain(jobKey);
      await toastAction(page, 'Undo').click();
      await expect(row(page, jobKey)).toBeVisible();
      await expect.poll(inboxKeys).toContain(jobKey);

      // Mark the bill paid in place: the shared dialog, then the row leaves the inbox.
      await row(page, billKey).getByRole('button', { name: 'Mark paid' }).click();
      const payDialog = page.getByRole('dialog');
      await expect(payDialog.getByText('Mark bill as paid')).toBeVisible();
      await payDialog.getByRole('button', { name: 'Mark as paid' }).click();
      await expectToast(page, 'Bill marked as paid');
      await expect(row(page, billKey)).toHaveCount(0);
      await expect.poll(inboxKeys).not.toContain(billKey);

      // Deep link: ?item=<key> rings and scrolls to a listed row...
      await page.goto(`/inbox?item=${emiKey}`);
      await expect(row(page, emiKey)).toBeVisible();
      await expect(row(page, emiKey).locator('[class~="ring-emerald-500/40"]')).toHaveCount(1);
      await expect(row(page, 'review').locator('[class~="ring-emerald-500/40"]')).toHaveCount(0);
      await expect(page.getByTestId('inbox-handled-note')).toHaveCount(0);

      // ...and says so when the item is no longer listed.
      await page.goto(`/inbox?item=${billKey}`);
      await expect(page.getByTestId('inbox-handled-note')).toHaveText(/That item is already handled/);

      // The EMI row's Open action goes to the loan, on that installment.
      await row(page, emiKey).getByRole('link', { name: 'Open' }).click();
      await page.waitForURL(`**/loans/${loan.id}?installment=1`);
    } finally {
      await resetLlm(api);
      await setLlmMode(api, 'SCHEMA_DEFAULT');
    }
  });
});

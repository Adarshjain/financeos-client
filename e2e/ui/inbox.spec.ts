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

// Synthetic statement: the Swiggy row repeats in the overlapping statement below, so both copies are possible duplicates
// (the only reason a statement row waits for review now).
const reviewSeedSpec: BankSpec = {
  bank: 'HDFC Bank',
  accountLast10: '7788990022',
  periodStart: '2026-04-01',
  periodEnd: '2026-04-30',
  opening: 50000.0,
  rows: [
    { date: '2026-04-05', description: 'SWIGGY ORDER BANGALORE', debit: 450.0 },
    { date: '2026-04-12', description: 'UBER TRIP AIRPORT', debit: 1250.0 },
  ],
};

const reviewOverlapSpec: BankSpec = {
  ...reviewSeedSpec,
  periodStart: '2026-04-05',
  periodEnd: '2026-05-04',
  rows: [
    { date: '2026-04-05', description: 'SWIGGY ORDER BANGALORE', debit: 450.0 },
    { date: '2026-04-25', description: 'NETFLIX SUBSCRIPTION', debit: 649.0 },
  ],
};

/** A date as typed into a DateField: dd/mm/yyyy digits. */
const typed = (iso: string) => `${iso.slice(8, 10)}${iso.slice(5, 7)}${iso.slice(0, 4)}`;

function row(page: Page, key: string) {
  return page.locator(`[data-inbox-key="${key}"]`);
}

/** Where the review summary row sends you: Transactions filtered to the ones needing review. */
const REVIEW_HREF = '/transactions?review=needs_review';

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
    await expect(page).toHaveTitle('Inbox · FinanceOS');
    await expect(page.getByText('All clear')).toBeVisible();
    await expect(page.getByTestId('inbox-section-act_now')).toHaveCount(0);
    await expect(page.locator('main').getByRole('link', { name: 'Upcoming', exact: true })).toHaveAttribute('href', '/upcoming');
    await expect(page.locator('main').getByRole('link', { name: 'Transactions', exact: true })).toHaveAttribute('href', '/transactions');
  });

  test('sections, item vs summary rows, snooze + undo, custom date, dismiss + undo, mark paid, deep links', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    await resetLlm(api);
    await setLlmMode(api, 'SCHEMA_DEFAULT');

    // Seed: an EMI due in 3 days, a card bill due in 2 days and a review queue (the server builds no Info rows any more).
    const loan = await seedDueSoonLoan(api, 'Inbox Home Loan');
    const bill = await seedCardBill(api, { name: 'Inbox Card', last4: '7101', dueInDays: 2 });
    const bank = await createBankAccount(api, { name: 'Inbox Bank', openingBalance: reviewSeedSpec.opening });
    await uploadAndIngest(api, bank.id, [
      { filename: 'inbox-review.pdf', buffer: await genBankPdf(reviewSeedSpec) },
      { filename: 'inbox-review-overlap.pdf', buffer: await genBankPdf(reviewOverlapSpec) },
    ]);

    const emiKey = `emi:${loan.id}:1`;
    const billKey = `bill:${bill.statementId}`;
    const inboxKeys = async () => (await api.GET('/api/v1/inbox')).data!.items.map((i) => i.key);

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

      // Item row: EMI title, amount, Open link, snooze but no dismiss.
      const emiRow = row(page, emiKey);
            await expect(emiRow).toContainText('Inbox Home Loan: EMI #1');
      await expect(emiRow.getByRole('link', { name: 'Open' })).toHaveAttribute('href', `/loans/${loan.id}?installment=1`);
      await expect(emiRow.getByRole('button', { name: /^Snooze / })).toBeVisible();
      await expect(emiRow.getByRole('button', { name: /^Dismiss / })).toHaveCount(0);

      // Bill row carries the card label and a Mark paid action.
      await expect(row(page, billKey)).toContainText('Inbox Card ••7101 bill');
      await expect(row(page, billKey).getByRole('button', { name: 'Mark paid' })).toBeVisible();

      // Summary row: a count behind one link; it cannot be snoozed.
      const reviewRow = row(page, 'review');
      await expect(reviewRow).toContainText('Transactions to review');
      await expect(reviewRow.getByRole('link', { name: 'Review' })).toHaveAttribute('href', REVIEW_HREF);
      await expect(reviewRow.getByRole('button', { name: /^Snooze / })).toHaveCount(0);

      // The nav item counts act-now plus needs-a-look rows.
      await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: /^Inbox\s*\d+/ })).toBeVisible();

      // Snooze the EMI until tomorrow: the row disappears, the server hides it, Undo brings it back.
      await emiRow.getByRole('button', { name: /^Snooze / }).click();
      await page.getByRole('button', { name: /^Tomorrow/ }).click();
      await expectToast(page, /Snoozed until/);
      await expect(emiRow).toHaveCount(0);
      await expect.poll(inboxKeys).not.toContain(emiKey);
      await toastAction(page, 'Undo').click();
      await expectToast(page, 'Restored');
      await expect(emiRow).toBeVisible();
      await expect.poll(inboxKeys).toContain(emiKey);

      // Snooze to a custom date: a date that is not after today is refused, a later one is accepted.
      await emiRow.getByRole('button', { name: /^Snooze / }).click();
      await page.getByRole('button', { name: 'Pick a date…' }).click();
      const dateField = page.getByRole('textbox', { name: 'Snooze until' });
      await expect(dateField).toBeVisible();
      await dateField.fill(typed(istToday()));
      await page.getByRole('button', { name: 'Snooze', exact: true }).click();
      await expect(page.getByText('Pick a date after today')).toBeVisible();
      await dateField.fill(typed(istToday(5)));
      await page.getByRole('button', { name: 'Snooze', exact: true }).click();
      await expectToast(page, /Snoozed until/);
      await expect(emiRow).toHaveCount(0);
      await expect.poll(inboxKeys).not.toContain(emiKey);
      await toastAction(page, 'Undo').click();
      await expect(emiRow).toBeVisible();

      // Dismiss the review summary: it goes, and Undo restores it.
      await reviewRow.getByRole('button', { name: /^Dismiss / }).click();
      await expectToast(page, 'Dismissed');
      await expect(reviewRow).toHaveCount(0);
      await expect.poll(inboxKeys).not.toContain('review');
      await toastAction(page, 'Undo').click();
      await expect(reviewRow).toBeVisible();
      await expect.poll(inboxKeys).toContain('review');

      // Mark the bill paid in place: the shared dialog, then the row leaves the inbox.
      await row(page, billKey).getByRole('button', { name: 'Mark paid' }).click();
      const payDialog = page.getByRole('dialog', { name: 'Mark bill as paid' });
      await expect(payDialog).toBeVisible();
      await payDialog.getByRole('button', { name: 'Mark paid' }).click();
      await expectToast(page, 'Bill marked as paid');
      await expect(row(page, billKey)).toHaveCount(0);
      await expect.poll(inboxKeys).not.toContain(billKey);

      // Deep link: ?item=<key> rings and scrolls to a listed row...
      await page.goto(`/inbox?item=${emiKey}`);
      await expect(row(page, emiKey)).toBeVisible();
      await expect(row(page, emiKey)).toHaveClass(/bg-brand-tint/);
      await expect(row(page, 'review')).not.toHaveClass(/bg-brand-tint/);
      await expect(page.getByText('That item is already handled')).toHaveCount(0);

      // ...and says so when the item is no longer listed.
      await page.goto(`/inbox?item=${billKey}`);
      await expect(page.getByText('That item is already handled')).toBeVisible();

      // The EMI row's Open action goes to the loan, on that installment.
      await row(page, emiKey).getByRole('link', { name: 'Open' }).click();
      await page.waitForURL(`**/loans/${loan.id}?installment=1`);
    } finally {
      await resetLlm(api);
      await setLlmMode(api, 'SCHEMA_DEFAULT');
    }
  });
});

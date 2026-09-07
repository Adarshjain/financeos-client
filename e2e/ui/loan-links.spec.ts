import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount } from '../fixtures/seed/accounts';
import {
  addDays,
  addLending,
  createLoan,
  getLoan as getLoanDetail,
  monthsAgo,
  pay,
  schedule as getSchedule,
} from '../fixtures/seed/loans';
import { createTransaction } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';
import { openTransactions } from '../fixtures/ui';

/**
 * Searches the (already-open) TransactionPicker for `description` and clicks the
 * matching candidate row's "Select" button — mirrors the pattern in
 * e2e/ui/lending-links.spec.ts.
 */
async function pickTransactionCandidate(page: Page, description: string): Promise<void> {
  const searchInput = page.getByPlaceholder('Search by description or amount...');
  await searchInput.fill(description);
  const candidateRow = page
    .locator('div')
    .filter({ hasText: description })
    .filter({ has: page.getByRole('button', { name: 'Select' }) })
    .last();
  await expect(candidateRow.getByRole('button', { name: 'Select' })).toBeVisible();
  await candidateRow.getByRole('button', { name: 'Select' }).click();
}

test.describe('Loan Detail Dialogs Transaction Picker UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-loan-links');
    await loginContext(context, currentUser.cookie);
  });

  test('Settle Installment via picker: no raw ID input, picking the seeded DEBIT settles it, badge and Links section show the EMI ref (@mobile)', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const startDate = monthsAgo(3);
    const loanName = `Picker Settle Loan ${Date.now()}`;

    const bank = await createBankAccount(api, { name: 'Picker Settle Bank' });
    const loan = await createLoan(api, { name: loanName });
    // Same defaults as createLoan (principal 120000 / 12% / 12 months) give a fixed EMI of
    // 10661.85 for every installment (proven in e2e/ui/loans.spec.ts).
    const debitDescription = `Picker Settle Debit ${Date.now()}`;
    const debitTxn = await createTransaction(api, bank.id, {
      amount: -10661.85,
      date: addDays(startDate, 1),
      description: debitDescription,
    });

    await page.goto(`/loans/${loan.id}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: loanName })).toBeVisible();

    await page.getByRole('button', { name: 'Mark Paid' }).first().click();
    await expect(page.getByRole('heading', { name: /Settle Installment #1/i })).toBeVisible();

    // The shared TransactionPicker replaced the raw transaction-ID input.
    await expect(page.getByText('Transaction (Optional)')).toBeVisible();
    await expect(page.getByPlaceholder(/UUID of/i)).toHaveCount(0);
    await expect(page.getByPlaceholder('Search by description or amount...')).toBeVisible();

    await pickTransactionCandidate(page, debitDescription);

    // Amount/date already match the exact-EMI seeded transaction (pre-filled from the
    // installment itself when Mark Paid opened; the picker's own prefill-if-empty path is
    // exercised below in the Add Charge / Add Event dialogs, whose fields start empty).
    await expect(page.locator('#settle-payment-form input[type="number"]')).toHaveValue('10661.85');
    await expect(page.locator('#settle-payment-form input[type="date"]')).toHaveValue(startDate);

    await page.getByRole('button', { name: 'Confirm Settle' }).click();
    await expect(page.getByRole('button', { name: 'Unlink' }).first()).toBeVisible();

    await openTransactions(page);
    await expect(page.locator('main').getByText(debitDescription)).toBeVisible();
    await expect(page.locator('main').getByText(new RegExp(`EMI #1 · ${loanName}`))).toBeVisible();

    await page.locator('main').getByText(debitDescription).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByText('Ledger & loans')).toBeVisible();
    await expect(
      page.getByRole('dialog').getByText(new RegExp(`EMI #1 · ${loanName}`))
    ).toBeVisible();
  });

  test('Add Itemized Charge via picker: picking the seeded DEBIT prefills the amount, charge is listed with its badge', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const loanName = `Picker Charge Loan ${Date.now()}`;

    const bank = await createBankAccount(api, { name: 'Picker Charge Bank' });
    const loan = await createLoan(api, { name: loanName });
    const debitDescription = `Picker Charge Debit ${Date.now()}`;
    await createTransaction(api, bank.id, {
      amount: -2500,
      description: debitDescription,
    });

    await page.goto(`/loans/${loan.id}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Add Charge/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Add Itemized Charge' })).toBeVisible();

    const chargeTypeSelect = page.locator('#add-charge-form button[role="combobox"]').first();
    await chargeTypeSelect.click();
    await page.getByRole('option', { name: 'Processing Fee', exact: true }).click();

    await pickTransactionCandidate(page, debitDescription);
    await expect(page.locator('#add-charge-form input[type="number"]')).toHaveValue('2500');

    await page.getByRole('dialog').getByRole('button', { name: 'Add Charge' }).click();
    // Wait for the dialog to close (only happens on mutation success) before asserting on
    // "Processing Fee" text -- the charge-type Select trigger shows that same text the moment
    // it's picked, well before submission, so checking it while the dialog is still around
    // would pass without ever waiting for the charge to actually be saved.
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Processing Fee').first()).toBeVisible();

    await openTransactions(page);
    await expect(
      page.locator('main').getByText(new RegExp(`Processing fee · ${loanName}`))
    ).toBeVisible();
  });

  test('Record Lifecycle Event (Prepayment) via picker: picking the seeded DEBIT prefills the amount, schedule shortens, badge shows the ref', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const loanName = `Picker Prepay Loan ${Date.now()}`;

    const bank = await createBankAccount(api, { name: 'Picker Prepay Bank' });
    const loan = await createLoan(api, { name: loanName });
    // Effective date one month ago (not "today") is needed so reduce_tenure has enough
    // remaining schedule to actually shrink -- proven combination in e2e/api/loans.spec.ts's
    // "Events: prepayment tenure reduction..." test.
    const effectiveDate = monthsAgo(1);
    const debitDescription = `Picker Prepay Debit ${Date.now()}`;
    await createTransaction(api, bank.id, {
      amount: -20000,
      date: addDays(effectiveDate, 1),
      description: debitDescription,
    });

    const before = await getSchedule(api, loan.id);

    await page.goto(`/loans/${loan.id}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Add Event/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Record Lifecycle Event' })).toBeVisible();

    const eventTypeSelect = page.locator('#add-event-form button[role="combobox"]').first();
    await eventTypeSelect.click();
    await page.getByRole('option', { name: 'Prepayment', exact: true }).click();

    await page.locator('#add-event-form input[type="date"]').fill(effectiveDate);
    await pickTransactionCandidate(page, debitDescription);
    await expect(page.locator('#add-event-form input[type="number"]')).toHaveValue('20000');

    await page.getByRole('button', { name: 'Record Event' }).click();
    // Wait for the dialog to close (mutation success) before reading the schedule back --
    // the event-type Select trigger already shows "Prepayment" the moment it's picked, so
    // checking that text while the dialog is still up would race the POST /events call.
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText(/prepayment/i).first()).toBeVisible();

    const after = await getSchedule(api, loan.id);
    expect(after.installments.length).toBeLessThan(before.installments.length);

    await openTransactions(page);
    await expect(
      page.locator('main').getByText(new RegExp(`Prepayment · ${loanName}`))
    ).toBeVisible();
  });

  test('Exclusivity in the picker: a lending-linked DEBIT and a CREDIT are hidden from Mark Paid; a fresh unlinked DEBIT appears', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const startDate = monthsAgo(3);
    const loanName = `Picker Excl Loan ${Date.now()}`;
    const marker = `Excl${Date.now()}`;

    const bank = await createBankAccount(api, { name: 'Picker Excl Bank' });
    const loan = await createLoan(api, { name: loanName });

    const lendingLinkedTxn = await createTransaction(api, bank.id, {
      amount: -900,
      date: addDays(startDate, 2),
      description: `${marker} Linked Debit`,
    });
    await addLending(api, {
      newCounterpartyName: `${marker} Person`,
      direction: 'lent',
      amount: 900,
      entryDate: monthsAgo(1),
      transactionId: lendingLinkedTxn.id,
    });

    await createTransaction(api, bank.id, {
      amount: 900,
      date: addDays(startDate, 2),
      description: `${marker} Credit`,
    });
    await createTransaction(api, bank.id, {
      amount: -900,
      date: addDays(startDate, 2),
      description: `${marker} Fresh Debit`,
    });

    await page.goto(`/loans/${loan.id}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Mark Paid' }).first().click();
    await expect(page.getByRole('heading', { name: /Settle Installment #1/i })).toBeVisible();

    await page.getByPlaceholder('Search by description or amount...').fill(marker);

    await expect(page.getByRole('dialog').getByText(`${marker} Fresh Debit`)).toBeVisible();
    await expect(page.getByRole('dialog').getByText(`${marker} Linked Debit`)).toHaveCount(0);
    await expect(page.getByRole('dialog').getByText(`${marker} Credit`)).toHaveCount(0);
  });

  test('Rate change event: the picker has no type restriction (a CREDIT appears), saving without a transaction still works', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const loanName = `Picker RateChange Loan ${Date.now()}`;

    const bank = await createBankAccount(api, { name: 'Picker RateChange Bank' });
    const loan = await createLoan(api, { name: loanName });
    const creditDescription = `Picker RateChange Credit ${Date.now()}`;
    await createTransaction(api, bank.id, {
      amount: 500,
      description: creditDescription,
    });

    await page.goto(`/loans/${loan.id}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Add Event/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Record Lifecycle Event' })).toBeVisible();

    // Event type defaults to Rate Change; only the required rate needs filling.
    await page.locator('#add-event-form input[type="number"]').fill('9.5');

    await page.getByPlaceholder('Search by description or amount...').fill(creditDescription);
    await expect(page.getByRole('dialog').getByText(creditDescription)).toBeVisible();

    // Deliberately don't select it -- saving without a linked transaction must still work.
    await page.getByRole('button', { name: 'Record Event' }).click();
    // The event-type Select already shows "Rate Change" as soon as the dialog opens (it's the
    // default), so that text alone can't prove the save succeeded -- wait for the dialog to
    // close (only happens on mutation success) first.
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText(/rate change/i).first()).toBeVisible();

    const detail = await getLoanDetail(api, loan.id);
    const rateChangeEvent = detail.events.find((e) => e.eventType === 'rate_change');
    expect(rateChangeEvent).toBeDefined();
    expect(rateChangeEvent?.newAnnualRatePct).toBe(9.5);
    expect(rateChangeEvent?.transactionId ?? null).toBeNull();
  });

  test('Unlink from the transaction side reverts the settled installment to unpaid', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const loanName = `Picker Unlink Loan ${Date.now()}`;

    const bank = await createBankAccount(api, { name: 'Picker Unlink Bank' });
    const loan = await createLoan(api, { name: loanName });
    const debitDescription = `Picker Unlink Debit ${Date.now()}`;
    const debitTxn = await createTransaction(api, bank.id, { description: debitDescription });
    await pay(api, loan.id, { installmentSeq: 1, transactionId: debitTxn.id });

    await openTransactions(page);
    await page.locator('main').getByText(debitDescription).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(
      page.getByRole('dialog').getByText(new RegExp(`EMI #1 · ${loanName}`))
    ).toBeVisible();

    await page.getByRole('dialog').getByRole('button', { name: 'Unlink' }).click();
    await expect(page.getByText('Remove this settlement?')).toBeVisible();
    await page.getByRole('dialog').last().getByRole('button', { name: 'Unlink', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.goto(`/loans/${loan.id}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Unlink' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Mark Paid' }).first()).toBeVisible();
  });
});

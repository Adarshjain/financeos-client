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

/** dd/mm/yyyy (the typed form) from an ISO date. */
const typed = (iso: string) => iso.split('-').reverse().join('/');
/** dd/mm/yyyy (how the date field shows a value) from an ISO date. */
const shown = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/** Searches the (already-open) transaction picker for `description` and picks its row. */
async function pickTransactionCandidate(page: Page, description: string): Promise<void> {
  await page.getByPlaceholder('Search by description or amount').fill(description);
  const candidate = page.getByRole('radio', { name: description });
  await expect(candidate).toBeVisible();
  await candidate.click();
}

/** Opens a transaction's detail from /transactions and returns its dialog. */
async function openTransactionDetail(page: Page, description: string) {
  await page.goto('/transactions');
  await page.getByRole('row').filter({ hasText: description }).getByText(description).first().click();
  const dialog = page.getByRole('dialog', { name: description });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Opens the first overdue installment's Mark paid form and switches it to "Pick another bank debit". */
async function openPickDebit(page: Page) {
  await page.getByRole('button', { name: 'Mark paid', exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: /^Mark EMI #\d+ paid$/ });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('radio', { name: 'Pick another bank debit' }).click();
  return dialog;
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
    await createTransaction(api, bank.id, {
      amount: -10661.85,
      date: addDays(startDate, 1),
      description: debitDescription,
    });

    await page.goto(`/loans/${loan.id}`);
    await expect(page.getByText(loanName).first()).toBeVisible();

    const dialog = await openPickDebit(page);

    // The shared transaction picker replaced the raw transaction-ID input.
    await expect(dialog.getByText('Bank debit', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder(/UUID of/i)).toHaveCount(0);
    await expect(page.getByPlaceholder('Search by description or amount')).toBeVisible();

    await pickTransactionCandidate(page, debitDescription);

    // Amount and date come from the picked debit.
    await expect(dialog.getByRole('textbox', { name: /^Amount paid/ })).toHaveValue('10661.85');
    await expect(dialog.getByRole('textbox', { name: /^Paid on/ })).toHaveValue(shown(addDays(startDate, 1)));

    await dialog.getByRole('button', { name: 'Mark paid & link' }).click();
    await expect(dialog).not.toBeVisible();

    // The paid, linked row opens its EMI dialog, which offers Unlink.
    await page.getByRole('button').filter({ hasText: /Paid/ }).first().click();
    await expect(page.getByRole('dialog', { name: /^EMI #\d+$/ }).getByRole('button', { name: 'Unlink' })).toBeVisible();
    await page.keyboard.press('Escape');

    await page.goto('/transactions');
    const txRow = page.getByRole('row').filter({ hasText: debitDescription });
    await expect(txRow).toBeVisible();
    await expect(txRow.getByText(new RegExp(`EMI #1 · ${loanName}`)).filter({ visible: true }).first()).toBeVisible();

    await txRow.getByText(debitDescription).first().click();
    const detail = page.getByRole('dialog', { name: debitDescription });
    await expect(detail.getByText('Links', { exact: true })).toBeVisible();
    await expect(detail.getByText(new RegExp(`EMI #1 · ${loanName}`))).toBeVisible();
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
    await expect(page.getByText(loanName).first()).toBeVisible();

    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Charge' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add charge' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('combobox', { name: /^Charge type/ }).click();
    await page.getByRole('option', { name: 'Processing fee', exact: true }).click();

    await pickTransactionCandidate(page, debitDescription);
    await expect(dialog.getByRole('textbox', { name: /^Amount/ })).toHaveValue('2500');

    await dialog.getByRole('button', { name: 'Add charge' }).click();
    // The dialog closes only once the charge is saved, so wait for that before looking at the list:
    // the charge-type select already shows "Processing fee" the moment it is picked.
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText('Processing fee').first()).toBeVisible();

    await page.goto('/transactions');
    await expect(
      page.getByRole('row').filter({ hasText: debitDescription }).getByText(new RegExp(`Processing fee · ${loanName}`)).filter({ visible: true }).first(),
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
    await expect(page.getByText(loanName).first()).toBeVisible();

    await page.getByRole('button', { name: 'Prepay', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Record event' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('combobox', { name: /^Event type/ })).toContainText('Prepayment');

    await dialog.getByRole('textbox', { name: /^Effective date/ }).fill(typed(effectiveDate));
    await pickTransactionCandidate(page, debitDescription);
    await expect(dialog.getByRole('textbox', { name: /^Amount/ })).toHaveValue('20000');

    await dialog.getByRole('button', { name: 'Record event' }).click();
    // The event-type select already shows "Prepayment" once picked, so wait for the dialog to close
    // (it does so only on success) before reading the schedule back.
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText(/prepayment/i).first()).toBeVisible();

    const after = await getSchedule(api, loan.id);
    expect(after.installments.length).toBeLessThan(before.installments.length);

    await page.goto('/transactions');
    await expect(
      page.getByRole('row').filter({ hasText: debitDescription }).getByText(new RegExp(`Prepayment · ${loanName}`)).filter({ visible: true }).first(),
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
    await expect(page.getByText(loanName).first()).toBeVisible();

    const dialog = await openPickDebit(page);
    await page.getByPlaceholder('Search by description or amount').fill(marker);

    await expect(dialog.getByRole('radio', { name: `${marker} Fresh Debit` })).toBeVisible();
    await expect(dialog.getByText(`${marker} Linked Debit`)).toHaveCount(0);
    await expect(dialog.getByText(`${marker} Credit`)).toHaveCount(0);
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
    await expect(page.getByText(loanName).first()).toBeVisible();

    // The page's Add event opens the form on Rate change; only the required rate needs filling.
    await page.getByRole('button', { name: 'Add event', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Record event' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('combobox', { name: /^Event type/ })).toContainText('Rate change');
    await dialog.getByRole('textbox', { name: /^New annual rate/ }).fill('9.5');

    await page.getByPlaceholder('Search by description or amount').fill(creditDescription);
    await expect(dialog.getByRole('radio', { name: creditDescription })).toBeVisible();

    // Deliberately don't select it -- saving without a linked transaction must still work.
    await dialog.getByRole('button', { name: 'Record event' }).click();
    // The event-type select already shows "Rate change" as soon as the dialog opens (it's the
    // default), so wait for the dialog to close (only happens on success) first.
    await expect(dialog).not.toBeVisible();
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

    const detail = await openTransactionDetail(page, debitDescription);
    await expect(detail.getByText(new RegExp(`EMI #1 · ${loanName}`))).toBeVisible();

    await detail.getByRole('button', { name: 'Unlink' }).click();
    const confirm = page.getByRole('dialog', { name: 'Remove this settlement?' });
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Remove' }).click();
    await expect(confirm).not.toBeVisible();
    await expect(detail.getByText(new RegExp(`EMI #1 · ${loanName}`))).toHaveCount(0);

    await page.goto(`/loans/${loan.id}`);
    await expect(page.getByText(loanName).first()).toBeVisible();
    await expect(page.getByRole('button').filter({ hasText: /Paid/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Mark paid', exact: true }).first()).toBeVisible();
  });
});

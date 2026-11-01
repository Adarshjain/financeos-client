import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount } from '../fixtures/seed/accounts';
import { addDays, addLending, createCounterparty, createLoan, monthsAgo } from '../fixtures/seed/loans';
import { createTransaction } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

/** Opens a transaction's detail from /transactions and returns its dialog. */
async function openTransactionDetail(page: Page, description: string) {
  await page.goto('/transactions');
  await page.getByRole('row').filter({ hasText: description }).getByText(description).first().click();
  const dialog = page.getByRole('dialog', { name: description });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Closes the transaction panel and opens it again, so the Links section is read fresh. */
async function reopenTransactionDetail(page: Page, description: string) {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: description })).toHaveCount(0);
  await page.getByRole('row').filter({ hasText: description }).getByText(description).first().click();
  const dialog = page.getByRole('dialog', { name: description });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('Lending <-> Transaction Links UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-lending-links');
    await loginContext(context, currentUser.cookie);
  });

  test('Add Lending dialog has no raw transaction ID input; picking a seeded DEBIT links it and creates the entry (@mobile)', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const bank = await createBankAccount(api, { name: 'Picker Bank' });
    const debitTxn = await createTransaction(api, bank.id, {
      amount: -1500,
      description: `Picker Debit ${Date.now()}`,
    });

    await page.goto('/loans/lendings');
    await page.getByRole('button', { name: 'Add lending', exact: true }).filter({ visible: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Record ledger entry' });
    await expect(dialog).toBeVisible();

    // No raw transaction-ID input; the picker is present instead.
    await expect(page.getByText('Linked Transaction ID')).toHaveCount(0);
    await expect(dialog.getByText('Linked transaction (optional)')).toBeVisible();
    const searchInput = page.getByPlaceholder('Search by description or amount');
    await expect(searchInput).toBeVisible();

    // Add a new person via the picker
    const cpName = `Picker Person ${Date.now()}`;
    await dialog.getByRole('combobox', { name: /^Person/ }).click();
    await page.getByPlaceholder('Type a name').fill(cpName);
    await page.getByRole('button', { name: `Add "${cpName}"` }).click();
    // On the phone the person sheet stays open after Add (see report); close it, the new person stays picked.
    if (await page.getByPlaceholder('Type a name').isVisible()) await page.keyboard.press('Escape');
    await expect(dialog.getByRole('combobox', { name: /^Person/ })).toContainText(cpName);

    // Search for and select the seeded DEBIT transaction
    await searchInput.fill(debitTxn.description!);
    const candidate = dialog.getByRole('radio', { name: debitTxn.description! });
    await expect(candidate).toBeVisible();
    await candidate.click();

    // Picking a transaction fills the still-empty amount with its absolute value.
    await expect(dialog.getByRole('textbox', { name: /^Amount/ })).toHaveValue('1500');

    await dialog.getByRole('button', { name: 'Record entry' }).click();

    await expect(dialog).not.toBeVisible();
    await expect(page.getByText(cpName).first()).toBeVisible();

    // The new entry is linked to the picked transaction.
    await page.getByText(cpName).first().click();
    await expect(page.getByText('Linked', { exact: true }).first()).toBeVisible();
  });

  test('person page ledger: a linked row says Linked, an unlinked one does not; edit entry Remove drops the link', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const bank = await createBankAccount(api, { name: 'Ledger Column Bank' });
    const linkedTxn = await createTransaction(api, bank.id, {
      amount: -800,
      description: 'Ledger Linked Debit',
    });
    const cp = await createCounterparty(api, { name: `Ledger Column Person ${Date.now()}` });
    await addLending(api, {
      counterpartyId: cp.id,
      direction: 'lent',
      amount: 800,
      entryDate: monthsAgo(1),
      notes: 'LEDGER_LINKED_ROW_MARKER',
      transactionId: linkedTxn.id,
    });
    await addLending(api, {
      counterpartyId: cp.id,
      direction: 'lent',
      amount: 250,
      entryDate: monthsAgo(1),
      notes: 'LEDGER_PLAIN_ROW_MARKER',
    });

    await page.goto(`/loans/lendings/${cp.id}`);
    await expect(page.getByText(cp.name).first()).toBeVisible();

    const linkedRow = page.getByRole('button').filter({ hasText: 'LEDGER_LINKED_ROW_MARKER' });
    const unlinkedRow = page.getByRole('button').filter({ hasText: 'LEDGER_PLAIN_ROW_MARKER' });

    // The linked row carries the Linked word; the unlinked one does not.
    await expect(linkedRow.getByText('Linked', { exact: true })).toBeVisible();
    await expect(unlinkedRow.getByText('Linked', { exact: true })).toHaveCount(0);

    // Open the linked entry: its transaction is shown, and Remove drops the link.
    await linkedRow.click();
    const dialog = page.getByRole('dialog', { name: 'Edit ledger entry' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Ledger Linked Debit').first()).toBeVisible();
    await expect(dialog.getByText(bank.name).first()).toBeVisible();
    await dialog.getByRole('button', { name: 'Remove' }).click();
    await dialog.getByRole('button', { name: 'Save entry' }).click();

    await expect(dialog).not.toBeVisible();
    await expect(linkedRow.getByText('Linked', { exact: true })).toHaveCount(0);
  });

  test('/transactions row shows the "Lent · <name>" badge for a linked lending', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const bank = await createBankAccount(api, { name: 'Badge Bank' });
    const txn = await createTransaction(api, bank.id, {
      amount: -650,
      description: 'Badge Debit',
    });
    const cpName = `Badge Person ${Date.now()}`;
    await addLending(api, {
      newCounterpartyName: cpName,
      direction: 'lent',
      amount: 650,
      entryDate: monthsAgo(1),
      transactionId: txn.id,
    });

    await page.goto('/transactions');
    const row = page.getByRole('row').filter({ hasText: 'Badge Debit' });
    await expect(row).toBeVisible();
    await expect(row.getByText(`Lent · ${cpName}`).filter({ visible: true }).first()).toBeVisible();
  });

  test('transaction detail Link to… -> Lending entry -> New entry: Links section shows the ref, delete confirm mentions it, Unlink removes it', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const bank = await createBankAccount(api, { name: 'Detail Lending Bank' });
    await createTransaction(api, bank.id, {
      amount: -1200,
      description: 'Detail Link Debit',
    });

    const panel = await openTransactionDetail(page, 'Detail Link Debit');
    await panel.getByRole('button', { name: 'Link to…' }).click();
    const dialog = page.getByRole('dialog').filter({ has: page.getByRole('combobox', { name: /^Type/ }) });
    await dialog.getByRole('combobox', { name: /^Type/ }).click();
    await page.getByRole('option', { name: 'Lending entry', exact: true }).click();

    const cpName = `Detail Link Person ${Date.now()}`;
    await dialog.getByRole('combobox', { name: /^Person/ }).click();
    await page.getByPlaceholder('Type a name').fill(cpName);
    await page.getByRole('button', { name: `Add "${cpName}"` }).click();

    // Amount/date prefill from the subject transaction
    await expect(dialog.getByRole('textbox', { name: /^Amount/ })).toHaveValue('1200');

    await dialog.getByRole('button', { name: 'Record and link' }).click();
    await expect(dialog).not.toBeVisible();

    // Reopen the transaction detail: the Links section shows the ledger ref
    const reopened = await reopenTransactionDetail(page, 'Detail Link Debit');
    await expect(reopened.getByText('Links', { exact: true })).toBeVisible();
    await expect(reopened.getByText(`Lent · ${cpName}`)).toBeVisible();

    // Delete confirmation mentions the linked record
    await reopened.getByRole('button', { name: 'Delete' }).click();
    const confirm = page.getByRole('dialog', { name: /^Delete Detail Link Debit/ });
    await expect(confirm).toBeVisible();
    await expect(confirm.getByText(new RegExp(`1 linked record stays \\(Lent · ${cpName}\\) but loses the link`))).toBeVisible();
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirm).not.toBeVisible();

    // Unlink the ledger ref (no confirmation)
    await reopened.getByRole('button', { name: 'Unlink' }).click();
    await expect(reopened.getByText(`Lent · ${cpName}`)).toHaveCount(0);

    // Reopen: the ref is gone
    const again = await reopenTransactionDetail(page, 'Detail Link Debit');
    await expect(again.getByText(`Lent · ${cpName}`)).toHaveCount(0);
  });

  test('transaction detail Link to… -> Loan payment: Settle EMI, Unlink (confirm) removes it; disabled on CREDIT with the debit reason', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const bank = await createBankAccount(api, { name: 'Detail EMI Bank' });
    const loanName = `Detail EMI Loan ${Date.now()}`;
    await createLoan(api, { name: loanName });
    await createTransaction(api, bank.id, {
      amount: -5000,
      description: 'EMI Link Debit',
    });

    const panel = await openTransactionDetail(page, 'EMI Link Debit');
    await panel.getByRole('button', { name: 'Link to…' }).click();
    const dialog = page.getByRole('dialog').filter({ has: page.getByRole('combobox', { name: /^Type/ }) });
    await dialog.getByRole('combobox', { name: /^Type/ }).click();
    await page.getByRole('option', { name: 'Loan payment', exact: true }).click();

    await dialog.getByRole('combobox', { name: /^Loan/ }).click();
    await page.getByRole('option', { name: new RegExp(loanName) }).click();

    // An installment is picked for you; the primary action enables once ready.
    const settleBtn = dialog.getByRole('button', { name: /^Settle EMI/ });
    await expect(settleBtn).toBeEnabled();
    await settleBtn.click();
    await expect(dialog).not.toBeVisible();

    // Reopen: Links section shows the EMI ref
    const reopened = await reopenTransactionDetail(page, 'EMI Link Debit');
    await expect(reopened.getByText(new RegExp(`EMI #\\d+ · ${loanName}`))).toBeVisible();

    // Unlink requires confirmation
    await reopened.getByRole('button', { name: 'Unlink' }).click();
    const confirm = page.getByRole('dialog', { name: 'Remove this settlement?' });
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Remove' }).click();
    await expect(confirm).not.toBeVisible();

    // Reopen: EMI ref gone
    const again = await reopenTransactionDetail(page, 'EMI Link Debit');
    await expect(again.getByText(new RegExp(`EMI #\\d+ · ${loanName}`))).toHaveCount(0);
    await page.keyboard.press('Escape');

    // On a CREDIT transaction, Loan payment is disabled with the debit reason
    await createTransaction(api, bank.id, {
      amount: 900,
      description: 'EMI Disabled Credit',
    });
    const credit = await openTransactionDetail(page, 'EMI Disabled Credit');
    await credit.getByRole('button', { name: 'Link to…' }).click();
    const creditDialog = page.getByRole('dialog').filter({ has: page.getByRole('combobox', { name: /^Type/ }) });
    await creditDialog.getByRole('combobox', { name: /^Type/ }).click();
    await expect(page.getByText('Loan payments must be money-out (debit) transactions')).toBeVisible();
    await expect(page.getByRole('option', { name: /Loan payment/ })).toHaveAttribute('aria-disabled', 'true');
  });

  test('multi-select Link in the transactions browser disables Lending and Loan payment kinds', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const bank = await createBankAccount(api, { name: 'Multi Select Bank' });
    await createTransaction(api, bank.id, { amount: -100, description: 'Multi Select A' });
    await createTransaction(api, bank.id, { amount: -200, description: 'Multi Select B' });

    await page.goto('/transactions');
    await expect(page.getByRole('row').filter({ hasText: 'Multi Select A' })).toBeVisible();

    await page.getByRole('checkbox', { name: 'Select Multi Select A', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Select Multi Select B', exact: true }).click();
    await expect(page.getByText('2 selected')).toBeVisible();

    await page.getByRole('button', { name: 'Link', exact: true }).click();
    const dialog = page.getByRole('dialog').filter({ has: page.getByRole('combobox', { name: /^Type/ }) });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('combobox', { name: /^Type/ }).click();
    await expect(
      page.getByText(/Select a single transaction to record a lending, loan payment or dividend/i).first(),
    ).toBeVisible();
  });

  test('person page Matching card: Find matches lists the seeded candidate, Confirm all links it', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const bank = await createBankAccount(api, { name: 'Match Panel Bank' });
    const cp = await createCounterparty(api, { name: `Match Panel Person ${Date.now()}` });
    const entryDate = monthsAgo(1);

    await addLending(api, {
      counterpartyId: cp.id,
      direction: 'lent',
      amount: 1200,
      entryDate,
      notes: 'MATCH_TARGET_ENTRY',
    });
    // A second unlinked entry with no plausible candidate keeps the card mounted
    // after the first is confirmed.
    await addLending(api, {
      counterpartyId: cp.id,
      direction: 'lent',
      amount: 987654,
      entryDate,
      notes: 'NO_CANDIDATE_ENTRY',
    });

    const candidateDescription = `Match Panel Candidate ${Date.now()}`;
    await createTransaction(api, bank.id, {
      amount: -1205,
      date: addDays(entryDate, 1),
      description: candidateDescription,
    });

    await page.goto(`/loans/lendings/${cp.id}`);
    await expect(page.getByText(cp.name).first()).toBeVisible();
    await expect(page.getByText('Matching', { exact: true })).toBeVisible();
    await expect(page.getByText('0 of 2 entries')).toBeVisible();

    await page.getByRole('button', { name: 'Find matches' }).click();
    await expect(page.getByText(candidateDescription)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Link', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Confirm all' }).click();

    // The suggestion is linked: no Link button is left, and the card counts one linked entry.
    await expect(page.getByRole('button', { name: 'Link', exact: true })).toHaveCount(0);
    await expect(page.getByText('Linked', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('1 of 2 entries')).toBeVisible();
  });
});

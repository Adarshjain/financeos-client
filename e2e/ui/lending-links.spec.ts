import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount } from '../fixtures/seed/accounts';
import { addDays, addLending, createCounterparty, createLoan, monthsAgo } from '../fixtures/seed/loans';
import { createTransaction } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';
import { openTransactions } from '../fixtures/ui';

test.describe('Lending <-> Transaction Links UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-lending-links');
    await loginContext(context, currentUser.cookie);
  });

  test('Add Lending dialog has no raw transaction ID input; picking a seeded DEBIT prefills the amount and creates the entry (@mobile)', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const bank = await createBankAccount(api, { name: 'Picker Bank' });
    const debitTxn = await createTransaction(api, bank.id, {
      amount: -1500,
      description: `Picker Debit ${Date.now()}`,
    });

    await page.goto('/loans/lendings');
    await expect(page.getByRole('heading', { name: /Lendings Ledger/i })).toBeVisible();

    await page.getByRole('button', { name: /Add Lending/i }).filter({ visible: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Add Ledger Entry' })).toBeVisible();

    // No raw transaction-ID input; the picker is present instead.
    await expect(page.getByText('Linked Transaction ID')).toHaveCount(0);
    await expect(page.getByText('Linked Transaction (Optional)')).toBeVisible();
    const searchInput = page.getByPlaceholder('Search by description or amount...');
    await expect(searchInput).toBeVisible();

    // Pick the seeded person
    const cpSelect = page.locator('#add-lending-form button[role="combobox"]').first();
    await cpSelect.click();
    await page.getByRole('option', { name: '+ Add New Person', exact: true }).click();
    const cpName = `Picker Person ${Date.now()}`;
    await page.locator('#cpName').fill(cpName);

    // Search for and select the seeded DEBIT transaction
    await searchInput.fill(debitTxn.description!);
    const candidateRow = page
      .locator('div')
      .filter({ hasText: debitTxn.description! })
      .filter({ has: page.getByRole('button', { name: 'Select' }) })
      .last();
    await expect(candidateRow.getByRole('button', { name: 'Select' })).toBeVisible();
    await candidateRow.getByRole('button', { name: 'Select' }).click();

    // Amount auto-fills from the selected transaction
    await expect(page.locator('#amount')).toHaveValue('1500');

    await page.getByRole('button', { name: 'Save Entry' }).click();

    await expect(page.getByRole('heading', { name: 'Lendings Ledger (1)' })).toBeVisible();
    await expect(page.locator(`text="${cpName}" >> visible=true`).first()).toBeVisible();
  });

  test('person page ledger: unlinked row shows Link, linked row shows the transaction; edit entry Remove link reverts row to Link', async ({
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
    await expect(page.getByRole('heading', { name: cp.name })).toBeVisible();

    const linkedRow = page.locator('tr').filter({ hasText: 'LEDGER_LINKED_ROW_MARKER' });
    const unlinkedRow = page.locator('tr').filter({ hasText: 'LEDGER_PLAIN_ROW_MARKER' });

    // Linked row shows the transaction summary (account name), not a "Link" button
    await expect(linkedRow.getByText(bank.name)).toBeVisible();
    await expect(linkedRow.getByRole('button', { name: 'Link', exact: true })).toHaveCount(0);

    // Unlinked row shows the "Link" affordance
    await expect(unlinkedRow.getByRole('button', { name: 'Link', exact: true })).toBeVisible();

    // Edit the linked entry and remove its link
    await linkedRow.locator('td').last().getByRole('button').first().click();
    await expect(page.getByRole('heading', { name: 'Edit Ledger Entry' })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Remove' }).click();
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByRole('heading', { name: 'Edit Ledger Entry' })).toHaveCount(0);
    await expect(linkedRow.getByRole('button', { name: 'Link', exact: true })).toBeVisible();
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

    await openTransactions(page);
    await expect(page.locator('main').getByText('Badge Debit')).toBeVisible();
    await expect(page.locator('main').getByText(`Lent · ${cpName}`)).toBeVisible();
  });

  test('transaction detail Link to… -> Lending -> New entry: Links section shows the ref, delete confirm mentions it, Unlink removes it', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const bank = await createBankAccount(api, { name: 'Detail Lending Bank' });
    await createTransaction(api, bank.id, {
      amount: -1200,
      description: 'Detail Link Debit',
    });

    await openTransactions(page);
    await page.locator('main').getByText('Detail Link Debit').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: /Link to/ }).click();
    await page.getByRole('dialog').getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Lending (person ledger)', exact: true }).click();

    const cpSelect = page.locator('#lendingCpSelect');
    await cpSelect.click();
    await page.getByRole('option', { name: '+ Add new person', exact: true }).click();
    const cpName = `Detail Link Person ${Date.now()}`;
    await page.getByPlaceholder('e.g. Rahul Sharma').fill(cpName);

    // Amount/date prefill from the subject transaction
    await expect(page.locator('#lendingAmount')).toHaveValue('1200');

    await page.getByRole('button', { name: 'Save entry' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Reopen the transaction detail: Links section shows the ledger ref
    await page.locator('main').getByText('Detail Link Debit').click();
    await expect(page.getByRole('dialog').getByText('Ledger & loans')).toBeVisible();
    await expect(page.getByRole('dialog').getByText(`Lent · ${cpName}`)).toBeVisible();

    // Delete confirmation mentions the linked record
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Delete Transaction?')).toBeVisible();
    await expect(page.getByText(/linked to 1 loan\/lending record/i)).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).last().click();

    // Unlink the ledger ref (no confirmation) -> dialog closes
    await page.getByRole('dialog').getByRole('button', { name: 'Unlink' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Reopen: the ref is gone
    await page.locator('main').getByText('Detail Link Debit').click();
    await expect(page.getByRole('dialog').getByText(`Lent · ${cpName}`)).toHaveCount(0);
  });

  test('transaction detail Link to… -> Loan EMI payment: Settle installment, Unlink (confirm) removes it; disabled on CREDIT with the debit reason', async ({
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

    await openTransactions(page);
    await page.locator('main').getByText('EMI Link Debit').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: /Link to/ }).click();
    await page.getByRole('dialog').getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Loan EMI payment', exact: true }).click();

    await page.locator('#loanPaymentLoanSelect').click();
    await page.getByRole('option', { name: new RegExp(loanName) }).click();

    // Installment auto-selects; the primary action enables once ready.
    const settleBtn = page.getByRole('button', { name: 'Settle installment' });
    await expect(settleBtn).toBeEnabled();
    await settleBtn.click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Reopen: Links section shows the EMI ref
    await page.locator('main').getByText('EMI Link Debit').click();
    await expect(page.getByRole('dialog').getByText(new RegExp(`EMI #\\d+ · ${loanName}`))).toBeVisible();

    // Unlink requires confirmation
    await page.getByRole('dialog').getByRole('button', { name: 'Unlink' }).click();
    await expect(page.getByText('Remove this settlement?')).toBeVisible();
    await page.getByRole('dialog').last().getByRole('button', { name: 'Unlink', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Reopen: EMI ref gone
    await page.locator('main').getByText('EMI Link Debit').click();
    await expect(page.getByRole('dialog').getByText(new RegExp(`EMI #\\d+ · ${loanName}`))).toHaveCount(0);
    await page.keyboard.press('Escape');

    // On a CREDIT transaction, Loan EMI payment is disabled with the debit reason
    await createTransaction(api, bank.id, {
      amount: 900,
      description: 'EMI Disabled Credit',
    });
    await page.reload();
    await page.locator('main').getByText('EMI Disabled Credit').click();
    await page.getByRole('button', { name: /Link to/ }).click();
    await expect(
      page.getByText(/Loan EMI payment: Loan payments must be money-out \(debit\) transactions/i)
    ).toBeVisible();
  });

  test('multi-select "Link (N)" in the transactions browser disables Lending and Loan EMI payment kinds', async ({
    page,
  }) => {
    const api = makeApi(currentUser.cookie);
    const bank = await createBankAccount(api, { name: 'Multi Select Bank' });
    const txnA = await createTransaction(api, bank.id, { amount: -100, description: 'Multi Select A' });
    const txnB = await createTransaction(api, bank.id, { amount: -200, description: 'Multi Select B' });

    await openTransactions(page);
    await expect(page.locator('main').getByText('Multi Select A')).toBeVisible();

    await page.getByRole('button', { name: 'Link', exact: true }).click();

    await page.locator(`#select-${txnA.id}`).locator('xpath=..').click();
    await page.locator(`#select-${txnB.id}`).locator('xpath=..').click();

    await page.getByRole('button', { name: 'Link (2)' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await expect(
      page.getByText(/Select a single transaction to record a lending or loan payment/i).first()
    ).toBeVisible();
  });

  test('person page Transaction Matching panel: Find Matches lists the seeded candidate, Confirm links it and the row disappears', async ({
    page,
  }) => {
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
    // A second unlinked entry with no plausible candidate keeps the panel mounted
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
    await expect(page.getByRole('heading', { name: cp.name })).toBeVisible();
    await expect(page.getByText('Transaction Matching')).toBeVisible();

    await page.getByRole('button', { name: 'Find Matches' }).click();
    await expect(page.getByText(candidateDescription)).toBeVisible();

    const matchRow = page.locator('tr').filter({ hasText: 'MATCH_TARGET_ENTRY' }).first();
    await expect(matchRow.getByRole('button', { name: 'Link', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Confirm', exact: true }).click();

    await expect(page.getByText(candidateDescription)).toHaveCount(0);
    await expect(matchRow.getByRole('button', { name: 'Link', exact: true })).toHaveCount(0);
  });
});

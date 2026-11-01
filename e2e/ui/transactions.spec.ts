import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createTransaction } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

const row = (page: Page, text: string | RegExp) => page.getByRole('row').filter({ hasText: text });

/** Opens the Transactions list once its first row (or empty state) is on screen. */
async function openTransactions(page: Page, search = ''): Promise<void> {
  await page.goto(`/transactions${search}`);
  await expect(page.getByRole('row').filter({ hasText: /\S/ }).or(page.getByText('No transactions yet')).first()).toBeVisible({ timeout: 45_000 });
}

test.describe('Transactions UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    // Unique user per UI test for isolation
    currentUser = await createUser(request, 'ui-txns');
    await loginContext(context, currentUser.cookie);
  });

  test('filter bar: filter by account, clear filters', async ({ page }) => {
    const api = makeApi(currentUser.cookie);

    const bankA = await createBankAccount(api, { name: 'Alpha Bank' });
    const bankB = await createBankAccount(api, { name: 'Beta Bank' });
    await createTransaction(api, bankA.id, { description: 'Morning Coffee Alpha', amount: -150 });
    await createTransaction(api, bankB.id, { description: 'Evening Snacks Beta', amount: -250 });

    await openTransactions(page);
    await expect(row(page, 'Morning Coffee Alpha')).toBeVisible();
    await expect(row(page, 'Evening Snacks Beta')).toBeVisible();

    // Filter by account through the Account chip (a searchable list)
    await page.getByRole('button', { name: 'Account', exact: true }).click();
    await page.getByRole('option', { name: /Alpha Bank/ }).click();
    await page.getByRole('button', { name: /Done/ }).click();
    await expect(page.getByRole('button', { name: /Alpha Bank/ }).first()).toBeVisible();
    await expect(row(page, 'Morning Coffee Alpha')).toBeVisible();
    await expect(row(page, 'Evening Snacks Beta')).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get('account')).toBeTruthy();

    // Clear all filters
    await page.getByRole('button', { name: /Reset|Clear/ }).first().click();
    await expect(row(page, 'Evening Snacks Beta')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Account', exact: true })).toBeVisible();
  });

  test('detail panel opens on row; the exclude switch marks the transaction Excluded', async ({ page }) => {
    const api = makeApi(currentUser.cookie);

    const bank = await createBankAccount(api, { name: 'Exclude UI Bank' });
    await createTransaction(api, bank.id, {
      description: 'Transaction to Exclude',
      amount: -450,
      isTransactionExcluded: false,
    });

    await openTransactions(page);
    await row(page, 'Transaction to Exclude').getByText('Transaction to Exclude').click();

    // Detail panel opens and shows the account and where the entry came from
    const panel = page.getByRole('dialog', { name: 'Transaction to Exclude' });
    await expect(panel.getByText('Exclude UI Bank').first()).toBeVisible();
    await expect(panel.getByText('Manual Entry')).toBeVisible();

    // Edit to toggle exclude
    await panel.getByRole('button', { name: 'Edit', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit transaction' });
    // The toggle is a switch named by its row's label: pressing the label flips it.
    await dialog.getByText('Exclude transaction', { exact: true }).click();
    await dialog.getByRole('button', { name: 'Save transaction', exact: true }).click();
    await expect(dialog).not.toBeVisible();

    // Open detail again and verify the Excluded status is shown
    await row(page, 'Transaction to Exclude').getByText('Transaction to Exclude').click();
    await expect(page.getByRole('dialog', { name: 'Transaction to Exclude' }).getByText('Excluded', { exact: true })).toBeVisible();
  });

  test('cross-module: transaction creation updates balance on /accounts', async ({ page }) => {
    const api = makeApi(currentUser.cookie);

    // Create Bank Account with openingBalance 5000
    await createBankAccount(api, { name: 'Cross Module Bank', openingBalance: 5000 });

    // 1. Visit /accounts: verify balance shows 5,000
    await page.goto('/accounts');
    const bankRow = page.getByRole('button', { name: /Cross Module Bank/ });
    await expect(bankRow).toBeVisible();
    await expect(bankRow).toContainText('5,000');

    // 2. Go to /transactions and add a debit of 1500 (a new transaction is a debit by default)
    await openTransactions(page);
    await page.getByRole('button', { name: 'Add transaction', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add transaction' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('textbox', { name: 'Amount', exact: true }).fill('1500');
    await dialog.getByRole('textbox', { name: 'Description' }).fill('Cross Module Debit');
    await dialog.getByRole('combobox', { name: /^Account/ }).click();
    await page.getByRole('option', { name: /Cross Module Bank/ }).click();
    await dialog.getByRole('button', { name: 'Add transaction' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(row(page, 'Cross Module Debit')).toBeVisible();

    // 3. Return to /accounts: verify balance updated (5000 - 1500 = 3500)
    await page.goto('/accounts');
    await expect(page.getByRole('button', { name: /Cross Module Bank/ })).toContainText('3,500');
  });

  test('with no accounts, the page and the add dialog both lead to adding one inline (@mobile)', async ({ page }) => {
    // Fresh user: no accounts at all.
    await openTransactions(page);

    // The list's empty state points at the real first step, not at "add a transaction".
    await expect(page.locator('main').getByText('Transactions belong to an account. Add your first one to get started.')).toBeVisible();

    // The add dialog still opens, and replaces the empty picker with an inline add-account action.
    await page.getByRole('button', { name: 'Add transaction', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add transaction' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('textbox', { name: 'Amount', exact: true }).fill('275.50');
    await expect(dialog.getByText('No account to record this against yet')).toBeVisible();
    await dialog.getByRole('button', { name: 'Add account' }).click();

    // Inline account form. (Open question for the owner: Legacy hid the Broker type here, since a transaction cannot be
    // recorded against one; Dinero's Add account still offers it, so that Legacy assertion is not carried over.)
    const accountDialog = page.getByRole('dialog', { name: 'Add account' });
    await expect(accountDialog).toBeVisible();
    await accountDialog.getByRole('radio', { name: 'Wallet / cash' }).click();
    await accountDialog.getByRole('textbox', { name: /^Account name/ }).fill('Inline Wallet');
    await accountDialog.getByRole('button', { name: 'Add account' }).click();
    await expect(accountDialog).not.toBeVisible({ timeout: 30_000 });

    // Back on the same draft: the amount typed earlier survives and the new account is selected.
    await expect(dialog.getByRole('combobox', { name: /^Account/ })).toContainText('Inline Wallet');
    await expect(dialog.getByRole('textbox', { name: 'Amount', exact: true })).toHaveValue('275.50');
    await dialog.getByRole('textbox', { name: 'Description' }).fill('Inline Account Lunch');
    await dialog.getByRole('button', { name: 'Add transaction' }).click();
    await expect(dialog).not.toBeVisible();

    await expect(row(page, 'Inline Account Lunch')).toBeVisible();
    await expect(row(page, 'Inline Account Lunch')).toContainText('Inline Wallet');
  });
});

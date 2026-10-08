import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount, createGenericAccount } from '../fixtures/seed/accounts';
import { seedCardBill } from '../fixtures/seed/obligations';
import { createTransaction } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';
import { openAccounts } from '../fixtures/ui';

/** The page's own Edit button: a server-rendered dialog trigger, so a click before hydration is dropped. */
async function openEditDialog(page: Page): Promise<void> {
  await expect(async () => {
    await page.locator('main').getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(page.getByLabel('Account Name')).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 15000 });
}

test.describe('Account page /accounts/[id] (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-account-detail');
    await loginContext(context, currentUser.cookie);
  });

  test('credit card: opened from its tile, with overview, bills, earning rules, transactions and actions', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const bill = await seedCardBill(api, { name: 'Hub Card', last4: '7301', dueInDays: 4 });

    await openAccounts(page);
    await page.getByRole('link', { name: /Hub Card/ }).click();
    await page.waitForURL(`**/accounts/${bill.cardId}`);

    const main = page.locator('main');
    await expect(main.getByRole('heading', { name: 'Hub Card', level: 1 })).toBeVisible();
    await expect(main.getByText('Credit card · •••• 7301')).toBeVisible();
    await expect(main.getByRole('link', { name: /Accounts/ })).toHaveAttribute('href', '/accounts');

    // Overview: limit and utilisation for a card.
    await expect(main.getByText('Overview', { exact: true })).toBeVisible();
    await expect(main.getByText('Credit limit')).toBeVisible();
    await expect(main.getByText(/Utilisation/)).toBeVisible();

    // Bills: the same widget as Home, scoped to this card.
    await expect(main.getByText('Bills', { exact: true })).toBeVisible();
    const widget = main.getByTestId('bills-due-widget');
    await expect(widget.locator(`[data-account-id="${bill.cardId}"]`)).toBeVisible();
    await expect(widget.locator(`[data-account-id="${bill.cardId}"]`)).toHaveAttribute('data-statement-id', bill.statementId);

    // Earning rules and recent transactions.
    await expect(main.getByText('Earning rules')).toBeVisible();
    await expect(main.getByRole('link', { name: 'Manage rules' })).toHaveAttribute('href', `/rewards/rules?account=${bill.cardId}`);
    await expect(main.getByText('Recent transactions')).toBeVisible();
    await expect(main.getByText(/AMAZON/i).first()).toBeVisible();

    // Actions: Edit, Statements, Import.
    await expect(main.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Statements', exact: true })).toBeVisible();
    await main.getByRole('link', { name: 'Import', exact: true }).click();
    await page.waitForURL(`**/transactions/import?account=${bill.cardId}`);
    await expect(page.getByRole('heading', { name: 'Import statements', exact: true })).toBeVisible();
  });

  test('@mobile bank account: no Bills section, recent transactions, edit in place', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const bank = await createBankAccount(api, { name: 'Hub Bank', last4: '4411', openingBalance: 5000 });
    await createTransaction(api, bank.id, { amount: -250, description: 'Hub coffee purchase' });

    await openAccounts(page);
    await page.getByRole('link', { name: /Hub Bank/ }).click();
    await page.waitForURL(`**/accounts/${bank.id}`);

    const main = page.locator('main');
    await expect(main.getByRole('heading', { name: 'Hub Bank', level: 1 })).toBeVisible();
    await expect(main.getByText('Bank account · •••• 4411')).toBeVisible();
    await expect(main.getByText('Overview', { exact: true })).toBeVisible();
    await expect(main.getByText('Bills', { exact: true })).toHaveCount(0);
    await expect(main.getByText('Earning rules')).toBeVisible();
    await expect(main.getByText('Hub coffee purchase')).toBeVisible();

    // Editing from the page refreshes the heading in place.
    await openEditDialog(page);
    await page.getByLabel('Account Name').fill('Hub Bank Renamed');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(main.getByRole('heading', { name: 'Hub Bank Renamed', level: 1 })).toBeVisible();
  });

  test('wallet account: no ingest actions, and deleting it from its page returns to the list', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const wallet = await createGenericAccount(api, { name: 'Hub Wallet' });

    await page.goto(`/accounts/${wallet.id}`);
    const main = page.locator('main');
    await expect(main.getByRole('heading', { name: 'Hub Wallet', level: 1 })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Statements', exact: true })).toHaveCount(0);
    await expect(main.getByRole('link', { name: 'Import', exact: true })).toHaveCount(0);
    await expect(main.getByText('No transactions yet')).toBeVisible();

    await openEditDialog(page);
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('dialog').getByText('Are you sure you want to delete')).toBeVisible();
    await page.getByRole('button', { name: 'Delete Permanently' }).click();

    // The detail route is a 404 once the account is gone, so the page leaves for the list.
    await page.waitForURL(/\/accounts$/);
    await expect(page.getByRole('heading', { name: 'Accounts', level: 1 })).toBeVisible();
  });

  test('an unknown account id is a 404', async ({ page }) => {
    await page.goto('/accounts/00000000-0000-0000-0000-000000000000');
    await expect(page.getByText('Page not found')).toBeVisible();
  });
});

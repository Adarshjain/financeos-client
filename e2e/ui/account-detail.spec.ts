import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount, createGenericAccount } from '../fixtures/seed/accounts';
import { seedCardBill } from '../fixtures/seed/obligations';
import { createRewardRule } from '../fixtures/seed/rewards';
import { createTransaction } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

test.describe('Account page /accounts/[id] (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-account-detail');
    await loginContext(context, currentUser.cookie);
  });

  test('credit card: opened from its row, with overview, bills, earning rules, transactions and actions', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const bill = await seedCardBill(api, { name: 'Hub Card', last4: '7301', dueInDays: 4 });
    await createRewardRule(api, bill.cardId, { name: 'Hub 2% Rule', accrualType: 'PERCENT', percentRate: 2.0 });

    await page.goto('/accounts');
    await page.getByRole('button', { name: /Hub Card/ }).click();
    await page.waitForURL(`**/accounts/${bill.cardId}`);

    const main = page.locator('main');
    await expect(page.getByRole('banner').getByText('Hub Card', { exact: true })).toBeVisible();
    await expect(page.getByRole('banner').getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/accounts');
    await expect(main.getByRole('tablist').getByRole('tab')).toHaveText(['Overview', 'Statements', 'Cards', 'Rewards']);

    // Limit and utilisation for a card.
    await expect(main.getByText('Limit & cycle')).toBeVisible();
    await expect(main.getByText('Limit used').first()).toBeVisible();

    // Bills: the card's statement, with a link to all of them.
    await expect(main.getByText('Bills', { exact: true })).toBeVisible();
    await expect(main.getByRole('link', { name: 'View all' }).first()).toHaveAttribute('href', `/accounts/${bill.cardId}/statements`);

    // Earning rules and recent transactions.
    await expect(main.getByText('Rewards', { exact: true }).first()).toBeVisible();
    await expect(main.getByRole('link', { name: 'Rules', exact: true })).toHaveAttribute('href', `/rewards/rules?account=${bill.cardId}`);
    await expect(main.getByText('Recent transactions')).toBeVisible();
    await expect(main.getByText(/AMAZON/i).first()).toBeVisible();

    // Actions: Edit, Statements.
    await expect(main.getByRole('button', { name: 'Edit', exact: true }).first()).toBeVisible();
    await main.getByRole('tab', { name: 'Statements' }).click();
    await page.waitForURL(`**/accounts/${bill.cardId}/statements`);
  });

  test('@mobile bank account: no Bills section, recent transactions, edit in place', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const bank = await createBankAccount(api, { name: 'Hub Bank', last4: '4411', openingBalance: 5000, bank: 'hdfc' });
    await createTransaction(api, bank.id, { amount: -250, description: 'Hub coffee purchase' });

    await page.goto('/accounts');
    await page.getByRole('button', { name: /Hub Bank/ }).click();
    await page.waitForURL(`**/accounts/${bank.id}`);

    const main = page.locator('main');
    await expect(page.getByRole('banner').getByText('Hub Bank', { exact: true })).toBeVisible();
    await expect(main.getByText('Bills', { exact: true })).toHaveCount(0);
    await expect(main.getByText('Recent transactions')).toBeVisible();
    await expect(main.getByText('Hub coffee purchase')).toBeVisible();

    // Editing from the page refreshes the title in place.
    await main.getByRole('button', { name: 'Edit', exact: true }).first().click();
    const edit = page.getByRole('dialog', { name: 'Edit account' });
    await edit.getByRole('textbox', { name: /^Account name/ }).fill('Hub Bank Renamed');
    await edit.getByRole('button', { name: 'Save account' }).click();
    await expect(edit).not.toBeVisible();
    await expect(page.getByRole('banner').getByText('Hub Bank Renamed', { exact: true })).toBeVisible();
  });

  test('wallet account: no ingest tabs, and deleting it from its page returns to the list', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const wallet = await createGenericAccount(api, { name: 'Hub Wallet' });

    await page.goto(`/accounts/${wallet.id}`);
    const main = page.locator('main');
    await expect(page.getByRole('banner').getByText('Hub Wallet', { exact: true })).toBeVisible();
    await expect(main.getByRole('tab', { name: 'Statements' })).toHaveCount(0);
    await expect(main.getByRole('tab', { name: 'Cards' })).toHaveCount(0);
    await expect(main.getByText('No transactions yet')).toBeVisible();

    await main.getByRole('button', { name: 'Edit', exact: true }).first().click();
    const edit = page.getByRole('dialog', { name: 'Edit account' });
    await edit.getByRole('button', { name: 'Delete account' }).click();
    const confirm = page.getByRole('dialog', { name: 'Delete Hub Wallet?' });
    await expect(confirm.getByText(/can't be undone/)).toBeVisible();
    await confirm.getByRole('button', { name: 'Delete', exact: true }).click();

    // The detail route is a 404 once the account is gone, so the page leaves for the list.
    await page.waitForURL(/\/accounts$/);
    await expect(page.getByRole('banner').getByText('Accounts', { exact: true }).first()).toBeVisible();
  });

  test('an unknown account id is a 404', async ({ page }) => {
    await page.goto('/accounts/00000000-0000-0000-0000-000000000000');
    await expect(page.getByText(/Account not found|not found/i).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to accounts' })).toBeVisible();
  });
});

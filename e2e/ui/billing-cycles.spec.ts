import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { istToday } from '../fixtures/dates';
import { createBankAccount, createCreditCard } from '../fixtures/seed/accounts';
import { createTransaction } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

test.describe('Billing-cycle reports UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-billing-cycles');
    await loginContext(context, currentUser.cookie);
  });

  test('a Transactions KPI on "This billing cycle" needs one account and then counts that card only', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const today = istToday();
    // No statements: the card's cycle is the calendar month. The bank account has no cycle.
    const card = await createCreditCard(api, { name: 'UI Cycle Card' });
    await createTransaction(api, card.id, { amount: -1250, date: today, description: 'Cycle spend' });
    const bank = await createBankAccount(api, { name: 'UI Cycle Bank' });
    await createTransaction(api, bank.id, { amount: -800, date: today, description: 'Bank spend' });

    await page.goto('/reports/new');
    await expect(page.getByRole('heading', { name: 'Create Report' })).toBeVisible();
    await page.getByPlaceholder('Report name').fill('Card spend this cycle');

    // A new filter row starts on the first field (Amount); switch it to Date.
    await page.getByRole('button', { name: /Add filter rule/i }).click();
    await page.getByRole('combobox').filter({ hasText: 'Amount' }).last().click();
    await page.getByRole('option', { name: 'Date', exact: true }).click();
    await page.getByRole('combobox').filter({ hasText: /^Is$/ }).last().click();
    await expect(page.getByRole('option', { name: 'Previous billing cycle' })).toBeVisible();
    await page.getByRole('option', { name: 'This billing cycle' }).click();

    await page.getByRole('combobox').filter({ hasText: /None|Select measure/i }).first().click();
    await page.getByRole('option', { name: 'Amount' }).click();

    // Billing cycles differ per account, so the builder asks for exactly one account first.
    await expect(page.getByText(/Billing cycles differ per account/)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Preview$|Refresh preview/i }).first()).toBeDisabled();

    await page.getByRole('button', { name: /Add filter rule/i }).click();
    await page.getByRole('combobox').filter({ hasText: 'Amount' }).last().click();
    await page.getByRole('option', { name: 'Account', exact: true }).click();
    await page.getByRole('combobox').filter({ hasText: 'Select option…' }).last().click();
    await page.getByRole('option', { name: 'UI Cycle Card' }).click();

    await expect(page.getByText(/Billing cycles differ per account/)).toHaveCount(0);
    await page.getByRole('button', { name: /^Preview$|Refresh preview/i }).first().click();
    await expect(page.getByText(/-?₹1,250\.00/).first()).toBeVisible();
  });
});

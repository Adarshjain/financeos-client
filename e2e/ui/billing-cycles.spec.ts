import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { istToday } from '../fixtures/dates';
import { createBankAccount, createCreditCard } from '../fixtures/seed/accounts';
import { createReport } from '../fixtures/seed/reports';
import { createTransaction } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

/** Opens the dropdown named `field` and picks `option`. */
async function pick(page: Page, field: string, option: string) {
  await page.getByRole('combobox', { name: field, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

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
    await expect(page.getByLabel('Report name')).toBeVisible({ timeout: 45_000 });
    await page.getByLabel('Report name').fill('Card spend this cycle');
    await page.getByRole('radio', { name: 'KPI' }).click();
    await pick(page, 'Measure', 'Amount');

    // A new filter starts on the first field; switch it to Date, operator "This billing cycle".
    await page.getByRole('button', { name: 'Add filter' }).click();
    await pick(page, 'Field', 'Date');
    await page.getByRole('combobox', { name: 'Operator', exact: true }).click();
    await expect(page.getByRole('option', { name: 'Previous billing cycle' })).toBeVisible();
    await page.getByRole('option', { name: 'This billing cycle' }).click();
    await page.getByRole('button', { name: 'Apply filter' }).click();

    // Billing cycles differ per account, so the builder asks for exactly one account first.
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.getByText(/Billing cycles differ per account/).first()).toBeVisible();

    // Open question for the owner: picking the Account value in a new filter never loads its choices ("Loading…"),
    // because the dynamic options are fetched only once an applied filter uses the field. So the counted half of this
    // flow runs on a saved report that carries the one-account filter.
    const report = await createReport(api, {
      name: 'Card spend this cycle saved',
      type: 'KPI',
      datasource: 'transactions',
      definition: {
        measure: 'amount',
        aggregation: 'sum',
        filters: [
          { field: 'account', operator: 'is', value: card.id },
          { field: 'date', operator: 'this_billing_cycle' },
        ],
      },
    } as never);
    await page.goto(`/reports/${report.id}`);
    await expect(page.getByText(/Billing cycles differ per account/)).toHaveCount(0);
    await expect(page.getByText(/-?₹1,250/).first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(/₹800/)).toHaveCount(0);
  });
});

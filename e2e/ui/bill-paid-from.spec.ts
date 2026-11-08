import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { istToday } from '../fixtures/dates';
import { createBankAccount } from '../fixtures/seed/accounts';
import { seedCardBill } from '../fixtures/seed/obligations';
import { createTransaction } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

test.describe('Mark paid: Paid from (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-paid-from');
    await loginContext(context, currentUser.cookie);
  });

  test('a found bank debit is preselected, and the paid bill shows where it was paid from', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const bill = await seedCardBill(api, { name: 'From Card', last4: '5601' });
    const bank = await createBankAccount(api, { name: 'From Bank', last4: '5602' });
    await createTransaction(api, bank.id, { amount: -6000, date: istToday(-1), description: 'UPI CARD BILL PAYMENT' });

    await page.goto(`/accounts/${bill.cardId}`);
    const main = page.locator('main');
    await main.getByRole('button', { name: 'Mark paid' }).click();
    const dialog = page.getByRole('dialog', { name: 'Mark bill as paid' });
    await expect(dialog.getByRole('combobox', { name: /Paid from/ })).toContainText('From Bank');
    await expect(dialog.getByLabel('Paid on')).toBeDisabled();

    await dialog.getByRole('button', { name: 'Mark paid' }).click();
    await expect(dialog).toBeHidden();
    await expect(main.getByText(/Paid from From Bank · /)).toBeVisible();

    await page.reload();
    await expect(main.getByText(/Paid from From Bank · /)).toBeVisible();
  });

  test('picking a bank account creates the payment there, and Dont add stays a plain mark', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const bill = await seedCardBill(api, { name: 'Acct Card', last4: '5603' });
    await createBankAccount(api, { name: 'Pick Bank', last4: '5604' });

    await page.goto(`/accounts/${bill.cardId}`);
    const main = page.locator('main');
    await main.getByRole('button', { name: 'Mark paid' }).click();
    const dialog = page.getByRole('dialog', { name: 'Mark bill as paid' });
    const paidFrom = dialog.getByRole('combobox', { name: /Paid from/ });
    await expect(paidFrom).toContainText("Don't add a transaction");

    await paidFrom.click();
    await page.getByRole('option', { name: /Pick Bank/ }).click();
    await dialog.getByRole('button', { name: 'Mark paid' }).click();
    await expect(dialog).toBeHidden();
    await expect(main.getByText(/Paid from Pick Bank · /)).toBeVisible();
  });
});

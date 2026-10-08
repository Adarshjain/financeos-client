import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { istToday } from '../fixtures/dates';
import { seedCardBill, seedDueSoonLoan, seedLendingReceivable } from '../fixtures/seed/obligations';
import { expect, test } from '../fixtures/test';
import { expectToast } from '../fixtures/ui';

test.describe('Upcoming UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-upcoming');
    await loginContext(context, currentUser.cookie);
  });

  test('@mobile with nothing scheduled the list says so and the totals read zero', async ({ page }) => {
    await page.goto('/upcoming');
    await expect(page.getByRole('heading', { name: 'Upcoming', level: 1 })).toBeVisible();
    await expect(page.getByText('Nothing scheduled within the next 3 months.')).toBeVisible();
    await expect(page.getByText('Due next 7 days')).toBeVisible();
    await expect(page.getByText('This month')).toBeVisible();
    await expect(page.getByText('Overdue', { exact: true })).toBeVisible();
  });

  test('list, kind chips, horizon, calendar, bill deep link and mark paid in place', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const loan = await seedDueSoonLoan(api, 'Upcoming Car Loan');
    await seedLendingReceivable(api, 'Upcoming Friend');
    const bill = await seedCardBill(api, { name: 'Upcoming Card', last4: '7201', dueInDays: 2 });
    const billRow = page.locator(`[data-bill-row="${bill.statementId}"]`);

    await page.goto('/upcoming');
    await expect(page.getByRole('heading', { name: 'Upcoming', level: 1 })).toBeVisible();

    // List view: the three kinds of obligation, grouped by when they fall due.
    await expect(billRow).toBeVisible();
    await expect(billRow).toContainText('Upcoming Card');
    await expect(billRow.getByRole('button', { name: 'Mark paid' })).toBeVisible();
    await expect(page.getByText(/Next 7 days \(\d+\)/)).toBeVisible();
    await expect(page.getByText('Upcoming Car Loan').first()).toBeVisible();
    await expect(page.getByText('Upcoming Friend').first()).toBeVisible();

    // Kind chips narrow the list.
    const loanText = page.getByText('Upcoming Car Loan').first();
    const friendText = page.getByText('Upcoming Friend').first();
    await page.getByRole('button', { name: 'EMIs', exact: true }).click();
    await expect(loanText).toBeVisible();
    await expect(billRow).toHaveCount(0);
    await expect(page.getByText('Upcoming Friend')).toHaveCount(0);

    await page.getByRole('button', { name: 'Card bills', exact: true }).click();
    await expect(billRow).toBeVisible();
    await expect(page.getByText('Upcoming Car Loan')).toHaveCount(0);

    await page.getByRole('button', { name: 'Lending', exact: true }).click();
    await expect(friendText).toBeVisible();
    await expect(billRow).toHaveCount(0);

    await page.getByRole('button', { name: 'Statements', exact: true }).click();
    await expect(billRow).toHaveCount(0);
    await expect(page.getByText('Upcoming Friend')).toHaveCount(0);

    await page.getByRole('button', { name: 'All', exact: true }).click();
    await expect(billRow).toBeVisible();
    await expect(loanText).toBeVisible();

    // A one-month horizon still shows what falls due this week.
    await page.getByRole('combobox', { name: 'Horizon' }).click();
    await page.getByRole('option', { name: '1 Month', exact: true }).click();
    await expect(billRow).toBeVisible();

    // Calendar view: the month grid, with the selected day's items listed under it.
    await page.getByRole('tab', { name: 'Calendar' }).click();
    await expect(billRow).toHaveCount(0);
    const loanDue = istToday(3);
    if (loanDue.slice(0, 7) !== istToday().slice(0, 7)) {
      await page.getByRole('button', { name: 'Next month' }).click();
    }
    await expect(page.getByText('Nothing due on this day.')).toBeVisible();
    await page.getByRole('button', { name: String(Number(loanDue.slice(8))), exact: true }).click();
    await expect(page.getByText('Upcoming Car Loan EMI #1')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open' })).toHaveAttribute('href', `/loans/${loan.id}?installment=1`);
    await page.getByRole('button', { name: 'Previous month' }).click();
    await page.getByRole('button', { name: 'Next month' }).click();
    await page.getByRole('tab', { name: 'List' }).click();

    // Mark the card bill paid without leaving the page.
    await billRow.getByRole('button', { name: 'Mark paid' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Mark bill as paid')).toBeVisible();
    await dialog.getByRole('button', { name: 'Mark as paid' }).click();
    await expectToast(page, 'Bill marked as paid');
    await expect.poll(async () => (await api.GET('/api/v1/bills/{statementId}', { params: { path: { statementId: bill.statementId } } })).data?.status).toBe('PAID');
  });

  test('?bill=<statementId> rings and scrolls to that card bill', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const bill = await seedCardBill(api, { name: 'Linked Card', last4: '7202', dueInDays: 3 });

    await page.goto(`/upcoming?bill=${bill.statementId}`);
    const billRow = page.locator(`[data-bill-row="${bill.statementId}"]`);
    await expect(billRow).toBeVisible();
    await expect(billRow).toHaveClass(/ring-emerald-300/);
  });
});

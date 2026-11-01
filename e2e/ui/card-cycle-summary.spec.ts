import type { Page } from '@playwright/test';

import { expectStatus, makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { seedCardBill } from '../fixtures/seed/obligations';
import { expect, test } from '../fixtures/test';

/** Opens the card page on its Overview, where the Bills card lists the statement as the bill. */
async function openCard(page: Page, cardId: string): Promise<void> {
  await page.goto(`/accounts/${cardId}`);
  await expect(page.getByText('The statement is the bill')).toBeVisible();
}

test.describe('Card cycle summary due badge (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-cycle-summary');
    await loginContext(context, currentUser.cookie);
  });

  test('an overdue bill marked paid from the page stops showing overdue, also after a reload', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const bill = await seedCardBill(api, { name: 'Late Card', last4: '5501', dueInDays: -5 });

    const main = page.locator('main');
    await openCard(page, bill.cardId);
    await expect(main.getByText('Overdue', { exact: true })).toBeVisible();
    await expect(main.getByText('5 days overdue')).toBeVisible();

    await main.getByRole('button', { name: 'Mark paid' }).click();
    const markPaid = page.getByRole('dialog', { name: 'Mark bill as paid' });
    await markPaid.getByRole('button', { name: 'Mark paid' }).click();
    await expect(markPaid).toBeHidden();

    await expect(main.getByText('Paid', { exact: true })).toBeVisible();
    await expect(main.getByText('Overdue', { exact: true })).toHaveCount(0);
    await expect(main.getByText(/days overdue/)).toHaveCount(0);

    await page.reload();
    await expect(page.getByText('The statement is the bill')).toBeVisible();
    await expect(main.getByText('Paid', { exact: true })).toBeVisible();
    await expect(main.getByText('Overdue', { exact: true })).toHaveCount(0);
    await expect(main.getByText(/days overdue/)).toHaveCount(0);
  });

  test('a past-due bill already marked paid elsewhere opens with no overdue count', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const bill = await seedCardBill(api, { name: 'Paid Card', last4: '5502', dueInDays: -2 });
    const paid = await api.POST('/api/v1/bills/{statementId}/mark-paid', {
      params: { path: { statementId: bill.statementId } },
      body: {},
    });
    expectStatus(paid, 200);

    const main = page.locator('main');
    await openCard(page, bill.cardId);
    await expect(main.getByText('Paid', { exact: true })).toBeVisible();
    await expect(main.getByText('Overdue', { exact: true })).toHaveCount(0);
    await expect(main.getByText(/days overdue/)).toHaveCount(0);
  });

  test('an unpaid bill still counts down to its due date', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const bill = await seedCardBill(api, { name: 'Open Card', last4: '5503', dueInDays: 6 });

    const main = page.locator('main');
    await openCard(page, bill.cardId);
    await expect(main.getByText('6 d', { exact: true })).toBeVisible();
    await expect(main.getByText('6 days left')).toBeVisible();
  });
});

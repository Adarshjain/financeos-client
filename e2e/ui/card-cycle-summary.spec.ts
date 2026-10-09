import type { Locator, Page } from '@playwright/test';

import { expectStatus, makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { seedCardBill } from '../fixtures/seed/obligations';
import { expect, test } from '../fixtures/test';

/** The card page's Statements dialog, scrolled to its Card Cycle Summary. A pre-hydration click is dropped, so retry it. */
async function openStatements(page: Page, cardId: string): Promise<Locator> {
  await page.goto(`/accounts/${cardId}`);
  const dialog = page.getByRole('dialog').filter({ hasText: 'Card Cycle Summary' });
  await expect(async () => {
    await page.locator('main').getByRole('button', { name: 'Statements', exact: true }).click();
    await expect(dialog).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 15000 });
  await expect(dialog.getByText('Total Amount Due')).toBeVisible();
  return dialog;
}

test.describe('Card cycle summary due badge (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-cycle-summary');
    await loginContext(context, currentUser.cookie);
  });

  test('an overdue bill marked paid from the summary stops showing overdue, also after a reload', async ({ page }) => {
    test.slow();
    const api = makeApi(currentUser.cookie);
    const bill = await seedCardBill(api, { name: 'Late Card', last4: '5501', dueInDays: -5 });

    let dialog = await openStatements(page, bill.cardId);
    const actions = dialog.getByTestId('bill-statement-actions');
    await expect(actions.getByTestId('bill-status')).toHaveText('Overdue');
    await expect(dialog.getByText('5 days overdue')).toBeVisible();

    await actions.getByRole('button', { name: 'Mark as paid' }).click();
    const markPaid = page.getByRole('dialog', { name: 'Mark bill as paid' });
    await markPaid.getByRole('button', { name: 'Mark as paid' }).click();
    await expect(markPaid).toBeHidden();

    await expect(actions.getByTestId('bill-status')).toHaveText('Paid');
    await expect(dialog.getByTestId('cycle-due-badge')).toHaveCount(0);
    await expect(dialog.getByText(/days overdue/)).toHaveCount(0);

    await page.reload();
    dialog = await openStatements(page, bill.cardId);
    await expect(dialog.getByTestId('bill-status')).toHaveText('Paid');
    await expect(dialog.getByTestId('cycle-due-badge')).toHaveCount(0);
    await expect(dialog.getByText(/days overdue/)).toHaveCount(0);
  });

  test('a past-due bill already marked paid elsewhere opens with no overdue count', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const bill = await seedCardBill(api, { name: 'Paid Card', last4: '5502', dueInDays: -2 });
    const paid = await api.POST('/api/v1/bills/{statementId}/mark-paid', {
      params: { path: { statementId: bill.statementId } },
      body: {},
    });
    expectStatus(paid, 200);

    const dialog = await openStatements(page, bill.cardId);
    await expect(dialog.getByTestId('bill-status')).toHaveText('Paid');
    await expect(dialog.getByTestId('cycle-due-badge')).toHaveCount(0);
    await expect(dialog.getByText(/days overdue/)).toHaveCount(0);
  });

  test('an unpaid bill still counts down to its due date', async ({ page }) => {
    const api = makeApi(currentUser.cookie);
    const bill = await seedCardBill(api, { name: 'Open Card', last4: '5503', dueInDays: 6 });

    const dialog = await openStatements(page, bill.cardId);
    await expect(dialog.getByTestId('bill-status')).toHaveText('Due');
    await expect(dialog.getByTestId('cycle-due-badge')).toHaveText('Due in 6 days');
  });
});

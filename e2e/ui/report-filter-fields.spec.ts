import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { expect, test } from '../fixtures/test';

test.describe('Report filter fields UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-filter-fields');
    await loginContext(context, currentUser.cookie);
  });

  test('the filter field list leaves out grouping-only fields', async ({ page }) => {
    await page.goto('/reports/new');
    await expect(page.getByRole('heading', { name: 'Create Report' })).toBeVisible();
    await page.getByRole('combobox').filter({ hasText: 'Transactions' }).first().click();
    await page.getByRole('option', { name: 'Reward Earnings' }).click();

    await page.getByRole('button', { name: /Add filter rule/i }).click();
    await page.getByRole('combobox').filter({ hasText: 'Effective Date' }).last().click();
    await expect(page.getByRole('option', { name: 'Rule', exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Billing cycle', exact: true })).toHaveCount(0);
    await expect(page.getByRole('option', { name: 'Reward year', exact: true })).toHaveCount(0);
    await expect(page.getByRole('option', { name: 'Eligible transactions', exact: true })).toHaveCount(0);
  });
});

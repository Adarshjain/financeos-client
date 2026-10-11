import type { Page } from '@playwright/test';

import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { expect, test } from '../fixtures/test';
import { openAccountEditor, openAccounts } from '../fixtures/ui';

async function pickSharedLimit(page: Page, option: string | RegExp) {
  await page.getByRole('combobox', { name: 'Shared Limit' }).click();
  await page.getByRole('option', { name: option }).click();
}

async function startCard(page: Page, name: string, last4: string) {
  await page.getByRole('button', { name: /Add Account|Get Started/i }).first().click();
  await expect(page.getByRole('heading', { name: /Create Account/i })).toBeVisible();
  await page.getByRole('button', { name: 'Credit Card' }).click();
  await page.getByLabel('Account Name').fill(name);
  await page.getByLabel('Last 4 Digits').fill(last4);
  await page.getByLabel('Card Anniversary Date').fill('2024-04-01');
}

test.describe('Shared credit limit UI (@ui)', () => {
  test.beforeEach(async ({ context, request }) => {
    const u = await createUser(request, 'ui-shared-limit');
    await loginContext(context, u.cookie);
  });

  test('two cards share one limit created inline, the total counts it once, and a card can leave it (@mobile)', async ({ page }) => {
    await openAccounts(page);

    // 1. First card creates the shared limit inline; it needs no limit of its own.
    await startCard(page, 'HDFC Regalia', '2222');
    await pickSharedLimit(page, 'New shared limit…');
    await expect(page.getByLabel('Own Limit (Optional)')).toBeVisible();
    await page.getByLabel('Shared Limit Name').fill('HDFC shared');
    await page.getByLabel('Shared Limit Amount').fill('500000');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // 2. Second card joins it from the picker, prefilled with the pool's name and amount.
    await startCard(page, 'HDFC Millennia', '3333');
    await pickSharedLimit(page, /HDFC shared/);
    await expect(page.getByLabel('Shared Limit Name')).toHaveValue('HDFC shared');
    await expect(page.getByLabel('Shared Limit Amount')).toHaveValue('500000');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // 3. Both tiles show the shared limit; the section total counts it once.
    await expect(page.getByText('HDFC shared · 2 accounts')).toHaveCount(2);
    await expect(page.getByText('Shared Limit', { exact: true })).toHaveCount(2);
    await expect(page.getByText(/Total Limit: ₹5,00,000/)).toBeVisible();

    // 4. One card leaves the pool and gets its own limit back.
    await openAccountEditor(page, 'HDFC Millennia');
    await expect(page.getByRole('combobox', { name: 'Shared Limit' })).toContainText('HDFC shared');
    await pickSharedLimit(page, 'None, this card has its own limit');
    await page.getByLabel('Credit Limit').fill('100000');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    await openAccounts(page);
    await expect(page.getByText('HDFC shared · 1 account')).toHaveCount(1);
    await expect(page.getByText(/Total Limit: ₹6,00,000/)).toBeVisible();
  });
});

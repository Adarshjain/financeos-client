import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createTransaction, searchAll, todayString } from '../fixtures/seed/transactions';
import { unknownShop } from '../fixtures/seed/uncategorized';
import { expect, test } from '../fixtures/test';

const row = (page: Page, text: string | RegExp) => page.getByRole('row').filter({ hasText: text });

test.describe('Category: Do the same next time (@ui)', () => {
  let user: CreatedUser;

  test.beforeEach(async ({ context, request, page }) => {
    test.setTimeout(120000);
    user = await createUser(request, 'ui-same-next-time');
    await loginContext(context, user.cookie);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  const open = async (page: Page, description: string) => {
    await page.goto('/transactions');
    await expect(row(page, description)).toBeVisible({ timeout: 45000 });
  };

  /** Changes the category of a row that already has one: tap its category, pick Gifts. */
  const changeToGifts = async (page: Page, description: string, was: string) => {
    await row(page, description).getByText(was).locator('visible=true').first().click();
    const picker = page.getByRole('dialog', { name: 'Category' });
    await expect(picker).toBeVisible();
    await picker.getByRole('button', { name: 'Gifts', exact: true }).click();
    await expect(picker).not.toBeVisible();
  };

  test('changing a category the engine chose offers a rule; accepting it saves a rule that sorts the next similar transaction', async ({ page }) => {
    const api = makeApi(user.cookie);
    const bank = await createBankAccount(api, { name: 'Same Next Bank' });
    const first = await createTransaction(api, bank.id, { description: 'SWIGGY ORDER 4412 BANGALORE', amount: -420, date: todayString(-2) });
    expect(first.categorySource).toBe('AUTO');
    expect(first.category?.key).toBe('food');

    await open(page, 'SWIGGY ORDER 4412 BANGALORE');
    await changeToGifts(page, 'SWIGGY ORDER 4412 BANGALORE', 'Food');

    // The toast offers a rule for the payee next to Undo.
    await expect(page.getByText('Set to Gifts')).toBeVisible();
    const offer = page.getByRole('button', { name: /Do the same next time for .SWIGGY.\?/ });
    await expect(offer).toBeVisible();
    await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
    await offer.click();
    await expect(page.getByText('Rule saved')).toBeVisible({ timeout: 15000 });

    // The rule is in Rules ...
    await page.goto('/transactions/rules');
    await expect(page.getByText('SWIGGY', { exact: true }).first()).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Gifts').first()).toBeVisible();

    // ... and applies to the next similar transaction by itself.
    const next = await createTransaction(api, bank.id, { description: 'SWIGGY ORDER 9981 MUMBAI', amount: -180, date: todayString(-1) });
    expect(next.category?.key).toBe('gifts');
    expect(next.categorySource).toBe('RULE');
    await page.goto('/transactions');
    await expect(row(page, 'SWIGGY ORDER 9981 MUMBAI')).toContainText('Gifts', { timeout: 45000 });

    // The row the user changed by hand stays theirs.
    const mine = (await searchAll(api)).find((t) => t.id === first.id)!;
    expect(mine.category?.key).toBe('gifts');
    expect(mine.categorySource).toBe('USER');
  });

  test('Undo on the same toast restores the engine category and saves no rule', async ({ page }) => {
    const api = makeApi(user.cookie);
    const bank = await createBankAccount(api, { name: 'Undo Next Bank' });
    const first = await createTransaction(api, bank.id, { description: 'SWIGGY ORDER 1010 DELHI', amount: -300, date: todayString(-2) });

    await open(page, 'SWIGGY ORDER 1010 DELHI');
    await changeToGifts(page, 'SWIGGY ORDER 1010 DELHI', 'Food');
    await expect(page.getByRole('button', { name: /Do the same next time/ })).toBeVisible();
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect.poll(async () => (await searchAll(api)).find((t) => t.id === first.id)?.category?.key).toBe('food');

    const rules = await api.GET('/api/v1/rules');
    expect(rules.data?.totalElements).toBe(0);
  });

  test('a category the user set by hand never offers a rule', async ({ page }) => {
    const api = makeApi(user.cookie);
    const bank = await createBankAccount(api, { name: 'Hand Set Bank' });
    const shop = unknownShop('handset');
    await createTransaction(api, bank.id, { description: shop, amount: -120, date: todayString(-1) });

    await open(page, shop);
    await row(page, shop).getByText('Set category').locator('visible=true').click();
    const picker = page.getByRole('dialog', { name: 'Category' });
    await picker.getByRole('button', { name: 'Gifts', exact: true }).click();
    await expect(page.getByText('Set to Gifts')).toBeVisible();
    await expect(page.getByRole('button', { name: /Do the same next time/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
  });
});

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

const VIEWPORTS = [
  { name: 'desktop 1440px', tag: '@ui', width: 1440, height: 900 },
  { name: 'phone 390px', tag: '@ui @mobile', width: 390, height: 844 },
];

for (const viewport of VIEWPORTS) {
  test.describe(`/ds Category picker, ${viewport.name} (${viewport.tag})`, () => {
    let user: CreatedUser;

    test.beforeEach(async ({ context, request, page }) => {
      user = await createUser(request, 'ui-ds-picker');
      await loginContext(context, user.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
    });

    const open = async (page: Page) => {
      await page.goto('/transactions');
      await expect(page.getByRole('row').filter({ hasText: /\S/ }).first()).toBeVisible({ timeout: 45_000 });
    };

    /** The category the server holds for the one transaction of this description. */
    const categoryOf = async (description: string) => {
      const found = (await searchAll(makeApi(user.cookie))).find((t) => t.description === description);
      return found ? `${found.category?.key ?? ''}|${found.subcategory?.key ?? ''}|${found.categorySource ?? ''}` : null;
    };

    test('Set category opens the picker over the row; a category with sub-categories drills in and the sub-category tap saves, with a toast and Undo', async ({ page }) => {
      const api = makeApi(user.cookie);
      const bank = await createBankAccount(api, { name: 'Picker Bank' });
      const shop = unknownShop('picker');
      await createTransaction(api, bank.id, { amount: -420, date: todayString(-1), description: shop });
      await open(page);

      await row(page, shop).getByText('Set category').locator('visible=true').click();
      const picker = page.getByRole('dialog', { name: 'Category' });
      await expect(picker).toBeVisible();
      await expect(page.getByRole('dialog', { name: 'Edit transaction' })).toHaveCount(0);

      // A category with sub-categories opens its list (Others last); nothing is saved by opening it.
      await picker.getByRole('button', { name: 'Food', exact: true }).click();
      await expect(picker.getByText('Others', { exact: true })).toBeVisible();
      expect(await categoryOf(shop)).toBe('||');
      await picker.getByText('Delivery', { exact: true }).click();

      // A tap saves at once: the picker closes, the toast says what was set, the row shows it.
      await expect(picker).not.toBeVisible();
      await expect(page.getByText('Set to Food · Delivery')).toBeVisible();
      await expect(row(page, shop)).toContainText('Food · Delivery');
      await expect.poll(() => categoryOf(shop)).toBe('food|food.delivery|USER');

      // Undo puts the transaction back to having no category.
      await page.getByRole('button', { name: 'Undo' }).click();
      await expect.poll(() => categoryOf(shop)).toBe('||');
      await expect(row(page, shop).getByText('Set category').locator('visible=true')).toBeVisible();
    });

    test('a category without sub-categories saves on one tap and the saved category shows after a reload', async ({ page }) => {
      const api = makeApi(user.cookie);
      const bank = await createBankAccount(api, { name: 'Picker Bank' });
      const shop = unknownShop('flat');
      await createTransaction(api, bank.id, { amount: -75, date: todayString(-1), description: shop });
      await open(page);

      await row(page, shop).getByText('Set category').locator('visible=true').click();
      const picker = page.getByRole('dialog', { name: 'Category' });
      await picker.getByRole('button', { name: 'Gifts', exact: true }).click();
      await expect(picker).not.toBeVisible();
      await expect(page.getByText('Set to Gifts')).toBeVisible();
      await expect.poll(() => categoryOf(shop)).toBe('gifts||USER');

      await expect(async () => {
        await open(page);
        await expect(row(page, shop)).toContainText('Gifts', { timeout: 3_000 });
      }).toPass({ timeout: 30_000 });
    });

    test('the search line finds a sub-category by its words and a tap on the result saves', async ({ page }) => {
      const api = makeApi(user.cookie);
      const bank = await createBankAccount(api, { name: 'Picker Bank' });
      const shop = unknownShop('search');
      await createTransaction(api, bank.id, { amount: -310, date: todayString(-1), description: shop });
      await open(page);

      await row(page, shop).getByText('Set category').locator('visible=true').click();
      const picker = page.getByRole('dialog', { name: 'Category' });
      await picker.getByRole('textbox', { name: 'Search categories' }).fill('qqzzxx');
      await expect(picker.getByText(/No match/)).toBeVisible();
      await picker.getByRole('textbox', { name: 'Search categories' }).fill('delivery');
      await picker.getByText('Food · Delivery', { exact: true }).click();
      await expect(picker).not.toBeVisible();
      await expect.poll(() => categoryOf(shop)).toBe('food|food.delivery|USER');
    });

    test('the picker offers the direction of the transaction: money in shows income categories, money out shows spend ones', async ({ page }) => {
      const api = makeApi(user.cookie);
      const bank = await createBankAccount(api, { name: 'Picker Bank' });
      const inflow = unknownShop('inflow');
      await createTransaction(api, bank.id, { amount: 900, date: todayString(-1), description: inflow });
      await open(page);

      await row(page, inflow).getByText('Set category').locator('visible=true').click();
      const picker = page.getByRole('dialog', { name: 'Category' });
      await expect(picker.getByRole('button', { name: 'Salary', exact: true })).toBeVisible();
      await expect(picker.getByRole('button', { name: 'Groceries', exact: true })).toHaveCount(0);
      await picker.getByRole('button', { name: 'Salary', exact: true }).click();
      // Salary has sub-categories: Others saves the category on its own.
      await picker.getByText('Others', { exact: true }).click();
      await expect.poll(() => categoryOf(inflow)).toBe('salary||USER');
    });
  });
}

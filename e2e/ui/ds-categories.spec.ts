import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createCategory } from '../fixtures/seed/categories';
import { createTransaction, todayString } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

const VIEWPORTS = [
  { name: 'desktop 1440px', tag: '@ui', width: 1440, height: 900 },
  { name: 'phone 390px', tag: '@ui @mobile', width: 390, height: 844 },
];

for (const viewport of VIEWPORTS) {
  const phone = viewport.width < 641;

  test.describe(`/ds Categories, ${viewport.name} (${viewport.tag})`, () => {
    let user: CreatedUser;

    test.beforeEach(async ({ context, request, page }) => {
      user = await createUser(request, 'ui-ds-cats');
      await loginContext(context, user.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const api = makeApi(user.cookie);
      await createCategory(api, 'Dining out');
      await createCategory(api, 'Rent');
    });

    test('lists, searches, adds, renames (duplicate is a toast) and deletes', async ({ page }) => {
      await page.goto('/transactions/categories');
      await expect(page.getByText('Dining out')).toBeVisible();
      await expect(page.getByText('Rent', { exact: true })).toBeVisible();

      await page.getByPlaceholder('Search').fill('din');
      await expect(page.getByText('Rent', { exact: true })).toHaveCount(0);
      await expect(page).toHaveURL(/q=din/);
      await page.getByPlaceholder('Search').fill('');
      await expect(page.getByText('Rent', { exact: true })).toBeVisible();

      await page.getByRole('button', { name: 'Add category', exact: true }).first().click();
      await page.getByRole('textbox', { name: 'Name' }).fill('Pets');
      await page.getByRole('button', { name: 'Add category' }).click();
      await expect(page.getByText('Category "Pets" created')).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByText('Pets', { exact: true })).toBeVisible();

      if (phone) {
        await page.getByText('Pets', { exact: true }).click();
        await page.getByRole('button', { name: 'Rename' }).click();
      } else {
        await page.getByRole('button', { name: 'Actions for Pets', exact: true }).click();
        await page.getByRole('menuitem', { name: 'Rename' }).click();
      }
      await page.getByRole('textbox', { name: 'Name' }).fill('Rent');
      await page.getByRole('button', { name: 'Save category' }).click();
      await expect(page.getByText(/already exists/i)).toBeVisible();
      await page.getByRole('textbox', { name: 'Name' }).fill('Pet care');
      await page.getByRole('button', { name: 'Save category' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByText('Pet care', { exact: true })).toBeVisible();

      if (phone) {
        await page.getByText('Pet care', { exact: true }).click();
        await page.getByRole('button', { name: 'Delete' }).click();
      } else {
        await page.getByRole('button', { name: 'Actions for Pet care', exact: true }).click();
        await page.getByRole('menuitem', { name: 'Delete' }).click();
      }
      await expect(page.getByText('Delete Pet care?')).toBeVisible();
      await page.getByRole('dialog', { name: 'Delete Pet care?' }).getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(page.getByText('Pet care', { exact: true })).toHaveCount(0);
    });

    test('a row opens the actions dialog; the ⋯ menu does not also open it', async ({ page }) => {
      await page.goto('/transactions/categories');
      await page.getByText('Rent', { exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Rent' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Rename' })).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Delete' })).toBeVisible();
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      if (!phone) {
        await page.getByRole('button', { name: 'Actions for Rent', exact: true }).click();
        await page.getByRole('menuitem', { name: 'Rename' }).click();
        await expect(page.getByRole('dialog')).toHaveCount(1);
        await expect(page.getByRole('textbox', { name: 'Name' })).toBeVisible();
      }
    });

    test('Uncategorized card: count, latest three with Tag, Review opens the filtered list', async ({ page }) => {
      const api = makeApi(user.cookie);
      const bank = await createBankAccount(api, { name: 'Main Bank' });
      for (let i = 1; i <= 4; i++) {
        await createTransaction(api, bank.id, { amount: -100 * i, date: todayString(-i), description: `Untagged ${i}` });
      }
      await page.goto('/transactions/categories');
      await expect(page.getByText('Uncategorized · 4')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Tag', exact: true })).toHaveCount(3);
      await page.getByRole('link', { name: /Review/ }).click();
      await expect(page).toHaveURL(/\/transactions\?uncategorized=1/);
      await expect(page.getByRole('button', { name: 'Uncategorized' })).toBeVisible();
      await expect(page.getByText('Untagged 4').first()).toBeVisible();
      // The chip's reset x takes the filter off the address.
      await page.getByRole('button', { name: 'Reset filter', exact: true }).click();
      await expect(page).not.toHaveURL(/uncategorized/);
    });

    test('pages the categories, 20 to a page', async ({ page }) => {
      const api = makeApi(user.cookie);
      for (let i = 10; i < 32; i++) await createCategory(api, `Cat ${i}`);
      await page.goto('/transactions/categories');
      await expect(page.getByText('Cat 10')).toBeVisible();
      await page.getByRole('button', { name: 'Page 2' }).first().click();
      await expect(page).toHaveURL(/page=2/);
      await expect(page.getByText('Rent', { exact: true })).toBeVisible();
      await expect(page.getByText('Cat 10')).toHaveCount(0);
    });

    test('deleting the only row on the last page lands on the previous page', async ({ page }) => {
      const api = makeApi(user.cookie);
      for (let i = 10; i < 49; i++) await createCategory(api, `Cat ${i}`);
      // 2 seeded + 39 = 41 categories: the third page holds exactly one (Rent).
      await page.goto('/transactions/categories?page=3');
      await expect(page.getByRole('button', { name: /^Actions for / })).toHaveCount(phone ? 0 : 1);
      if (phone) {
        await page.getByText('Rent', { exact: true }).click();
        await page.getByRole('button', { name: 'Delete' }).click();
      } else {
        await page.getByRole('button', { name: /^Actions for / }).click();
        await page.getByRole('menuitem', { name: 'Delete' }).click();
      }
      await page.getByRole('dialog', { name: /^Delete / }).getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(page).toHaveURL(/page=2/);
      await expect(page.getByText('Dining out')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Page 2' }).first()).toBeVisible();
    });

    test('a page past the end goes to the last page', async ({ page }) => {
      await page.goto('/transactions/categories?page=9');
      await expect(page.getByText('Rent', { exact: true })).toBeVisible();
      await expect(page).not.toHaveURL(/page=9/);
    });

    test('the Transactions tabs link to this page', async ({ page }) => {
      await page.goto('/transactions');
      await page.getByRole('tab', { name: 'Categories' }).click();
      await expect(page).toHaveURL(/\/transactions\/categories/);
    });
  });
}

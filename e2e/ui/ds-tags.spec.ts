import type { Locator, Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createCategory } from '../fixtures/seed/categories';
import { createTransaction, searchAll, todayString } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

const row = (page: Page, text: string | RegExp) => page.getByRole('row').filter({ hasText: text });

const VIEWPORTS = [
  { name: 'desktop 1440px', tag: '@ui', width: 1440, height: 900 },
  { name: 'phone 390px', tag: '@ui @mobile', width: 390, height: 844 },
];

for (const viewport of VIEWPORTS) {
  const phone = viewport.width < 641;

  test.describe(`/ds Tags, ${viewport.name} (${viewport.tag})`, () => {
    let user: CreatedUser;

    test.beforeEach(async ({ context, request, page }) => {
      user = await createUser(request, 'ui-ds-tags');
      await loginContext(context, user.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
    });

    /** The ⋮ of the row titled `name`, inside `scope`. */
    const moreOf = (scope: Page | Locator, name: string) =>
      scope
        .getByText(name, { exact: true })
        .locator('xpath=ancestor::div[.//button[@aria-label="More options"]][1]')
        .getByRole('button', { name: 'More options' });
    /** Opens the ⋮ of a tag row and presses an action (a menu on desktop, a sheet on phone). */
    const rowAction = async (page: Page, name: string, action: 'Rename' | 'Delete', scope: Page | Locator = page) => {
      await moreOf(scope, name).click();
      await page.getByRole('menuitem', { name: action }).click();
    };

    test('the tabs are All and Tags; the old Categories address lands on Tags', async ({ page }) => {
      await page.goto('/transactions');
      const tabs = page.getByRole('tab');
      await expect(tabs.filter({ hasText: /^(All|Tags)$/ })).toHaveCount(2);
      await expect(page.getByRole('tab', { name: 'Categories' })).toHaveCount(0);
      await expect(page.getByRole('tab', { name: 'Rules' })).toHaveCount(0);
      await page.getByRole('tab', { name: 'Tags' }).click();
      await expect(page).toHaveURL(/\/transactions\/tags/);

      await page.goto('/rules/categories');
      await expect(page).toHaveURL(/\/transactions\/tags/);
      await expect(page.getByRole('tab', { name: 'Tags', selected: true })).toBeVisible();
    });

    test('create, rename (a taken name is refused) and delete a tag from the Tags tab', async ({ page }) => {
      const api = makeApi(user.cookie);
      await createCategory(api, 'Work');
      await page.goto('/transactions/tags');
      await expect(page.getByText('Work', { exact: true })).toBeVisible();

      // New tag: the top bar's Add is a menu.
      await page.getByRole('button', { name: 'Add', exact: true }).first().click();
      await page.getByRole('menuitem', { name: 'New tag' }).click();
      await page.getByRole('textbox', { name: 'Name' }).fill('Goa trip');
      await page.getByRole('button', { name: 'Add tag' }).click();
      await expect(page.getByText('Tag added')).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByText('Goa trip', { exact: true })).toBeVisible();
      await expect(page.getByText('No transactions').first()).toBeVisible();

      await rowAction(page, 'Goa trip', 'Rename');
      await page.getByRole('textbox', { name: 'Name' }).fill('Work');
      await page.getByRole('button', { name: 'Save name' }).click();
      await expect(page.getByText(/already exists/i)).toBeVisible();
      await page.getByRole('textbox', { name: 'Name' }).fill('Goa 2026');
      await page.getByRole('button', { name: 'Save name' }).click();
      await expect(page.getByText('Tag renamed')).toBeVisible();
      await expect(page.getByText('Goa 2026', { exact: true })).toBeVisible();
      await expect(page.getByText('Goa trip', { exact: true })).toHaveCount(0);

      await rowAction(page, 'Goa 2026', 'Delete');
      await expect(page.getByText('Delete Goa 2026?')).toBeVisible();
      await expect(page.getByText(/removes it from its transactions/)).toBeVisible();
      await page.getByRole('dialog', { name: 'Delete Goa 2026?' }).getByRole('button', { name: 'Delete tag' }).click();
      await expect(page.getByText('Tag deleted')).toBeVisible();
      await expect(page.getByText('Goa 2026', { exact: true })).toHaveCount(0);
      expect((await api.GET('/api/v1/tags')).data!.map((t) => t.name)).toEqual(['Work']);
    });

    test('tag sheet on a transaction: find or create a tag by typing, Done saves it on the transaction, Manage renames and deletes', async ({ page }) => {
      const api = makeApi(user.cookie);
      const bank = await createBankAccount(api, { name: 'Tag Bank' });
      const t = await createTransaction(api, bank.id, { amount: -640, date: todayString(-1), description: 'Tag Sheet Dinner' });
      await createCategory(api, 'Work');
      await page.goto(`/transactions?txn=${t.id}`);
      const detail = page.getByRole('dialog', { name: 'Tag Sheet Dinner' });
      await expect(detail).toBeVisible({ timeout: 45_000 });

      await detail.getByRole('button', { name: 'Add tag', exact: true }).click();
      const sheet = page.getByRole('dialog', { name: 'Tags' });
      await expect(sheet).toBeVisible();
      await expect(sheet.getByText('Tag Sheet Dinner · ₹640.00')).toBeVisible();
      // Typing a name no tag has offers to create it, and creating ticks it.
      await sheet.getByRole('textbox', { name: 'Find a tag' }).fill('Goa trip');
      await sheet.getByText('Create "Goa trip"').click();
      await expect(page.getByText('Create "Goa trip"')).toHaveCount(0);
      await sheet.getByRole('textbox', { name: 'Find a tag' }).fill('');
      // Done saves what is ticked, so wait until the new tag is made and listed (it is ticked as it is made).
      await expect(sheet.getByText('Goa trip', { exact: true })).toBeVisible({ timeout: 30_000 });
      await sheet.getByText('Work', { exact: true }).click();
      await sheet.getByRole('button', { name: 'Done' }).click();
      await expect(sheet).not.toBeVisible();

      // The detail shows the saved tags once the save has landed and the transaction has been read again.
      await expect(detail.getByText('Goa trip', { exact: true })).toBeVisible({ timeout: 30_000 });
      await expect(detail.getByText('Work', { exact: true })).toBeVisible({ timeout: 30_000 });
      await expect
        .poll(async () => (await searchAll(api)).find((x) => x.id === t.id)?.tags.map((g) => g.name).sort())
        .toEqual(['Goa trip', 'Work']);

      // Remove a tag with the chip's ×.
      await detail.getByRole('button', { name: /Remove/ }).first().click();
      await expect
        .poll(async () => (await searchAll(api)).find((x) => x.id === t.id)?.tags.length)
        .toBe(1);

      // Manage: rename and delete without leaving the sheet.
      await detail.getByRole('button', { name: 'Add tag', exact: true }).click();
      await sheet.getByRole('button', { name: 'Manage' }).click();
      await expect(page.getByRole('dialog', { name: 'Manage tags' })).toBeVisible();
      const manage = page.getByRole('dialog', { name: 'Manage tags' });
      await rowAction(page, 'Work', 'Rename', manage);
      await page.getByRole('textbox', { name: 'Name' }).fill('Office');
      await page.getByRole('button', { name: 'Save name' }).click();
      await expect(manage.getByText('Office', { exact: true })).toBeVisible();
      await rowAction(page, 'Office', 'Delete', manage);
      await page.getByRole('button', { name: 'Delete tag' }).click();
      await expect(manage.getByText('Office', { exact: true })).toHaveCount(0);
      await expect.poll(async () => (await api.GET('/api/v1/tags')).data!.map((g) => g.name)).toEqual(['Goa trip']);
    });

    test('bulk Add tag: the selection bar tags every selected transaction at once, with a toast', async ({ page }) => {
      const api = makeApi(user.cookie);
      const bank = await createBankAccount(api, { name: 'Bulk Bank' });
      const tag = await createCategory(api, 'Reimbursable');
      await createTransaction(api, bank.id, { amount: -111, date: todayString(-1), description: 'Bulk Tag One' });
      await createTransaction(api, bank.id, { amount: -222, date: todayString(-2), description: 'Bulk Tag Two' });
      await createTransaction(api, bank.id, { amount: -333, date: todayString(-3), description: 'Bulk Tag Three' });
      await page.goto('/transactions');
      await expect(row(page, 'Bulk Tag One')).toHaveCount(1, { timeout: 45_000 });

      const select = async (name: string) => {
        if (phone) {
          // A long press starts selection; a tap then toggles.
          const box = (await row(page, name).getByText(name).first().boundingBox())!;
          await page.mouse.move(box.x + 5, box.y + 5);
          await page.mouse.down();
          await page.waitForTimeout(800);
          await page.mouse.up();
        } else {
          await page.getByLabel(new RegExp(`^Select ${name}`)).click();
        }
      };
      await select('Bulk Tag One');
      if (phone) await row(page, 'Bulk Tag Two').getByText('Bulk Tag Two').first().click();
      else await select('Bulk Tag Two');
      await expect(page.getByText('2 selected')).toBeVisible();

      await page.getByRole('button', { name: 'Add tag' }).first().click();
      const sheet = page.getByRole('dialog', { name: 'Tags' });
      await expect(sheet.getByText('2 transactions')).toBeVisible();
      await sheet.getByText('Reimbursable', { exact: true }).click();
      await sheet.getByRole('button', { name: 'Done' }).click();

      await expect(page.getByText('Added Reimbursable to 2 transactions')).toBeVisible();
      await expect
        .poll(async () =>
          (await searchAll(api, [{ field: 'tag', operator: 'is', value: tag.id }])).map((x) => x.description).sort()
        )
        .toEqual(['Bulk Tag One', 'Bulk Tag Two']);
      expect((await searchAll(api)).find((x) => x.description === 'Bulk Tag Three')?.tags).toHaveLength(0);
    });
  });
}

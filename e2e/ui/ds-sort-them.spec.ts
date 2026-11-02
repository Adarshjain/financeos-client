import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createTransaction, searchAll, todayString } from '../fixtures/seed/transactions';
import { seedShopRows, unknownShop } from '../fixtures/seed/uncategorized';
import { expect, test } from '../fixtures/test';

const VIEWPORTS = [
  { name: 'desktop 1440px', tag: '@ui', width: 1440, height: 900 },
  { name: 'phone 390px', tag: '@ui @mobile', width: 390, height: 844 },
];

for (const viewport of VIEWPORTS) {
  test.describe(`/ds Sort them, ${viewport.name} (${viewport.tag})`, () => {
    let user: CreatedUser;

    test.beforeEach(async ({ context, request, page }) => {
      user = await createUser(request, 'ui-ds-sort');
      await loginContext(context, user.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
    });

    const open = async (page: Page) => {
      await page.goto('/transactions');
      await expect(page.getByRole('row').filter({ hasText: /\S/ }).first()).toBeVisible({ timeout: 45_000 });
    };
    /** The Sort them dialog: its title carries the count once the summary has loaded, and says what it is for before. */
    const sortDialog = (page: Page) => page.getByRole('dialog', { name: /need.* a category/ });
    const openSort = async (page: Page) => {
      await page.getByRole('button', { name: 'Sort them' }).click();
      await expect(sortDialog(page)).toBeVisible();
    };
    /** Opens a group, which opens its own dialog titled by the group. */
    const openGroup = async (page: Page, label: string) => {
      await sortDialog(page).getByText(label, { exact: true }).click();
      const group = page.getByRole('dialog', { name: label });
      await expect(group).toBeVisible();
      return group;
    };
    /** Picks Food · Delivery in the picker the group dialog opened. */
    const pickFoodDelivery = async (page: Page) => {
      const picker = page.getByRole('dialog', { name: 'Category' });
      await expect(picker).toBeVisible();
      await picker.getByRole('button', { name: 'Food', exact: true }).click();
      await picker.getByText('Delivery', { exact: true }).click();
      await expect(picker).not.toBeVisible();
    };

    test('the card opens Sort them; a shop group takes a category with "Do the same next time"; Set for 3 categorises the rows at once and the rule is on the Tags tab', async ({ page }) => {
      const api = makeApi(user.cookie);
      const bank = await createBankAccount(api, { name: 'Sort Bank' });
      const shop = unknownShop('sort');
      const rows = await seedShopRows(api, bank.id, shop, 3);
      const oneOff = unknownShop('lone');
      await createTransaction(api, bank.id, { amount: -999, date: todayString(-5), description: oneOff });
      await open(page);
      await openSort(page);

      // Groups of two or more come first; the lone transaction is under One-offs.
      const dialog = sortDialog(page);
      await expect(dialog.getByText(shop, { exact: true })).toBeVisible();
      await expect(dialog.getByText('One-offs')).toBeVisible();
      await expect(dialog.getByText(oneOff, { exact: true })).toBeVisible();
      await expect(dialog.getByRole('button', { name: /^Save/ })).toHaveCount(0);

      const group = await openGroup(page, shop);
      // A shop group lists what the choice applies to, all ticked, and the rule switch is on by default.
      await expect(group.getByText('Applies to')).toBeVisible();
      await expect(group.getByRole('checkbox')).toHaveCount(3);
      await expect(group.getByRole('switch', { name: 'Do the same next time' })).toBeChecked();
      await expect(group.getByRole('button', { name: 'Set for 3' })).toBeDisabled();
      await group.getByRole('combobox', { name: /Category/ }).click();
      await pickFoodDelivery(page);
      await group.getByRole('button', { name: 'Set for 3' }).click();

      // The group is applied at once: a toast with Undo, and the group has left the list (the one-off stays).
      await expect(page.getByText('Set the category of 3 transactions')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
      await expect(group).not.toBeVisible();
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText(shop, { exact: true })).toHaveCount(0);
      await expect(dialog.getByText(oneOff, { exact: true })).toBeVisible();
      const after = await searchAll(api);
      for (const r of rows) {
        const t = after.find((x) => x.id === r.id)!;
        expect(t.category?.key).toBe('food');
        expect(t.subcategory?.key).toBe('food.delivery');
        expect(t.categorySource).toBe('USER');
      }
      // The untouched one-off is still uncategorised.
      expect(after.find((x) => x.description === oneOff)?.category ?? null).toBeNull();

      // The rule it made is on the Tags tab and sorts the next arrival by itself.
      await page.goto('/transactions/rules');
      await expect(page.getByText(shop.toUpperCase()).first()).toBeVisible({ timeout: 45_000 });
      const later = await createTransaction(api, bank.id, { amount: -120, date: todayString(0), description: shop });
      expect(later.category?.key).toBe('food');
      expect(later.categorySource).toBe('RULE');
    });

    test('a person group offers reasons first, the rule is off by default, and an unticked transaction stays uncategorised', async ({ page }) => {
      const api = makeApi(user.cookie);
      const bank = await createBankAccount(api, { name: 'Sort Bank' });
      const person = 'Rohan Mehra';
      const rows = await seedShopRows(api, bank.id, person, 2, -500);
      await open(page);
      await openSort(page);

      const group = await openGroup(page, person);
      await expect(group.getByText('Why did you pay Rohan?')).toBeVisible();
      await expect(group.getByRole('button', { name: 'Lent', exact: true })).toBeVisible();
      await expect(group.getByRole('button', { name: 'Gifts', exact: true })).toBeVisible();
      await expect(group.getByRole('button', { name: 'Something else…' })).toBeVisible();
      await expect(group.getByRole('switch', { name: 'Do the same next time' })).not.toBeChecked();

      await group.getByRole('button', { name: 'Lent', exact: true }).click();
      // Leave the first transaction out: "Set for" counts the ticked ones only.
      await group.getByRole('checkbox').first().click();
      await group.getByRole('button', { name: 'Set for 1' }).click();

      await expect(page.getByText('Set the category of 1 transaction')).toBeVisible();
      const after = await searchAll(api);
      const categorised = after.filter((t) => t.description === person && t.category?.key === 'lent');
      expect(categorised).toHaveLength(1);
      const left = after.filter((t) => t.description === person && !t.category);
      expect(left).toHaveLength(1);
      expect([categorised[0].id, left[0].id].sort()).toEqual(rows.map((r) => r.id).sort());
      // No rule was asked for, so none exists.
      expect(((await api.GET('/api/v1/rules')).data as { content: unknown[] }).content).toHaveLength(0);
    });

    test('Undo in the toast puts the group back, rows and rule', async ({ page }) => {
      const api = makeApi(user.cookie);
      const bank = await createBankAccount(api, { name: 'Sort Bank' });
      const shop = unknownShop('undo');
      const rows = await seedShopRows(api, bank.id, shop, 2);
      await open(page);
      await openSort(page);
      const group = await openGroup(page, shop);
      await group.getByRole('combobox', { name: /Category/ }).click();
      await pickFoodDelivery(page);
      await group.getByRole('button', { name: 'Set for 2' }).click();
      await expect(page.getByText('Set the category of 2 transactions')).toBeVisible();
      await expect(sortDialog(page).getByText(shop, { exact: true })).toHaveCount(0);
      expect(((await api.GET('/api/v1/rules')).data as { content: unknown[] }).content).toHaveLength(1);

      await page.getByRole('button', { name: 'Undo' }).click();
      await expect(page.getByText('Put 2 transactions back')).toBeVisible();
      const after = await searchAll(api);
      for (const r of rows) expect(after.find((x) => x.id === r.id)?.category ?? null).toBeNull();
      expect(((await api.GET('/api/v1/rules')).data as { content: unknown[] }).content).toHaveLength(0);
      // The group is back in the list.
      await expect(sortDialog(page).getByText(shop, { exact: true })).toBeVisible();
    });

    test('search narrows the groups by name, and says when none match', async ({ page }) => {
      const api = makeApi(user.cookie);
      const bank = await createBankAccount(api, { name: 'Sort Bank' });
      const alpha = unknownShop('alphasearch');
      const beta = unknownShop('betasearch');
      await seedShopRows(api, bank.id, alpha, 2);
      await seedShopRows(api, bank.id, beta, 2);
      await open(page);
      await openSort(page);
      const dialog = sortDialog(page);
      await expect(dialog.getByText(alpha, { exact: true })).toBeVisible();
      await expect(dialog.getByText(beta, { exact: true })).toBeVisible();

      await dialog.getByRole('searchbox', { name: 'Search groups' }).fill('ALPHASEARCH');
      await expect(dialog.getByText(beta, { exact: true })).toHaveCount(0);
      await expect(dialog.getByText(alpha, { exact: true })).toBeVisible();

      await dialog.getByRole('searchbox', { name: 'Search groups' }).fill('no such shop anywhere');
      await expect(dialog.getByText('No groups match')).toBeVisible();

      await dialog.getByRole('button', { name: 'Clear search' }).click();
      await expect(dialog.getByText(beta, { exact: true })).toBeVisible();
    });

    test('Later closes the dialog; a group opened but not set changes nothing', async ({ page }) => {
      const api = makeApi(user.cookie);
      const bank = await createBankAccount(api, { name: 'Sort Bank' });
      const shop = unknownShop('defer');
      await seedShopRows(api, bank.id, shop, 2);
      await open(page);
      await openSort(page);
      const group = await openGroup(page, shop);
      await group.getByRole('combobox', { name: /Category/ }).click();
      await pickFoodDelivery(page);
      await expect(group.getByRole('button', { name: 'Set for 2' })).toBeEnabled();
      await page.keyboard.press('Escape');
      await expect(group).not.toBeVisible();
      await sortDialog(page).getByRole('button', { name: 'Later', exact: true }).click();
      await expect(sortDialog(page)).not.toBeVisible();
      expect((await searchAll(api)).filter((t) => t.category)).toHaveLength(0);
    });
  });
}

test.describe('/ds Sort them card (@ui)', () => {
  test('the card is absent when every transaction has a category', async ({ context, request, page }) => {
    const user = await createUser(request, 'ui-ds-sort-none');
    await loginContext(context, user.cookie);
    const api = makeApi(user.cookie);
    const bank = await createBankAccount(api, { name: 'Sorted Bank' });
    await createTransaction(api, bank.id, { amount: -100, date: todayString(-1), description: unknownShop('done'), categoryKey: 'food' });
    await page.goto('/transactions');
    await expect(page.getByRole('row').filter({ hasText: /\S/ }).first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('button', { name: 'Sort them' })).toHaveCount(0);
  });
});

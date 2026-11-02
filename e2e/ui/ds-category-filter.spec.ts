import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createCategory } from '../fixtures/seed/categories';
import { createTransaction, todayString } from '../fixtures/seed/transactions';
import { expect, test } from '../fixtures/test';

const row = (page: Page, text: string | RegExp) => page.getByRole('row').filter({ hasText: text });

const VIEWPORTS = [
  { name: 'desktop 1440px', tag: '@ui', width: 1440, height: 900 },
  { name: 'phone 390px', tag: '@ui @mobile', width: 390, height: 844 },
];

for (const viewport of VIEWPORTS) {
  test.describe(`/ds Category and Tags filters, ${viewport.name} (${viewport.tag})`, () => {
    let user: CreatedUser;
    let tagId: string;

    test.beforeEach(async ({ context, request, page }) => {
      user = await createUser(request, 'ui-ds-catfilter');
      await loginContext(context, user.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const api = makeApi(user.cookie);
      const bank = await createBankAccount(api, { name: 'Filter Bank' });
      const trip = await createCategory(api, 'Trip');
      tagId = trip.id;
      const mk = (description: string, day: number, extra: object = {}) =>
        createTransaction(api, bank.id, { amount: -(100 + day), date: todayString(-day), description, ...extra });
      await mk('Zxqv Delivery Row', 1, { categoryKey: 'food', subcategoryKey: 'food.delivery', tagIds: [trip.id] });
      await mk('Zxqv Dining Row', 2, { categoryKey: 'food', subcategoryKey: 'food.dining' });
      await mk('Zxqv Grocery Row', 3, { categoryKey: 'groceries' });
      await mk('Zxqv Unsorted Row', 4);
    });

    const open = async (page: Page, search: string) => {
      await page.goto(`/transactions${search}`);
      await expect(page.getByRole('row').filter({ hasText: /\S/ }).first()).toBeVisible({ timeout: 45_000 });
    };
    const phone = viewport.width < 641;
    // The Category and Tags chips show only on desktop; phone carries the filter in the "All filters" count.
    const chipShows = async (page: Page, name: string) => {
      if (phone) await expect(page.getByRole('button', { name: /^All filters\s*[1-9]/ })).toBeVisible();
      else await expect(page.getByRole('button', { name })).toBeVisible();
    };
    const openFilters = async (page: Page) => {
      await page.getByRole('button', { name: /^(\+ More|All filters)/ }).click();
      const dialog = page.getByRole('dialog', { name: 'Filters' });
      await expect(dialog).toBeVisible();
      return dialog;
    };
    const shown = async (page: Page, ...names: string[]) => {
      for (const n of ['Delivery', 'Dining', 'Grocery', 'Unsorted']) {
        await expect(row(page, `Zxqv ${n} Row`)).toHaveCount(names.includes(n) ? 1 : 0);
      }
    };

    test('?uncategorized=1 lists only the uncategorized; the chip says so and its reset clears the address', async ({ page }) => {
      await open(page, '?uncategorized=1');
      await shown(page, 'Unsorted');
      await chipShows(page, 'Category · Uncategorized');
      if (phone) {
        const dialog = await openFilters(page);
        await dialog.getByRole('button', { name: 'Reset filter', exact: true }).first().click();
        await dialog.getByRole('button', { name: /^Show/ }).click();
      } else {
        await page.getByRole('button', { name: 'Reset filter', exact: true }).first().click();
      }
      await expect(page).not.toHaveURL(/uncategorized/);
      await shown(page, 'Delivery', 'Dining', 'Grocery', 'Unsorted');
    });

    test('Uncategorized plus a category widen each other (OR)', async ({ page }) => {
      await open(page, '?uncategorized=1&category=groceries');
      await shown(page, 'Grocery', 'Unsorted');
      await chipShows(page, 'Category · 2');
    });

    test('a sub-category narrows its own category: category=food&subcategory=food.delivery keeps only Delivery', async ({ page }) => {
      await open(page, '?category=food');
      await shown(page, 'Delivery', 'Dining');
      await open(page, '?category=food&subcategory=food.delivery');
      await shown(page, 'Delivery');
      await chipShows(page, 'Category · Delivery');
      // The sub-category alone works too.
      await open(page, '?subcategory=food.dining');
      await shown(page, 'Dining');
    });

    test('the Category field in the Filters dialog: Uncategorized first, a sub-category found by search; the address is written on Show', async ({ page }) => {
      await open(page, '');
      const dialog = await openFilters(page);
      await dialog.getByRole('combobox', { name: 'Category' }).click();
      const search = page.getByPlaceholder('Search categories');
      await search.waitFor();
      const options = page.getByRole('option');
      await expect(options.first()).toHaveText(/^Uncategorized/);
      await options.first().click();
      await expect(page.getByRole('button', { name: 'Expand' }).first()).toBeVisible();
      // A search for a sub-category opens its category; ticking the sub-category narrows to it.
      await search.fill('deliver');
      await page.getByRole('option', { name: 'Delivery', exact: true }).click();
      await search.fill('');
      await page.getByRole('button', { name: 'Done' }).click();
      await expect(page).not.toHaveURL(/uncategorized/);
      await dialog.getByRole('button', { name: /^Show/ }).click();
      await expect(page).toHaveURL(/uncategorized=1/);
      await expect(page).toHaveURL(/subcategory=food\.delivery/);
      await shown(page, 'Delivery', 'Unsorted');
    });

    test('the Filters dialog\'s Tags field lists Untagged first and applies on Show', async ({ page }) => {
      await open(page, '');
      const dialog = await openFilters(page);
      await dialog.getByRole('combobox', { name: 'Tags' }).click();
      await expect(page.getByRole('option').first()).toHaveText(/^Untagged/);
      await page.getByRole('option', { name: /Trip/ }).click();
      await page.getByRole('button', { name: 'Done' }).click();
      await dialog.getByRole('button', { name: /^Show/ }).click();
      await expect(page).toHaveURL(new RegExp(`tag=${tagId}`));
      await shown(page, 'Delivery');
    });

    test('?tag=<id> lists the tagged, ?untagged=1 the rest; the Tags chip names the tag', async ({ page }) => {
      await open(page, `?tag=${tagId}`);
      await shown(page, 'Delivery');
      await chipShows(page, 'Tags · Trip');
      await open(page, '?untagged=1');
      await shown(page, 'Dining', 'Grocery', 'Unsorted');
      await chipShows(page, 'Tags · Untagged');
      // Untagged and a tag widen each other.
      await open(page, `?untagged=1&tag=${tagId}`);
      await shown(page, 'Delivery', 'Dining', 'Grocery', 'Unsorted');
      await chipShows(page, 'Tags · 2');
    });

    test('an old link whose category was a tag name filters by that tag', async ({ page }) => {
      await open(page, '?category=Trip');
      await shown(page, 'Delivery');
      await chipShows(page, 'Tags · Trip');
    });
  });
}

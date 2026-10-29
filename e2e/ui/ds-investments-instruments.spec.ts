import type { Locator, Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { type SeededInstruments, seedInstruments, seedManyInstruments } from '../fixtures/seed/instruments';
import { expect, test } from '../fixtures/test';

const VIEWPORTS = [
  { name: 'desktop 1440px', width: 1440, height: 900, phone: false },
  { name: 'phone 390px', width: 390, height: 844, phone: true },
];

/** The copy of a figure drawn once for the phone and once for the desktop: the one on screen. */
const shown = (locator: Locator) => locator.locator('visible=true').first();

for (const viewport of VIEWPORTS) {
  test.describe(`/ds Instruments, ${viewport.name} (@ui)`, () => {
    let currentUser: CreatedUser;
    let seeded: SeededInstruments;

    /** Desktop has a pencil on each row; on phone the row itself opens the edit. */
    async function openEdit(page: Page, name: string) {
      if (viewport.phone) await shown(page.getByText(name, { exact: false })).click();
      else await page.getByRole('button', { name: `Edit ${name}`, exact: true }).click();
      return page.getByRole('dialog', { name: 'Edit instrument' });
    }

    test.beforeEach(async ({ context, request, page }) => {
      currentUser = await createUser(request, 'ui-ds-instruments');
      await loginContext(context, currentUser.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      seeded = await seedInstruments(makeApi(currentUser.cookie));
    });

    test('lists the catalog with every row state, under the Investments tabs', async ({ page }) => {
      await page.goto(`/investments/instruments?q=${seeded.tag}`);

      await expect(page.getByRole('tab', { name: /^Instruments/ })).toBeVisible();
      await expect(page.getByText('Prices from Yahoo (stocks, ETFs) and AMFI (funds)')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Refresh prices' })).toHaveCount(0);

      await expect(shown(page.getByText(seeded.held.name))).toBeVisible();
      await expect(shown(page.getByText(new RegExp(`AMFI ${seeded.fund.amfiCode}`)))).toBeVisible();
      await expect(shown(page.getByText(seeded.edited.name))).toBeVisible();
      await expect(shown(page.getByText('1,512.70', { exact: false }))).toBeVisible();
      await expect(shown(page.getByText('No price'))).toBeVisible();
      // Nobody holds four of the five.
      await expect(page.getByText('Not held')).toHaveCount(4);
      await expect(shown(page.getByText(/Edited for your account/))).toBeVisible();
      await expect(shown(page.getByRole('button', { name: 'Reset to catalog', exact: true }))).toBeVisible();
      if (!viewport.phone) {
        await expect(page.getByText('Manual').first()).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Source' })).toBeVisible();
      }
    });

    test('search, type, Stale price and name order are one URL change each, answered by the server', async ({ page }) => {
      await page.goto('/investments/instruments');

      await page.getByPlaceholder('Search').fill(seeded.tag);
      await page.waitForURL(new RegExp(`q=${seeded.tag}`));
      await expect(shown(page.getByText(seeded.held.name))).toBeVisible();

      await page.getByRole('button', { name: /^Funds/ }).click();
      await page.waitForURL(/type=mutual_fund/);
      await expect(shown(page.getByText(seeded.fund.name))).toBeVisible();
      await expect(page.getByText(seeded.held.name)).toHaveCount(0);

      await page.getByRole('button', { name: 'All types' }).click();
      await page.waitForURL((url) => !url.search.includes('type='));
      await page.getByRole('button', { name: 'Stale price' }).click();
      await page.waitForURL(/stale=1/);
      await expect(shown(page.getByText(seeded.stale.name))).toBeVisible();
      await expect(page.getByText(seeded.held.name)).toHaveCount(0);
      // No price at all counts as stale too.
      await expect(shown(page.getByText(seeded.noPrice.name))).toBeVisible();

      await page.getByRole('button', { name: 'Stale price' }).click();
      await page.waitForURL((url) => !url.search.includes('stale='));
      await page.getByRole('button', { name: /Name A–Z/ }).click();
      await page.getByRole('option', { name: 'Name Z–A' }).click();
      await page.waitForURL(/sort=desc/);
      await expect(page.getByRole('button', { name: /Name Z–A/ })).toBeVisible();
    });

    test('pages on the server, above and below, and a page past the end shows the last one', async ({ page }) => {
      const prefix = `PGX${seeded.tag.slice(3)}`;
      await seedManyInstruments(makeApi(currentUser.cookie), prefix, 27);
      await page.goto(`/investments/instruments?q=${prefix}&size=25`);

      await expect(page.getByRole('navigation', { name: 'Pagination' })).toHaveCount(2);
      await expect(shown(page.getByText(`${prefix} 01`))).toBeVisible();
      await expect(page.getByText(`${prefix} 27`)).toHaveCount(0);

      await page.getByRole('button', { name: /next/i }).first().click();
      await page.waitForURL(/page=1/);
      await expect(shown(page.getByText(`${prefix} 27`))).toBeVisible();
      await expect(page.getByText(`${prefix} 01`)).toHaveCount(0);

      await page.goto(`/investments/instruments?q=${prefix}&size=25&page=9`);
      await page.waitForURL(/page=1/);
      await expect(shown(page.getByText(`${prefix} 27`))).toBeVisible();
    });

    test('Edit changes the instrument for the account, and Reset to catalog undoes it after a confirmation', async ({ page }) => {
      await page.goto(`/investments/instruments?q=${seeded.tag}`);
      const dialog = await openEdit(page, seeded.held.name);
      await expect(dialog).toBeVisible();
      await expect(dialog.getByLabel('Name', { exact: true })).toHaveValue(seeded.held.name);
      // Nothing to reset yet.
      await expect(dialog.getByRole('button', { name: 'Reset to catalog' })).toHaveCount(0);

      const renamed = `${seeded.held.name} Renamed`;
      await dialog.getByLabel('Name', { exact: true }).fill(renamed);
      await dialog.getByRole('button', { name: 'Save instrument' }).click();
      await expect(page.getByText(`${renamed} updated`)).toBeVisible();
      await expect(shown(page.getByText(renamed))).toBeVisible();
      await expect(page.getByText(/Edited for your account/).locator('visible=true')).toHaveCount(2);

      // Reset it from the row: the confirmation says what goes.
      const row = page.getByRole('button').filter({ hasText: renamed, has: page.getByRole('button', { name: 'Reset to catalog', exact: true }) });
      await shown(row.getByRole('button', { name: 'Reset to catalog', exact: true })).click();
      const confirm = page.getByRole('dialog', { name: /Reset to catalog/ });
      await expect(confirm).toContainText('Only your account is affected');
      await confirm.getByRole('button', { name: 'Reset to catalog' }).click();
      await expect(page.getByText(/reset to catalog/)).toBeVisible();
      await expect(shown(page.getByText(seeded.held.name, { exact: true }))).toBeVisible();
    });

    test('Edit saves an asset class and a Reset in the dialog works too', async ({ page }) => {
      await page.goto(`/investments/instruments?q=${seeded.tag}`);
      const dialog = await openEdit(page, seeded.edited.name);
      await expect(dialog.getByRole('button', { name: 'Reset to catalog' })).toBeVisible();
      await dialog.getByRole('combobox', { name: /^Asset class/ }).click();
      await page.getByRole('option', { name: 'Gold' }).click();
      await dialog.getByRole('button', { name: 'Save instrument' }).click();
      await expect(page.getByText(`${seeded.edited.name} updated`)).toBeVisible();

      await page.reload();
      const again = await openEdit(page, seeded.edited.name);
      await expect(again.getByRole('combobox', { name: /^Asset class/ })).toContainText('Gold');
      await again.getByRole('button', { name: 'Reset to catalog' }).click();
      await page.getByRole('dialog', { name: /Reset to catalog/ }).getByRole('button', { name: 'Reset to catalog' }).click();
      await expect(shown(page.getByText(seeded.edited.originalName))).toBeVisible();
      await expect(page.getByText(/Edited for your account/)).toHaveCount(0);
    });

    test('Edit refuses to clear an identifier and shows a blank name', async ({ page }) => {
      await page.goto(`/investments/instruments?q=${seeded.tag}`);
      const dialog = await openEdit(page, seeded.held.name);
      await dialog.getByLabel('Name', { exact: true }).fill('');
      await dialog.getByRole('button', { name: 'Save instrument' }).click();
      await expect(dialog.getByText('Name is required')).toBeVisible();
      await dialog.getByLabel('Name', { exact: true }).fill(seeded.held.name);
      await dialog.getByLabel('ISIN', { exact: true }).fill('');
      await dialog.getByRole('button', { name: 'Save instrument' }).click();
      await expect(dialog.getByText(/The ISIN can't be cleared/)).toBeVisible();
    });

    test('Add: "enter it by hand" opens the manual form, which creates the instrument', async ({ page }) => {
      await page.goto(`/investments/instruments?q=${seeded.tag}`);
      await page.getByRole('button', { name: 'enter it by hand' }).click();
      const dialog = page.getByRole('dialog', { name: 'Add instrument' });
      await expect(dialog.getByLabel('Exchange')).toHaveValue('NSE');

      await dialog.getByRole('button', { name: 'Add instrument' }).click();
      await expect(dialog.getByText('Name is required')).toBeVisible();

      const name = `${seeded.tag} Added By Hand`;
      await dialog.getByLabel('Name', { exact: true }).fill(name);
      await dialog.getByLabel('Symbol', { exact: true }).fill(`${seeded.tag}A`);
      await expect(dialog.getByLabel('Yahoo symbol')).toHaveValue(`${seeded.tag}A.NS`);
      await dialog.getByRole('button', { name: 'Add instrument' }).click();
      await expect(page.getByText(`${name} added`)).toBeVisible();
      await expect(shown(page.getByText(name))).toBeVisible();
    });

    test('Add: the Catalog tab searches and says when nothing matches', async ({ page }) => {
      await page.goto(`/investments/instruments?q=${seeded.tag}`);
      await page.getByRole('button', { name: 'enter it by hand' }).click();
      const dialog = page.getByRole('dialog', { name: 'Add instrument' });
      await dialog.getByRole('radio', { name: 'Catalog' }).click();
      await expect(dialog.getByText('Type at least 2 characters to search.')).toBeVisible();
      // Your own catalog answers first.
      await dialog.getByPlaceholder(/Search by name or symbol/).fill(seeded.held.name);
      await expect(dialog.getByText('In your catalog')).toBeVisible();
      await expect(dialog.getByRole('button', { name: new RegExp(seeded.held.name) })).toBeVisible();
      await dialog.getByPlaceholder(/Search by name or symbol/).fill('qqzzxxnomatch');
      await expect(dialog.getByText('No matches. Enter it by hand.')).toBeVisible();
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(dialog).toHaveCount(0);
    });
  });
}

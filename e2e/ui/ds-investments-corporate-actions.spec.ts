import type { Locator } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { seedCorporateActions,type SeededCorporateActions } from '../fixtures/seed/corporateActions';
import { expect, test } from '../fixtures/test';

const VIEWPORTS = [
  { name: 'desktop 1440px', width: 1440, height: 900 },
  { name: 'phone 390px', width: 390, height: 844 },
];

/** The copy of a figure drawn once for the phone and once for the desktop: the one on screen. */
const shown = (locator: Locator) => locator.locator('visible=true').first();

for (const viewport of VIEWPORTS) {
  test.describe(`/ds Investments · Corporate actions, ${viewport.name} (@ui)`, () => {
    let currentUser: CreatedUser;
    let seeded: SeededCorporateActions;

    test.beforeEach(async ({ context, request, page }) => {
      currentUser = await createUser(request, 'ui-ds-corporate-actions');
      await loginContext(context, currentUser.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      seeded = await seedCorporateActions(makeApi(currentUser.cookie));
    });

    test('lists every recorded action with its type, ratio and effect, and the rules card', async ({ page }) => {
      await page.goto('/investments/corporate-actions');

      await expect(shown(page.getByText(`${seeded.infy.symbol} · ${seeded.infy.name}`))).toBeVisible();
      await expect(shown(page.getByText('Note: record date 11 Jun 25'))).toBeVisible();
      await expect(shown(page.getByText(seeded.itc.symbol, { exact: false }))).toBeVisible();
      await expect(shown(page.getByText('Bonus', { exact: true }))).toBeVisible();
      await expect(shown(page.getByText('Split', { exact: true }))).toBeVisible();
      await expect(shown(page.getByText('Demerger', { exact: true }))).toBeVisible();
      if (viewport.width > 640) {
        await expect(page.getByText('30 → 60', { exact: false }).first()).toBeVisible();
        await expect(page.getByText('1 : 3')).toBeVisible();
        await expect(page.getByText('1 : 1', { exact: true })).toBeVisible();
      } else {
        await expect(page.getByText(/ex 10 Jun 25 · 1:1 · 30 → 60 shares/)).toBeVisible();
      }
      await expect(page.getByText('How each type is applied')).toBeVisible();
      await expect(page.getByText('Floored; the fraction is sold as cash-in-lieu')).toBeVisible();
    });

    test('search, type and sort are one URL change each and answered by the server', async ({ page }) => {
      await page.goto('/investments/corporate-actions');

      await page.getByPlaceholder('Instrument').fill('INFYX');
      await page.waitForURL(/q=INFYX/);
      await expect(shown(page.getByText(seeded.infy.symbol, { exact: false }))).toBeVisible();
      await expect(page.getByText(seeded.itc.symbol, { exact: false })).toHaveCount(0);

      await page.getByRole('button', { name: 'Merger', exact: true }).click();
      await page.waitForURL(/type=merger/);
      await expect(page.getByText('No corporate actions match.')).toBeVisible();
      await page.getByRole('button', { name: 'Clear filters' }).click();
      await page.waitForURL((url) => url.search === '');
      await expect(shown(page.getByText(seeded.infy.symbol, { exact: false }))).toBeVisible();

      await page.getByRole('button', { name: 'Split', exact: true }).click();
      await page.waitForURL(/type=split/);
      await expect(shown(page.getByText(seeded.itc.symbol, { exact: false }))).toBeVisible();
      await expect(page.getByText(seeded.infy.symbol, { exact: false })).toHaveCount(0);

      await page.getByRole('button', { name: 'All types' }).click();
      await page.getByRole('button', { name: /Newest/ }).click();
      await page.getByRole('option', { name: 'Oldest' }).click();
      await page.waitForURL(/sort=oldest/);
      await expect(page.getByRole('button', { name: /Oldest/ })).toBeVisible();
    });

    test('a row opens the edit dialog; changing the ratio saves and the list shows it', async ({ page }) => {
      await page.goto('/investments/corporate-actions');
      await shown(page.getByText(`${seeded.infy.symbol} · ${seeded.infy.name}`)).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('Edit corporate action')).toBeVisible();
      await expect(dialog.getByRole('combobox', { name: /^Instrument/ })).toBeDisabled();
      await expect(dialog.getByRole('textbox', { name: /^Before/ })).toHaveValue('1');
      await expect(dialog.getByRole('textbox', { name: /^After/ })).toHaveValue('2');
      await expect(dialog.getByRole('textbox', { name: /^Notes/ })).toHaveValue('record date 11 Jun 25');
      // A saved action is previewed as a replacement of itself.
      await expect(dialog.getByText('After saving')).toBeVisible();
      await expect(dialog.getByText('30 → 60 shares', { exact: false })).toBeVisible();

      await dialog.getByRole('textbox', { name: /^After/ }).fill('4');
      await dialog.getByRole('button', { name: 'Save bonus' }).click();
      await expect(page.getByText('Updated bonus 3:1')).toBeVisible();
      await expect(dialog).toHaveCount(0);
      if (viewport.width > 640) await expect(page.getByText('30 → 120', { exact: false }).first()).toBeVisible();
      else await expect(page.getByText(/ex 10 Jun 25 · 3:1 · 30 → 120 shares/)).toBeVisible();
    });

    test('the edit dialog shows a demerger with its child and cost share', async ({ page }) => {
      await page.goto('/investments/corporate-actions?type=demerger');
      await shown(page.getByText(seeded.itc.symbol, { exact: false })).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog.getByRole('combobox', { name: /^Action/ })).toContainText('Demerger');
      await expect(dialog.getByRole('combobox', { name: /^Child instrument/ })).toContainText(seeded.hotels.name);
      await expect(dialog.getByRole('textbox', { name: /^Held/ })).toHaveValue('10');
      await expect(dialog.getByRole('textbox', { name: /^Received/ })).toHaveValue('1');
      await expect(dialog.getByRole('textbox', { name: /^Cost allocation %/ })).toHaveValue('1.5');
      await expect(dialog.getByLabel('Ex-date')).toHaveValue('01/04/2025');
    });

    test('Delete asks first, keeps the action on Cancel and removes it on confirm', async ({ page }) => {
      await page.goto('/investments/corporate-actions?type=bonus');
      await shown(page.getByText(`${seeded.infy.symbol} · ${seeded.infy.name}`)).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();

      const confirm = page.getByRole('dialog', { name: 'Delete corporate action' });
      await expect(confirm.getByText(/Your trades and dividends stay/)).toBeVisible();
      await confirm.getByRole('button', { name: 'Cancel' }).click();
      await expect(confirm).toHaveCount(0);
      await expect(page.getByRole('dialog').getByText('Edit corporate action')).toBeVisible();

      await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
      await page.getByRole('dialog', { name: 'Delete corporate action' }).getByRole('button', { name: 'Delete corporate action' }).click();
      await expect(page.getByText('Corporate action deleted')).toBeVisible();
      await expect(page.getByText(seeded.infy.symbol, { exact: false })).toHaveCount(0);
      await expect(page.getByText('No corporate actions match.')).toBeVisible();
    });
  });
}

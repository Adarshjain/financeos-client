import type { Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { type SeededHoldings, seedHoldings } from '../fixtures/seed/holdings';
import { expect, test } from '../fixtures/test';

const VIEWPORTS = [
  { name: 'desktop 1440px', width: 1440, height: 900 },
  { name: 'phone 390px', width: 390, height: 844 },
];

/** Each tab, and the dialog its top-bar + opens. Holdings and Tradebook both record a trade. */
const TABS = [
  { path: '/ds/investments', dialog: 'Record trade' },
  { path: '/ds/investments/tradebook', dialog: 'Record trade' },
  { path: '/ds/investments/dividends', dialog: 'Record dividend' },
  { path: '/ds/investments/fno', dialog: 'Add F&O trade' },
  { path: '/ds/investments/corporate-actions', dialog: 'Record corporate action' },
  { path: '/ds/investments/instruments', dialog: 'Add instrument' },
];

const plus = (page: Page) => page.getByRole('button', { name: 'Add', exact: true }).first();

for (const viewport of VIEWPORTS) {
  test.describe(`/ds Investments top-bar +, ${viewport.name} (@ui)`, () => {
    let currentUser: CreatedUser;
    let seeded: SeededHoldings;

    test.beforeEach(async ({ context, request, page }) => {
      currentUser = await createUser(request, 'ui-ds-investments-add');
      await loginContext(context, currentUser.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      seeded = await seedHoldings(makeApi(currentUser.cookie));
    });

    for (const tab of TABS) {
      test(`${tab.path}: + opens ${tab.dialog}`, async ({ page }) => {
        await page.goto(tab.path);
        await plus(page).click();
        await expect(page.getByRole('dialog', { name: tab.dialog })).toBeVisible();
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(page.getByRole('dialog')).toHaveCount(0);
      });
    }

    test('records a trade from Holdings + and finds it in the Tradebook', async ({ page }) => {
      await page.goto('/ds/investments');
      await plus(page).click();
      const dialog = page.getByRole('dialog', { name: 'Record trade' });
      await dialog.getByRole('combobox', { name: /Instrument/ }).click();
      await page.getByPlaceholder('Search by name or symbol').fill(seeded.tcs.symbol);
      await page.getByRole('option', { name: new RegExp(seeded.tcs.symbol) }).first().click();
      await dialog.getByLabel('Qty').fill('7');
      await dialog.getByLabel('Price').fill('321');
      await dialog.getByRole('button', { name: 'Record buy' }).click();
      await expect(dialog).toHaveCount(0);

      await page.goto('/ds/investments/tradebook');
      await expect(page.getByText(seeded.tcs.symbol, { exact: true }).locator('visible=true').first()).toBeVisible();
      await expect(page.getByText(/2,247/).locator('visible=true').first()).toBeVisible();
    });

    test('a holding page records a trade, a dividend and a corporate action for that instrument', async ({ page }) => {
      await page.goto(`/ds/investments/${seeded.infy.id}`);
      await page.getByRole('button', { name: 'Record trade' }).click();
      const trade = page.getByRole('dialog', { name: 'Record trade' });
      await expect(trade.getByRole('combobox', { name: /Instrument/ })).toContainText(seeded.infy.symbol);
      await trade.getByRole('button', { name: 'Cancel' }).click();

      await page.getByRole('button', { name: 'Record', exact: true }).first().click();
      await expect(page.getByRole('dialog', { name: 'Record dividend' })).toBeVisible();
      await page.getByRole('button', { name: 'Cancel' }).click();

      await page.getByRole('button', { name: 'Record', exact: true }).nth(1).click();
      const action = page.getByRole('dialog', { name: 'Record corporate action' });
      await expect(action.getByRole('combobox', { name: /Instrument/ })).toContainText(seeded.infy.symbol);
    });
  });
}

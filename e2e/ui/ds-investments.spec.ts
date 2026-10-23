import type { Locator } from '@playwright/test';

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

/** The copy of a figure drawn once for the phone and once for the desktop: the one on screen. */
const shown = (locator: Locator) => locator.locator('visible=true').first();

for (const viewport of VIEWPORTS) {
  test.describe(`/ds Investments, ${viewport.name} (@ui)`, () => {
    let currentUser: CreatedUser;
    let seeded: SeededHoldings;

    test.beforeEach(async ({ context, request, page }) => {
      currentUser = await createUser(request, 'ui-ds-investments');
      await loginContext(context, currentUser.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      seeded = await seedHoldings(makeApi(currentUser.cookie));
    });

    test('Holdings: the six tabs, the figures and every row state', async ({ page }) => {
      await page.goto('/ds/investments');

      await expect(page.getByRole('tab', { name: 'Holdings' })).toHaveAttribute('data-state', 'active');
      for (const name of [/^Tradebook/, /^Dividends/, /^F&O/, /^Corporate actions/, /^Instruments/]) {
        await expect(page.getByRole('tab', { name })).toBeVisible();
      }
      await expect(page.getByRole('tab', { name: /^Tradebook/ })).toHaveAttribute('href', '/ds/investments/tradebook');
      // The counts load on their own.
      await expect(page.getByRole('tab', { name: /^Tradebook · \d+/ })).toBeVisible();

      await expect(shown(page.getByText('Current value', { exact: true }))).toBeVisible();
      await expect(shown(page.getByText('Unrealised P&L', { exact: true }))).toBeVisible();
      await expect(page.getByText(/Prices as of \d+ \w+/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();

      // Rows: priced by hand, held at cost, merged away.
      await expect(shown(page.getByText(seeded.infy.symbol, { exact: true }))).toBeVisible();
      await expect(shown(page.getByText(/manual price/))).toBeVisible();
      await expect(shown(page.getByText(/at cost \(no price\)/))).toBeVisible();
      await expect(shown(page.getByRole('button', { name: 'record a merger' }))).toBeVisible();
      await expect(shown(page.getByText(new RegExp(`Merged into ${seeded.target.name} · \\d+ Jul 23`)))).toBeVisible();
      await expect(shown(page.getByText('Stocks', { exact: false }))).toBeVisible();
      // One row per stock: INFY is held at two brokers and appears once.
      await expect(page.getByRole('button').filter({ hasText: seeded.infy.symbol })).toHaveCount(1);
    });

    test('Holdings: search, type, sort and Broker are one URL change each and answered by the server', async ({ page }) => {
      await page.goto('/ds/investments');

      await page.getByPlaceholder('Symbol or name').fill('TCSX');
      await page.waitForURL(/q=TCSX/);
      await expect(shown(page.getByText(seeded.tcs.symbol, { exact: true }))).toBeVisible();
      await expect(page.getByText(seeded.infy.symbol, { exact: true })).toHaveCount(0);

      await page.getByRole('button', { name: /^Funds/ }).click();
      await page.waitForURL(/type=mutual_fund/);
      await expect(page.getByText('No holdings match.')).toBeVisible();
      await page.getByRole('button', { name: 'Clear filters' }).click();
      await page.waitForURL((url) => url.search === '');
      await expect(shown(page.getByText(seeded.infy.symbol, { exact: true }))).toBeVisible();

      await page.getByRole('button', { name: /^Stocks/ }).click();
      await page.waitForURL(/type=stock/);
      await expect(shown(page.getByText(seeded.infy.symbol, { exact: true }))).toBeVisible();

      await page.getByRole('button', { name: /Name A–Z/ }).click();
      await page.getByRole('option', { name: '₹ return' }).click();
      await page.waitForURL(/sort=return_abs/);
      await expect(page.getByRole('button', { name: /₹ return/ })).toBeVisible();

      await page.getByRole('button', { name: 'Broker' }).click();
      await page.getByRole('option', { name: seeded.groww.name }).click();
      await page.waitForURL(new RegExp(`broker=${seeded.groww.id}`));
      // Groww holds INFY (one of its two brokers) and the no-price stock, not TCS.
      await expect(shown(page.getByText(seeded.noPrice.symbol, { exact: true }))).toBeVisible();
      await expect(page.getByText(seeded.tcs.symbol, { exact: true })).toHaveCount(0);
    });

    test('Holdings: a row opens its holding page', async ({ page }) => {
      await page.goto('/ds/investments');
      await shown(page.getByText(seeded.tcs.symbol, { exact: true })).click();
      await page.waitForURL(`**/ds/investments/${seeded.tcs.id}`);
      await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('data-state', 'active');
      // A holding's page has its own tabs, not the Investments ones.
      await expect(page.getByRole('tab', { name: 'Tradebook' })).toHaveCount(0);
    });

    test('Holdings: Refresh starts a price job and View job links to that exact job in Settings → Activity', async ({ page }) => {
      test.setTimeout(90_000); // the Activity page compiles on first visit in a dev client
      await page.goto('/ds/investments');
      await page.getByRole('button', { name: 'Refresh' }).click();
      await expect(page.getByText('Price refresh started in background.')).toBeVisible();
      const viewJob = page.getByRole('link', { name: 'View job' });
      await expect(viewJob).toHaveAttribute('href', /\/ds\/settings\/activity\?job=[\w-]+/);
      const href = await viewJob.getAttribute('href');
      // The page refreshes when the job ends, which can swallow a press that lands on that moment: press again.
      await expect(async () => {
        await viewJob.click();
        await page.waitForURL((url) => url.pathname + url.search === href, { timeout: 5_000 });
      }).toPass({ timeout: 60_000 });
    });

    test('Holding page: figures, sections and the broker split', async ({ page }) => {
      await page.goto(`/ds/investments/${seeded.infy.id}`);

      await expect(shown(page.getByText(new RegExp(`${seeded.infy.symbol} · `)))).toBeVisible();
      await expect(shown(page.getByText('Current value', { exact: true }))).toBeVisible();
      for (const label of ['Quantity', 'Avg cost', 'LTP', 'XIRR', 'Invested', '₹ return', 'Realised P&L', 'Total charges']) {
        await expect(shown(page.getByText(label, { exact: true }))).toBeVisible();
      }
      await expect(page.getByRole('tab', { name: /^Trades · \d+/ })).toBeVisible();
      await expect(page.getByRole('tab', { name: /^Dividends · 1/ })).toBeVisible();
      await expect(page.getByRole('tab', { name: /^Corporate actions · 1/ })).toBeVisible();

      // One row per stock on Holdings; the split is here.
      await expect(page.getByText('By broker')).toBeVisible();
      // Zerodha holds 20 and Groww 10: each broker's shares, average cost and value.
      await expect(page.getByText('20 shares · avg ₹1,420.00')).toBeVisible();
      await expect(page.getByText('10 shares · avg ₹1,420.00')).toBeVisible();

      await expect(page.getByText('If you sell today')).toBeVisible();
      await expect(page.getByText(/^Sell all \d+$/)).toBeVisible();
      await expect(page.getByText('Dividend ₹22 / share')).toBeVisible();
      await expect(page.getByText(/^Bonus 1:1/)).toBeVisible();
      await expect(page.getByText('Shared catalog entry')).toBeVisible();
      await expect(page.getByText(/Final|Interim|Applied/)).toHaveCount(0);
    });

    test('Holding page: the sell card offers a tax-free sale and works a typed quantity out in the page', async ({ page }) => {
      await page.goto(`/ds/investments/${seeded.infy.id}`);
      await expect(page.getByText('If you sell today')).toBeVisible();

      // Every lot is long term and the year's exemption is untouched: Sell all itself shows tax ≈ ₹0.
      await expect(page.getByText(/tax-free/)).toHaveCount(0);

      const box = page.getByPlaceholder('Quantity');
      await box.fill('20');
      // 20 shares bought at 1,420 against 1,512.70: ₹1,854 of long-term gain.
      await expect(page.getByText('Sell 20: Gain ₹1,854 · long term · tax ≈ ₹0 · ₹1,23,146 exemption left')).toBeVisible();

      await box.fill('61');
      await expect(page.getByText(/^Up to \d+ shares$/)).toBeVisible();
      await expect(page.getByText(/^Sell \d+:/)).toHaveCount(0);

      await box.fill('0');
      await expect(page.getByText(/^Up to \d+ shares$/)).toBeVisible();
    });

    test('Holding page: only manual prices can be edited, and a delete asks first', async ({ page }) => {
      await page.goto(`/ds/investments/${seeded.infy.id}`);
      await expect(page.getByText('Price history')).toBeVisible();
      // Both seeded prices are the user's own manual prices; the Instrument card has an Edit of its own.
      await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(3);
      await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(2);

      await page.getByRole('button', { name: 'Edit' }).first().click();
      const dialog = page.getByRole('dialog', { name: 'Edit manual price' });
      await expect(dialog).toBeVisible();
      await dialog.getByLabel('Price').fill('1500');
      await dialog.getByRole('button', { name: 'Save price' }).click();
      await expect(page.getByText('Price updated', { exact: true })).toBeVisible();
      await expect(shown(page.getByText('₹1,500.00'))).toBeVisible();

      await page.getByRole('button', { name: 'Delete' }).first().click();
      const confirm = page.getByRole('dialog', { name: 'Delete manual price' });
      await expect(confirm.getByText('Only this price is deleted.')).toBeVisible();
      await confirm.getByRole('button', { name: 'Delete price' }).click();
      await expect(page.getByText('Price entry deleted')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(1);
    });

    test('Holding page: a tab shows only its section, paged through the URL', async ({ page }) => {
      await page.goto(`/ds/investments/${seeded.infy.id}`);
      await page.getByRole('tab', { name: /^Trades/ }).click();
      await page.waitForURL(/tab=trades/);
      await expect(page.getByRole('tab', { name: /^Trades/ })).toHaveAttribute('data-state', 'active');
      await expect(page.getByText('Record trade')).toBeVisible();
      await expect(page.getByText('Price history')).toHaveCount(0);

      await page.getByRole('tab', { name: 'Prices' }).click();
      await page.waitForURL(/tab=prices/);
      await expect(page.getByText('Price history')).toBeVisible();
      await expect(page.getByText('By broker')).toHaveCount(0);
    });
  });
}

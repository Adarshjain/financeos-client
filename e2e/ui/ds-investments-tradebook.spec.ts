import type { Locator } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { type SeededTradebook, seedImportJobs, seedTradebook } from '../fixtures/seed/tradebook';
import { expect, test } from '../fixtures/test';

const VIEWPORTS = [
  { name: 'desktop 1440px', width: 1440, height: 900, phone: false },
  { name: 'phone 390px', width: 390, height: 844, phone: true },
];

/** Both Pagers (above and below the list) show this range and total. */
async function expectPager(page: import('@playwright/test').Page, range: string, total: number) {
  const pagers = page.getByRole('navigation', { name: 'Pagination' });
  await expect(pagers).toHaveCount(2);
  for (const pager of await pagers.all()) {
    await expect(pager).toContainText(range);
    await expect(pager).toContainText(`/ ${total}`);
  }
}

/** The copy of a figure drawn once for the phone and once for the desktop: the one on screen. */
const shown = (locator: Locator) => locator.locator('visible=true').first();

for (const viewport of VIEWPORTS) {
  test.describe(`/ds Tradebook, ${viewport.name} (@ui)`, () => {
    let currentUser: CreatedUser;
    let seeded: SeededTradebook;

    test.beforeEach(async ({ context, request, page }) => {
      currentUser = await createUser(request, 'ui-ds-tradebook');
      await loginContext(context, currentUser.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      seeded = await seedTradebook(makeApi(currentUser.cookie));
    });

    /** Opens the trade behind a row: the pencil on desktop, a tap on phone. */
    async function openTrade(page: import('@playwright/test').Page, row: Locator) {
      if (viewport.phone) await row.click();
      else await row.getByRole('button', { name: /^Edit .* trade$/ }).click();
      return page.getByRole('dialog');
    }

    test('lists the newest trades first, 25 a page, with the Pager above and below', async ({ page }) => {
      await page.goto('/investments/tradebook?fy=all');

      await expectPager(page, '1–25', seeded.total);
      // Newest first: the October fund buy, then the sell, then the stock's buys.
      await expect(shown(page.getByText(seeded.fund.name))).toBeVisible();
      await expect(shown(page.getByText(seeded.stock.symbol, { exact: true }))).toBeVisible();
      await expect(shown(page.getByText('Sell', { exact: true }))).toBeVisible();
      await expect(shown(page.getByText('Buy', { exact: true }))).toBeVisible();
      if (viewport.phone) {
        await expect(page.getByText(/realised/)).toHaveCount(0);
        await expect(shown(page.getByText(/5 Oct · 50 units @ ₹100/))).toBeVisible();
      } else {
        for (const header of ['Date', 'Instrument', 'Type', 'Settlement', 'Qty', 'Price', 'Value', 'Charges']) {
          await expect(page.getByText(header, { exact: true }).first()).toBeVisible();
        }
        await expect(page.getByText('5 Oct').first()).toBeVisible();
      }
      // No import has run: no jobs line.
      await expect(page.getByText(/Last import/)).toHaveCount(0);
    });

    test('pages through the server, and an address past the end shows the last page', async ({ page }) => {
      await page.goto('/investments/tradebook?fy=all');
      await page.getByRole('button', { name: 'Page 2' }).first().click();
      await page.waitForURL(/page=2/);
      await expectPager(page, `26–${seeded.total}`, seeded.total);

      await page.goto('/investments/tradebook?fy=all&page=9');
      await page.waitForURL(/page=2/);
      await expectPager(page, `26–${seeded.total}`, seeded.total);
    });

    test('the filters are one URL change each and answered by the server', async ({ page }) => {
      await page.goto('/investments/tradebook?fy=all');

      await page.getByRole('button', { name: seeded.groww.name, exact: true }).click();
      await page.waitForURL(new RegExp(`broker=${seeded.groww.id}`));
      // Groww holds the 13 even-numbered buys and the fund.
      await expectPager(page, '1–14', 14);
      await page.getByRole('button', { name: 'All brokers', exact: true }).click();
      await page.waitForURL((url) => url.search === '?fy=all');

      await page.getByRole('button', { name: 'Sell', exact: true }).click();
      await page.waitForURL(/type=sell/);
      await expectPager(page, '1–1', 1);
      await page.getByRole('button', { name: 'Buy', exact: true }).click();
      await page.waitForURL(/type=buy/);
      await expectPager(page, '1–25', seeded.total - 1);
      await page.getByRole('button', { name: 'Buy', exact: true }).click();
      await page.waitForURL((url) => url.search === '?fy=all');

      await page.getByRole('button', { name: /All years/ }).click();
      await page.getByRole('option', { name: 'FY 26-27' }).click();
      // The current FY has no fy in the address. October 2026: the fund buy and the sell.
      await page.waitForURL((url) => url.search === '');
      await expectPager(page, '1–2', 2);

      await page.getByPlaceholder('Search').fill('zzznothing');
      await page.waitForURL(/q=zzznothing/);
      await expect(page.getByText('No trades match')).toBeVisible();
      await page.getByRole('link', { name: 'Clear filters' }).click();
      await page.waitForURL((url) => url.search === '');
      await expectPager(page, '1–2', 2);
      await page.getByRole('button', { name: /FY 26-27/ }).click();
      await page.getByRole('option', { name: 'All years' }).click();
      await page.waitForURL(/fy=all/);
      await expectPager(page, '1–25', seeded.total);
    });

    test('the page opens on the current financial year', async ({ page }) => {
      await page.goto('/investments/tradebook');
      await expectPager(page, '1–2', 2);
      await expect(page.getByRole('button', { name: /FY 26-27/ }).first()).toBeVisible();
    });

    test('a trade opens filled in, saves a change and shows it in the list', async ({ page }) => {
      await page.goto('/investments/tradebook?type=buy&fy=2026');
      const dialog = await openTrade(page, shown(page.getByRole('button').filter({ hasText: seeded.fund.name })));
      await expect(dialog.getByText('Edit trade')).toBeVisible();
      await expect(dialog.getByText(`${seeded.fund.name} · ${seeded.groww.name} · prices in ₹`)).toBeVisible();
      await expect(dialog.getByLabel('Qty')).toHaveValue('50');
      await expect(dialog.getByLabel('Price')).toHaveValue('100.00');
      await expect(dialog.getByLabel('Date')).toHaveValue('05/10/2026');
      await expect(dialog.getByText('Value ₹5,000 · charges ₹0')).toBeVisible();

      // Nothing is sent for a quantity of zero.
      await dialog.getByLabel('Qty').fill('0');
      await dialog.getByRole('button', { name: 'Save trade' }).click();
      await expect(dialog.getByText('Enter a quantity above zero.')).toBeVisible();

      await dialog.getByLabel('Qty').fill('100');
      await dialog.getByLabel('Brokerage').fill('20');
      await expect(dialog.getByText('Value ₹10,000 · charges ₹20')).toBeVisible();
      await expect(dialog.getByText('Total ₹10,020')).toBeVisible();
      await dialog.getByRole('button', { name: 'Save trade' }).click();

      await expect(page.getByText('Trade updated')).toBeVisible();
      await expect(dialog).toHaveCount(0);
      await expect(shown(page.getByText(viewport.phone ? '₹10,000' : '10,000', { exact: true }))).toBeVisible();
      if (!viewport.phone) await expect(page.getByText('≈20.00', { exact: true })).toBeVisible();
    });

    test('Delete asks first, says what stays, and removes the trade', async ({ page }) => {
      await page.goto('/investments/tradebook?type=sell');
      const dialog = await openTrade(page, shown(page.getByRole('button').filter({ hasText: seeded.stock.symbol })));
      await expect(dialog.getByRole('radio', { name: 'Sell' })).toBeChecked();
      await dialog.getByRole('button', { name: 'Delete', exact: true }).click();

      const confirm = page.getByRole('dialog').last();
      await expect(confirm.getByText(`Delete ${seeded.stock.symbol} · 1 Oct sell?`)).toBeVisible();
      await expect(confirm.getByText(/Other trades, prices and dividends of this instrument stay/)).toBeVisible();
      await confirm.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByText('Edit trade')).toBeVisible();

      await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
      await page.getByRole('dialog').last().getByRole('button', { name: 'Delete trade' }).click();
      await expect(page.getByText('Trade deleted')).toBeVisible();
      await expect(page.getByText('No trades match')).toBeVisible();
    });

    test('the settlement of a sell can be changed', async ({ page }) => {
      await page.goto('/investments/tradebook?type=sell');
      const dialog = await openTrade(page, shown(page.getByRole('button').filter({ hasText: seeded.stock.symbol })));
      await expect(dialog.getByRole('combobox', { name: /Settlement/ })).toContainText('CNC');
      await dialog.getByRole('combobox', { name: /Settlement/ }).click();
      await page.getByRole('option', { name: 'MIS' }).click();
      await expect(dialog.getByText(/^Net ₹/)).toBeVisible();
      await dialog.getByRole('button', { name: 'Save trade' }).click();
      await expect(page.getByText('Trade updated')).toBeVisible();
      await page.reload();
      await expect(shown(page.getByText('MIS', { exact: true }))).toBeVisible();
      await expect(page.getByText('Intraday')).toHaveCount(0);
    });

    test('View job links the last import and the last reconcile to their exact jobs', async ({ page }) => {
      test.setTimeout(90_000); // the Activity page compiles on first visit in a dev client
      const jobs = await seedImportJobs(makeApi(currentUser.cookie), seeded.zerodha.id);
      await page.goto('/investments/tradebook');

      await expect(page.getByText(/Last import \d+ \w+, \d{1,2}:\d\d [ap]m · 0 trades/)).toBeVisible();
      await expect(page.getByText(/Last reconcile \d+ \w+, \d{1,2}:\d\d [ap]m/)).toBeVisible();
      const links = page.getByRole('link', { name: 'View job' });
      await expect(links).toHaveCount(2);
      await expect(links.nth(0)).toHaveAttribute('href', `/settings/activity?job=${jobs.importJobId}`);
      await expect(links.nth(1)).toHaveAttribute('href', `/settings/activity?job=${jobs.reconcileJobId}`);
      await links.nth(1).click();
      await page.waitForURL(new RegExp(`/settings/activity\\?job=${jobs.reconcileJobId}`));
    });
  });
}

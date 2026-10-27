import { readFile } from 'node:fs/promises';

import type { Locator } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import { istToday } from '../fixtures/dates';
import { createBrokerAccount } from '../fixtures/seed/accounts';
import { createFnoTrade } from '../fixtures/seed/investments';
import { expect, test } from '../fixtures/test';

const VIEWPORTS = [
  { name: 'desktop 1440px', width: 1440, height: 900 },
  { name: 'phone 390px', width: 390, height: 844 },
];

/** The copy of a figure drawn once for the phone and once for the desktop: the one on screen. */
const shown = (locator: Locator) => locator.locator('visible=true').first();

for (const viewport of VIEWPORTS) {
  test.describe(`/ds F&O, ${viewport.name} (@ui)`, () => {
    let currentUser: CreatedUser;

    test.beforeEach(async ({ context, request, page }) => {
      currentUser = await createUser(request, 'ui-ds-fno');
      await loginContext(context, currentUser.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const api = makeApi(currentUser.cookie);
      const broker = await createBrokerAccount(api, { name: 'Zerodha Main', clientId: 'ZQ4471' });
      const today = istToday();
      const common = { brokerAccountId: broker.id, entryDate: today, exitDate: today };
      // +5,528.60: a call that won.
      await createFnoTrade(api, {
        ...common,
        tradingSymbol: 'NIFTY26OCT25200CE',
        underlyingSymbol: 'NIFTY',
        contractType: 'option',
        optionType: 'CE',
        strikePrice: 25200,
        expiryDate: today,
        quantity: 75,
        buyValue: 11250,
        sellValue: 16875,
        totalCharges: 96.4,
      });
      // −4,571.20: a put that lost.
      await createFnoTrade(api, {
        ...common,
        tradingSymbol: 'BANKNIFTY26OCT56000PE',
        underlyingSymbol: 'BANKNIFTY',
        contractType: 'option',
        optionType: 'PE',
        strikePrice: 56000,
        expiryDate: today,
        quantity: 30,
        buyValue: 9600,
        sellValue: 5100,
        totalCharges: 71.2,
      });
      // +10,837.40: a future.
      await createFnoTrade(api, {
        ...common,
        tradingSymbol: 'NIFTY26OCTFUT',
        underlyingSymbol: 'NIFTY',
        contractType: 'future',
        expiryDate: today,
        quantity: 75,
        buyValue: 1891500,
        sellValue: 1902750,
        totalCharges: 412.6,
      });
    });

    test('the year figures, the trades, the month and underlying cards and the import link', async ({ page }) => {
      await page.goto('/investments/fno');

      await expect(page.getByRole('tab', { name: /^F&O/ })).toBeVisible();
      await expect(shown(page.getByText('Realised · FY', { exact: true }))).toBeVisible();
      // 5,528.60 − 4,571.20 + 10,837.40 = 11,794.80
      await expect(shown(page.getByText('+₹11,795', { exact: true }))).toBeVisible();
      await expect(shown(page.getByText('3 trades', { exact: true }))).toBeVisible();
      await expect(shown(page.getByText('66.7%', { exact: true }))).toBeVisible();
      await expect(shown(page.getByText('2 of 3', { exact: true }))).toBeVisible();
      await expect(shown(page.getByText('₹580', { exact: true }))).toBeVisible();

      for (const name of ['NIFTY 25200 CE', 'BANKNIFTY 56000 PE', /^NIFTY [A-Z]{3} FUT/]) {
        await expect(shown(page.getByText(name))).toBeVisible();
      }
      await expect(shown(page.getByText('Option · CE', { exact: true }))).toBeVisible();
      await expect(shown(page.getByText('Future', { exact: true }))).toBeVisible();
      await expect(page.getByText('Realised +₹11,795 · taxed as business income')).toBeVisible();

      await expect(page.getByText('P&L by month')).toBeVisible();
      await expect(page.getByText('By underlying')).toBeVisible();
      // Biggest move first: NIFTY +16,366 then BANKNIFTY −4,571.
      await expect(page.getByText('+₹16,366')).toBeVisible();
      await expect(page.getByText('−₹4,571').last()).toBeVisible();

      // The top bar + is a menu; its Import statement row goes to the Import tradebook page.
      await page.getByRole('button', { name: 'Add' }).first().click();
      await expect(page.getByRole('menuitem', { name: 'Import statement' })).toHaveAttribute('href', '/investments/import');
    });

    test('contract, search, sort and year are answered by the server from the URL', async ({ page }) => {
      await page.goto('/investments/fno?contract=PE');
      await expect(shown(page.getByText('BANKNIFTY 56000 PE'))).toBeVisible();
      await expect(page.getByText('NIFTY 25200 CE')).toHaveCount(0);

      await page.goto('/investments/fno?contract=FUT');
      await expect(shown(page.getByText(/^NIFTY [A-Z]{3} FUT/))).toBeVisible();
      await expect(page.getByText('BANKNIFTY 56000 PE')).toHaveCount(0);

      await page.goto('/investments/fno?contract=OPT');
      await expect(shown(page.getByText('NIFTY 25200 CE'))).toBeVisible();
      await expect(shown(page.getByText('BANKNIFTY 56000 PE'))).toBeVisible();
      await expect(page.getByText(/^NIFTY [A-Z]{3} FUT/)).toHaveCount(0);

      // The search matches part of a trading symbol.
      await page.goto('/investments/fno?q=25200');
      await expect(shown(page.getByText('NIFTY 25200 CE'))).toBeVisible();
      await expect(page.getByText('BANKNIFTY 56000 PE')).toHaveCount(0);

      await page.goto('/investments/fno?q=banknifty');
      await expect(shown(page.getByText('BANKNIFTY 56000 PE'))).toBeVisible();
      await expect(page.getByText('NIFTY 25200 CE')).toHaveCount(0);

      await page.goto('/investments/fno?sort=pnl_asc');
      await expect(page.getByRole('button', { name: /Lowest P&L/ })).toBeVisible();
      await expect(page.getByRole('button').filter({ hasText: /NIFTY/ }).first()).toContainText('BANKNIFTY');

      // A year with no trades says so, with no clear-filters (the year is not a filter).
      await page.goto('/investments/fno?fy=2019');
      await expect(page.getByText(/No F&O trades in FY 19-20/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Clear filters' })).toHaveCount(0);

      await page.goto('/investments/fno?contract=PE&q=zzz');
      await expect(page.getByText('No trades match.')).toBeVisible();
    });

    test('the controls change the URL: contract chip, search, sort, year and clear filters', async ({ page }) => {
      await page.goto('/investments/fno');

      await page.getByRole('button', { name: 'PE', exact: true }).click();
      await expect(page).toHaveURL(/contract=PE/);

      await page.goto('/investments/fno');
      await page.getByPlaceholder('Symbol').fill('NIFTY');
      await expect(page).toHaveURL(/q=NIFTY/);

      await page.goto('/investments/fno');
      await page.getByRole('button', { name: /Newest/ }).click();
      await page.getByRole('option', { name: 'Highest P&L' }).click();
      await expect(page).toHaveURL(/sort=pnl_desc/);

      await page.goto('/investments/fno');
      await page.getByRole('button', { name: /^FY \d\d-\d\d/ }).click();
      await page.getByRole('option').nth(2).click();
      await expect(page).toHaveURL(/fy=\d{4}/);
    });

    test('a trade opens from its row, changes and saves, and the figures follow', async ({ page }) => {
      await page.goto('/investments/fno');
      await shown(page.getByText('NIFTY 25200 CE')).click();

      const dialog = page.getByRole('dialog', { name: 'Edit F&O trade' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByLabel('Trading symbol')).toHaveValue('NIFTY26OCT25200CE');
      await expect(dialog.getByLabel('Strike')).toHaveValue('25200');
      await expect(dialog.getByText('Gross +₹5,625 · charges ₹96.40')).toBeVisible();
      await expect(dialog.getByText('Net +₹5,528.60')).toBeVisible();

      await dialog.getByLabel('Sell value').fill('17000');
      await expect(dialog.getByText('Net +₹5,653.60')).toBeVisible();
      await dialog.getByRole('button', { name: 'Save trade' }).click();

      await expect(page.getByText('F&O trade updated', { exact: true })).toBeVisible();
      await expect(dialog).toBeHidden();
      // 5,653.60 − 4,571.20 + 10,837.40 = 11,919.80
      await expect(shown(page.getByText('+₹11,920', { exact: true }))).toBeVisible();
    });

    test('a trade that is not valid is not sent', async ({ page }) => {
      await page.goto('/investments/fno');
      await shown(page.getByText('NIFTY 25200 CE')).click();
      const dialog = page.getByRole('dialog', { name: 'Edit F&O trade' });
      await dialog.getByLabel('Qty / lot size').fill('0');
      await dialog.getByRole('button', { name: 'Save trade' }).click();
      await expect(dialog.getByText('Enter a quantity above zero.')).toBeVisible();
      await expect(dialog).toBeVisible();
    });

    test('Delete asks first, says what goes and what stays, then removes the trade', async ({ page }) => {
      await page.goto('/investments/fno');
      await shown(page.getByText('BANKNIFTY 56000 PE')).click();
      await page.getByRole('dialog', { name: 'Edit F&O trade' }).getByRole('button', { name: 'Delete' }).click();

      const confirm = page.getByRole('dialog', { name: 'Delete F&O trade' });
      await expect(confirm.getByText('Delete the trade for BANKNIFTY26OCT56000PE?')).toBeVisible();
      await expect(confirm.getByText('Only this trade is deleted.')).toBeVisible();
      await expect(confirm.getByText('Your other trades stay.')).toBeVisible();

      // Cancel keeps it.
      await confirm.getByRole('button', { name: 'Cancel' }).click();
      await expect(confirm).toBeHidden();
      await expect(page.getByRole('dialog', { name: 'Edit F&O trade' })).toBeVisible();

      await page.getByRole('dialog', { name: 'Edit F&O trade' }).getByRole('button', { name: 'Delete' }).click();
      await page.getByRole('dialog', { name: 'Delete F&O trade' }).getByRole('button', { name: 'Delete trade' }).click();
      await expect(page.getByText('Deleted the trade for BANKNIFTY26OCT56000PE')).toBeVisible();
      await expect(page.getByText('BANKNIFTY 56000 PE')).toHaveCount(0);
      await expect(shown(page.getByText('2 trades', { exact: true }))).toBeVisible();
    });

    test('All years lists trades from every year, with no month cards and no export', async ({ page }) => {
      const api = makeApi(currentUser.cookie);
      const broker = await createBrokerAccount(api, { name: 'Old Broker', clientId: 'OB1001' });
      // A trade from FY 20-21: only All years shows it.
      await createFnoTrade(api, {
        brokerAccountId: broker.id,
        entryDate: '2020-06-08',
        exitDate: '2020-06-10',
        tradingSymbol: 'FINNIFTY20JUN7000CE',
        underlyingSymbol: 'FINNIFTY',
        contractType: 'option',
        optionType: 'CE',
        strikePrice: 7000,
        expiryDate: '2020-06-25',
        quantity: 40,
        buyValue: 4000,
        sellValue: 6000,
        totalCharges: 50,
      });

      await page.goto('/investments/fno');
      await expect(shown(page.getByText('NIFTY 25200 CE'))).toBeVisible();
      await expect(page.getByText('FINNIFTY 7000 CE')).toHaveCount(0);
      await expect(page.getByText('P&L by month')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Export for ITR' })).toBeVisible();

      await page.getByRole('button', { name: /^FY \d\d-\d\d/ }).click();
      await page.getByRole('option', { name: 'All years' }).click();
      await expect(page).toHaveURL(/fy=all/);
      await expect(page.getByRole('button', { name: /All years/ })).toBeVisible();
      await expect(shown(page.getByText('FINNIFTY 7000 CE'))).toBeVisible();
      await expect(shown(page.getByText('NIFTY 25200 CE'))).toBeVisible();
      await expect(shown(page.getByText('4 trades', { exact: true }))).toBeVisible();
      await expect(shown(page.getByText('Realised · all years', { exact: true }))).toBeVisible();
      await expect(page.getByText('P&L by month')).toHaveCount(0);
      await expect(page.getByText('By underlying')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Export for ITR' })).toHaveCount(0);

      // Back to a single year drops fy from the address.
      await page.getByRole('button', { name: /All years/ }).click();
      await page.getByRole('option').nth(1).click();
      await expect(page).not.toHaveURL(/fy=/);
      await expect(page.getByText('FINNIFTY 7000 CE')).toHaveCount(0);
    });

    test('Export for ITR downloads the year as a CSV', async ({ page }) => {
      await page.goto('/investments/fno');
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export for ITR' }).click();
      const file = await download;
      expect(file.suggestedFilename()).toMatch(/^fno-\d{4}-\d{2}\.csv$/);
      const text = await readFile((await file.path())!, 'utf8');
      expect(text).toContain('Trade date,Underlying,Contract,Strike,Type,Quantity,Buy value,Sell value,Charges');
      expect(text).toContain('NIFTY26OCT25200CE');
      expect(text).toContain('BANKNIFTY26OCT56000PE');
    });
  });
}

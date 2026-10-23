import type { Locator, Page } from '@playwright/test';

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import {
  type CasSpec,
  genCasPdf,
  genGrowwCapitalGainsXlsx,
  genGrowwOrderHistoryXlsx,
  genZerodhaTaxPnlXlsx,
  genZerodhaTradebookCsv,
  type GrowwOrderHistoryRow,
  type ZerodhaRow,
} from '../fixtures/gen/broker-files';
import {
  createBroker,
  createInstrument,
  generateIsin,
  generateYahooSymbol,
  resolveInstrument,
  trade,
  uniqueSeedSuffix,
} from '../fixtures/seed/investments';
import { expect, test } from '../fixtures/test';

const VIEWPORTS = [
  { name: 'desktop 1440px', width: 1440, height: 900 },
  { name: 'phone 390px', width: 390, height: 844 },
];

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** The copy of a control drawn for the phone and for the desktop: the one on screen. */
const shown = (locator: Locator) => locator.locator('visible=true').first();

async function pick(page: Page, field: RegExp, option: RegExp | string) {
  await page.getByRole('combobox', { name: field }).click();
  await page.getByRole('option', { name: option }).click();
}

const upload = (page: Page, zone: string, file: { name: string; mimeType: string; buffer: Buffer }) =>
  page.getByTestId(zone).locator('input[type="file"]').setInputFiles(file);

/** Rows in selection: DataTable marks each row it has selected. */
const selectedRows = (page: Page) => page.locator('[aria-selected="true"]:visible');

for (const viewport of VIEWPORTS) {
  test.describe(`/ds/investments/import, ${viewport.name} (@ui)`, () => {
    let currentUser: CreatedUser;

    test.beforeEach(async ({ context, request, page }) => {
      currentUser = await createUser(request, 'ui-ds-inv-import');
      await loginContext(context, currentUser.cookie);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
    });

    test('Zerodha: upload, review with mapping and selection, import, result, view portfolio', async ({ page }) => {
      test.slow();
      const api = makeApi(currentUser.cookie);
      const broker = await createBroker(api);

      const symKnown = generateYahooSymbol('KNWN');
      const isinKnown = generateIsin();
      const knownName = `Known Inst ${uniqueSeedSuffix()}`;
      const known = await resolveInstrument(api, { type: 'stock', name: knownName, isin: isinKnown, symbol: symKnown, exchange: 'NSE', yahooSymbol: symKnown });
      const symTarget = generateYahooSymbol('TRGT');
      await createInstrument(api, { name: `Target Map Inst ${uniqueSeedSuffix()}`, symbol: symTarget, type: 'stock', exchange: 'NSE' });
      // One trade already on the books: its tradebook row comes back as a duplicate.
      await trade(api, { brokerAccountId: broker.id, instrumentId: known.id, type: 'buy', quantity: 10, price: 100.0, tradeDate: '2026-08-01' });

      const unknownSym1 = `UNMAP${uniqueSeedSuffix()}`;
      const unknownSym2 = `NEWSC${uniqueSeedSuffix()}`;
      const rows: ZerodhaRow[] = [
        { symbol: symKnown, isin: isinKnown, tradeDate: '2026-08-01', tradeType: 'buy', quantity: 10, price: 100.0, tradeId: 't-dup-1' },
        { symbol: symKnown, isin: isinKnown, tradeDate: '2026-08-02', tradeType: 'buy', quantity: 20, price: 105.0, tradeId: 't-deliv-1' },
        { symbol: symKnown, isin: isinKnown, tradeDate: '2026-08-03', tradeType: 'buy', quantity: 15, price: 110.0, tradeId: 't-intra-b' },
        { symbol: symKnown, isin: isinKnown, tradeDate: '2026-08-03', tradeType: 'sell', quantity: 15, price: 115.0, tradeId: 't-intra-s' },
        { symbol: unknownSym1, isin: generateIsin('IN9'), tradeDate: '2026-08-04', tradeType: 'buy', quantity: 5, price: 50.0, tradeId: 't-unres-1' },
        { symbol: unknownSym2, isin: generateIsin('IN8'), tradeDate: '2026-08-04', tradeType: 'buy', quantity: 8, price: 75.0, tradeId: 't-unres-2' },
      ];
      const fnoSymbol = 'NIFTY26AUG24800CE';
      const taxPnl = await genZerodhaTaxPnlXlsx({
        intraday: [{ symbol: symKnown, isin: isinKnown, date: '2026-08-03', quantity: 15, buyValue: 1650.0, sellValue: 1725.0, profit: 75.0 }],
        fno: [{ tradingSymbol: fnoSymbol, quantity: 50, buyValue: 5000.0, sellValue: 6500.0, profit: 1500.0, entryDate: '2026-08-01', exitDate: '2026-08-04' }],
      });

      await page.goto('/ds/investments/import');
      await expect(page.getByText('Investment bulk import')).toBeVisible();
      // Its own page: no Investments tab strip.
      await expect(page.getByRole('tab', { name: /^Tradebook/ })).toHaveCount(0);

      await pick(page, /Broker \/ import type/, /Zerodha reconciliation/);
      await pick(page, /Target broker account/, new RegExp(broker.name));
      await pick(page, /Asset scope/, /Stocks & F&O \(both\)/);
      await upload(page, 'taxpnl-zone', { name: 'zerodha-taxpnl.xlsx', mimeType: XLSX, buffer: taxPnl });
      await upload(page, 'tradebook-zone', { name: 'zerodha-tradebook.csv', mimeType: 'text/csv', buffer: genZerodhaTradebookCsv(rows) });
      await expect(page.getByText('zerodha-tradebook.csv')).toBeVisible();
      await page.getByRole('button', { name: 'Preview reconciliation' }).click();

      // Review: counters, the unmapped banner, alerts, the rows and the F&O trades.
      await expect(page.getByText('Stocks & delivery executions')).toBeVisible({ timeout: 20000 });
      for (const label of ['Executions', 'CNC / MIS', 'Warns / gaps', 'Duplicates']) {
        await expect(shown(page.getByText(label, { exact: true }))).toBeVisible();
      }
      await expect(page.getByText(/have no instrument mapped and will NOT be imported/)).toBeVisible();
      await expect(page.getByText(/Reconciliation alerts & flags/)).toBeVisible();
      await expect(page.getByText('F&O closed trades')).toBeVisible();
      await expect(shown(page.getByText(fnoSymbol))).toBeVisible();
      await expect(shown(page.getByText('Duplicate').first())).toBeVisible();
      await expect(page.getByRole('button', { name: /Import trades \(\d+\)/ })).toBeDisabled();

      // Selection mode is already on: every row but the duplicates is selected, and a tap or a box toggles it.
      const before = await selectedRows(page).count();
      expect(before).toBeGreaterThan(0);
      const toggledRow = shown(page.locator('[aria-selected]').filter({ hasText: unknownSym2 }));
      if (viewport.width > 640) await toggledRow.getByRole('checkbox', { name: 'Select row' }).click();
      else await toggledRow.click({ position: { x: 20, y: 12 } });
      await expect(selectedRows(page)).toHaveCount(before - 1);
      if (viewport.width > 640) await toggledRow.getByRole('checkbox', { name: 'Select row' }).click();
      else await toggledRow.click({ position: { x: 20, y: 12 } });
      await expect(selectedRows(page)).toHaveCount(before);

      // Map one unmatched row to an instrument, create the other.
      await shown(page.getByRole('button', { name: 'Map instrument' })).click();
      await page.getByPlaceholder('Search by name or symbol').fill(symTarget.slice(0, 5));
      await page.getByRole('option', { name: new RegExp(symTarget, 'i') }).first().click();
      await expect(shown(page.getByText('Mapped', { exact: true }))).toBeVisible();
      await shown(page.getByRole('button', { name: 'Create new' })).click();
      await expect(shown(page.getByText('no live price'))).toBeVisible();
      await expect(page.getByText(/have no instrument mapped/)).toHaveCount(0);

      const importButton = page.getByRole('button', { name: /Import trades \(\d+\)/ });
      await expect(importButton).toBeEnabled({ timeout: 10000 });
      await importButton.click();

      // Result.
      await expect(page.getByText('Broker import reconciliation complete')).toBeVisible({ timeout: 30000 });
      await expect(page.getByText('Committed', { exact: true })).toBeVisible();
      await page.getByRole('link', { name: 'Done & view portfolio' }).click();
      await expect(page).toHaveURL(/\/ds\/investments$/);
      await expect(shown(page.getByText(new RegExp(`${knownName}|${symKnown}`)))).toBeVisible({ timeout: 15000 });

      await page.goto('/ds/investments/fno');
      await expect(shown(page.getByText(/NIFTY .*24800 CE/))).toBeVisible({ timeout: 15000 });
    });

    test('Groww: validation, the unmapped banner and Skip unmapped rows, then import', async ({ page }) => {
      test.slow();
      const api = makeApi(currentUser.cookie);
      const broker = await createBroker(api);
      const symKnown = generateYahooSymbol('GWKN');
      const isinKnown = generateIsin();
      await resolveInstrument(api, { type: 'stock', name: `Groww Known ${uniqueSeedSuffix()}`, isin: isinKnown, symbol: symKnown, exchange: 'NSE', yahooSymbol: symKnown });
      const orders: GrowwOrderHistoryRow[] = [
        { stockName: 'Groww Known Corp', symbol: symKnown, isin: isinKnown, type: 'buy', quantity: 20, price: 150.0, executionDate: '2026-08-01', orderStatus: 'Executed', orderId: 'gw-ui-1' },
        { stockName: 'Unmapped Corp', symbol: `GWUNRES${uniqueSeedSuffix()}`, isin: generateIsin('IN9'), type: 'buy', quantity: 10, price: 50.0, executionDate: '2026-08-01', orderStatus: 'Executed', orderId: 'gw-ui-2' },
      ];

      await page.goto('/ds/investments/import');
      await pick(page, /Broker \/ import type/, /Groww reconciliation/);
      await expect(page.getByRole('combobox', { name: /Asset scope/ })).toHaveCount(0);
      await expect(page.getByText('1. Groww Capital Gains (XLSX)')).toBeVisible();

      // The main validation error: nothing chosen. It stays on step 1.
      await page.getByRole('button', { name: 'Preview reconciliation' }).click();
      await expect(page.getByText('Please select a target broker account.')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Preview reconciliation' })).toBeVisible();

      await pick(page, /Target broker account/, new RegExp(broker.name));
      await page.getByRole('button', { name: 'Preview reconciliation' }).click();
      await expect(page.getByText('Please upload at least one Tradebook / Order History file.')).toBeVisible();

      await upload(page, 'tradebook-zone', { name: 'groww-orders.xlsx', mimeType: XLSX, buffer: await genGrowwOrderHistoryXlsx(orders) });
      await page.getByRole('button', { name: 'Preview reconciliation' }).click();
      await expect(page.getByText('Please upload at least one Tax P&L / Capital Gains file.')).toBeVisible();

      await upload(page, 'taxpnl-zone', { name: 'groww-cg.xlsx', mimeType: XLSX, buffer: await genGrowwCapitalGainsXlsx({ shortTerm: [] }) });
      await page.getByRole('button', { name: 'Preview reconciliation' }).click();

      await expect(page.getByText(/no instrument mapped and will NOT be imported/)).toBeVisible({ timeout: 20000 });
      await page.getByRole('button', { name: 'Skip unmapped rows' }).click();
      await expect(page.getByText(/no instrument mapped/)).toHaveCount(0);
      const importButton = page.getByRole('button', { name: /Import trades \(\d+\)/ });
      await expect(importButton).toBeEnabled({ timeout: 5000 });
      await importButton.click();

      await expect(page.getByText('Broker import reconciliation complete')).toBeVisible({ timeout: 30000 });
      await expect(page.getByRole('link', { name: 'Done & view portfolio' })).toBeVisible();
    });

    test('F&O only: the tax P&L alone, then the F&O trades are imported', async ({ page }) => {
      test.slow();
      const api = makeApi(currentUser.cookie);
      const broker = await createBroker(api);
      const fnoSymbol = 'BANKNIFTY26AUG52000PE';
      const taxPnl = await genZerodhaTaxPnlXlsx({
        fno: [{ tradingSymbol: fnoSymbol, quantity: 15, buyValue: 3000.0, sellValue: 4500.0, profit: 1500.0, entryDate: '2026-08-01', exitDate: '2026-08-03' }],
      });

      await page.goto('/ds/investments/import');
      await pick(page, /Target broker account/, new RegExp(broker.name));
      await pick(page, /Asset scope/, /F&O only/);
      await expect(page.getByTestId('tradebook-zone')).toHaveCount(0);
      await expect(page.getByTestId('holdings-zone')).toHaveCount(0);
      await upload(page, 'taxpnl-zone', { name: 'zerodha-fno-pnl.xlsx', mimeType: XLSX, buffer: taxPnl });
      await page.getByRole('button', { name: 'Preview reconciliation' }).click();

      await expect(page.getByText('F&O closed trades')).toBeVisible({ timeout: 20000 });
      await expect(shown(page.getByText(fnoSymbol))).toBeVisible();
      await expect(page.getByText(/Net realized P&L:/)).toBeVisible();
      await page.getByRole('button', { name: /Import trades \(1\)/ }).click();
      await expect(page.getByText('Broker import reconciliation complete')).toBeVisible({ timeout: 30000 });
    });

    test('Mutual funds CAS: the statement transactions are listed, then imported', async ({ page }) => {
      test.slow();
      const api = makeApi(currentUser.cookie);
      const broker = await createBroker(api);
      const cas: CasSpec = {
        investor: 'UI Test Investor',
        amc: 'HDFC',
        folios: [
          {
            folio: '12345678/0',
            schemeName: 'E2E Bluechip Growth Fund',
            isin: 'INF100E2E001', // Wiremock stubbed AMFI fund
            txns: [{ date: '01-Aug-2026', description: 'Purchase', amount: 5000.0, units: 40.5, nav: 123.4567, balance: 40.5 }],
          },
        ],
        password: 'CAS_PASSWORD_123',
      };

      await page.goto('/ds/investments/import');
      await pick(page, /Broker \/ import type/, /Mutual funds CAS/);
      await pick(page, /Target broker account/, new RegExp(broker.name));

      // No file yet.
      await page.getByRole('button', { name: 'Preview reconciliation' }).click();
      await expect(page.getByText('Please select a CAS PDF/CSV file.')).toBeVisible();

      await page.getByLabel('CAS PDF password').fill('CAS_PASSWORD_123');
      await upload(page, 'cas-zone', { name: 'cams-cas-statement.pdf', mimeType: 'application/pdf', buffer: await genCasPdf(cas) });
      await page.getByRole('button', { name: 'Preview reconciliation' }).click();

      await expect(page.getByText('Statement transactions')).toBeVisible({ timeout: 20000 });
      await expect(shown(page.getByText(/E2E Bluechip/))).toBeVisible();
      await expect(selectedRows(page)).toHaveCount(1);
      const importButton = page.getByRole('button', { name: /Import trades \(1\)/ });
      await expect(importButton).toBeEnabled();
      await importButton.click();

      await expect(page.getByText('Broker import reconciliation complete')).toBeVisible({ timeout: 30000 });
      await expect(page.getByText('Committed', { exact: true })).toBeVisible();
      await page.getByRole('link', { name: 'Done & view portfolio' }).click();
      await expect(shown(page.getByText(/E2E Bluechip/))).toBeVisible({ timeout: 15000 });
    });
  });
}

import { makeApi } from '../fixtures/api';
import type { CreatedUser } from '../fixtures/auth';
import { createUser } from '../fixtures/auth';
import { loginContext } from '../fixtures/browser';
import {
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
import { openFno, openInvestments, openTradebook } from '../fixtures/ui';

test.describe('Broker Import & Reconciliation UI (@ui)', () => {
  let currentUser: CreatedUser;

  test.beforeEach(async ({ context, request }) => {
    currentUser = await createUser(request, 'ui-import-reconcile');
    await loginContext(context, currentUser.cookie);
  });

  test('1. Zerodha Stocks & F&O: upload, review counters, badges, map & create new instrument, commit and view portfolio', async ({
    page,
  }) => {
    test.slow();
    const userApi = makeApi(currentUser.cookie);
    const broker = await createBroker(userApi);

    // Pre-create a known mapped instrument
    const symKnown = generateYahooSymbol('KNWN');
    const isinKnown = generateIsin();
    const knownInst = await resolveInstrument(userApi, {
      type: 'stock',
      name: `Known Inst ${uniqueSeedSuffix()}`,
      isin: isinKnown,
      symbol: symKnown,
      exchange: 'NSE',
      yahooSymbol: symKnown,
    });

    // Pre-create an instrument to manually map an unmatched row to
    const symTarget = generateYahooSymbol('TRGT');
    await createInstrument(userApi, {
      name: `Target Map Inst ${uniqueSeedSuffix()}`,
      symbol: symTarget,
      type: 'stock',
      exchange: 'NSE',
    });

    // Seed one existing transaction to produce a Duplicate badge
    await trade(userApi, {
      brokerAccountId: broker.id,
      instrumentId: knownInst.id,
      type: 'buy',
      quantity: 10,
      price: 100.0,
      tradeDate: '2026-08-01',
    });

    const unknownIsin1 = generateIsin('IN9');
    const unknownSym1 = `UNMAP${uniqueSeedSuffix()}`;
    const unknownIsin2 = generateIsin('IN8');
    const unknownSym2 = `NEWSC${uniqueSeedSuffix()}`;

    // Tradebook rows
    const tbRows: ZerodhaRow[] = [
      // 1. Existing duplicate
      { symbol: symKnown, isin: isinKnown, tradeDate: '2026-08-01', tradeType: 'buy', quantity: 10, price: 100.0, tradeId: 't-dup-1' },
      // 2. Delivery buy of known
      { symbol: symKnown, isin: isinKnown, tradeDate: '2026-08-02', tradeType: 'buy', quantity: 20, price: 105.0, tradeId: 't-deliv-1' },
      // 3. Intraday buy + sell of known
      { symbol: symKnown, isin: isinKnown, tradeDate: '2026-08-03', tradeType: 'buy', quantity: 15, price: 110.0, tradeId: 't-intra-b' },
      { symbol: symKnown, isin: isinKnown, tradeDate: '2026-08-03', tradeType: 'sell', quantity: 15, price: 115.0, tradeId: 't-intra-s' },
      // 4. Unmatched row (to map to targetInst)
      { symbol: unknownSym1, isin: unknownIsin1, tradeDate: '2026-08-04', tradeType: 'buy', quantity: 5, price: 50.0, tradeId: 't-unres-1' },
      // 5. Unmatched row (to create new)
      { symbol: unknownSym2, isin: unknownIsin2, tradeDate: '2026-08-04', tradeType: 'buy', quantity: 8, price: 75.0, tradeId: 't-unres-2' },
    ];
    const tbCsv = genZerodhaTradebookCsv(tbRows);

    const fnoSymbol = 'NIFTY26AUG24800CE';
    const taxPnlXlsx = await genZerodhaTaxPnlXlsx({
      intraday: [
        {
          symbol: symKnown,
          isin: isinKnown,
          date: '2026-08-03',
          quantity: 15,
          buyValue: 1650.0,
          sellValue: 1725.0,
          profit: 75.0,
        },
      ],
      fno: [
        {
          tradingSymbol: fnoSymbol,
          quantity: 50,
          buyValue: 5000.0,
          sellValue: 6500.0,
          profit: 1500.0,
          entryDate: '2026-08-01',
          exitDate: '2026-08-04',
        },
      ],
    });

    // 1. Open Tradebook page and launch Import Wizard
    await openTradebook(page);
    await page.getByRole('button', { name: /Bulk Import \/ Reconcile|Import Statement/i }).click();
    await expect(page.getByRole('heading', { name: 'Investment Bulk Import' })).toBeVisible();

    // 2. Step 1: Select Broker, Account, Asset Scope
    const form = page.locator('#import-step1-form');
    const modeSelect = form.getByRole('combobox').first();
    await modeSelect.click();
    await page.getByRole('option', { name: /Zerodha Reconciliation/i }).click();

    const brokerSelect = form.getByRole('combobox').nth(1);
    await brokerSelect.click();
    await page.getByRole('option', { name: new RegExp(broker.name, 'i') }).click();

    const scopeSelect = form.getByRole('combobox').nth(2);
    await scopeSelect.click();
    await page.getByRole('option', { name: /Stocks & F&O \(Both\)/i }).click();

    // Upload files
    await page.locator('input#taxpnl-file-input').setInputFiles({
      name: 'zerodha-taxpnl.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: taxPnlXlsx,
    });
    await page.locator('input#tradebook-file-input').setInputFiles({
      name: 'zerodha-tradebook.csv',
      mimeType: 'text/csv',
      buffer: tbCsv,
    });

    // Submit Step 1
    await page.getByRole('button', { name: 'Preview Reconciliation' }).click();

    // 3. Step 2: Review
    await expect(page.getByText('Executions')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('CNC / MIS')).toBeVisible();
    await expect(page.getByText('Duplicates')).toBeVisible();

    // Badges visible
    await expect(page.getByText('Duplicate').and(page.locator(':visible')).first()).toBeVisible();
    await expect(page.getByText('INTRADAY').and(page.locator(':visible')).first()).toBeVisible();
    await expect(page.getByText('DELIVERY').and(page.locator(':visible')).first()).toBeVisible();

    // Map instrument for the first unmatched row
    await page.getByRole('button', { name: 'Map instrument' }).filter({ visible: true }).first().click();
    const searchInput = page.getByPlaceholder(/Search for|Search instrument/i);
    await searchInput.fill(symTarget.slice(0, 5));
    await page.getByRole('button', { name: new RegExp(symTarget, 'i') }).first().click();
    await expect(page.getByText(new RegExp(`✓.*${symTarget}|✓ Mapped`, 'i')).filter({ visible: true }).first()).toBeVisible();
    // Create new instrument for the other unmatched row. The 300 ms pause is deliberate and the only
    // sleep in the suite: after picking an instrument, the Radix popover dismisses asynchronously and
    // swallows the next pointer event; there is no DOM signal to wait on (the popover heading is
    // already gone). Row-scoped clicks and waiting on the heading both proved flakier than this.
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Create new' }).filter({ visible: true }).first().click();
    await expect(page.getByText(/✦ New:/i).filter({ visible: true }).first()).toBeVisible();

    // Import Trades button enabled and clicked
    const importBtn = page.getByRole('button', { name: /Import Trades \(\d+\)/i });
    await expect(importBtn).toBeEnabled({ timeout: 10000 });
    await importBtn.click();

    // 4. Step 3: Result
    await expect(page.getByText('Broker Import Reconciliation Complete!')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Committed')).toBeVisible();

    await page.getByRole('button', { name: 'Done & View Portfolio' }).click();

    // 5. Verify portfolio and F&O pages
    await openInvestments(page);
    await expect(page.getByText(symKnown).first()).toBeVisible({ timeout: 10000 });

    await openFno(page);
    await expect(page.getByText(fnoSymbol).and(page.locator(':visible')).first()).toBeVisible({ timeout: 10000 });
  });

  test('2. F&O only: Tradebook and holdings inputs hidden, single-column layout, import F&O trades', async ({
    page,
  }) => {
    test.slow();
    const userApi = makeApi(currentUser.cookie);
    const broker = await createBroker(userApi);

    const fnoSymbol = 'BANKNIFTY26AUG52000PE';
    const taxPnlXlsx = await genZerodhaTaxPnlXlsx({
      fno: [
        {
          tradingSymbol: fnoSymbol,
          quantity: 15,
          buyValue: 3000.0,
          sellValue: 4500.0,
          profit: 1500.0,
          entryDate: '2026-08-01',
          exitDate: '2026-08-03',
        },
      ],
    });

    await openTradebook(page);
    await page.getByRole('button', { name: /Bulk Import \/ Reconcile|Import Statement/i }).click();

    const form = page.locator('#import-step1-form');
    const modeSelect = form.getByRole('combobox').first();
    await modeSelect.click();
    await page.getByRole('option', { name: /Zerodha Reconciliation/i }).click();

    const brokerSelect = form.getByRole('combobox').nth(1);
    await brokerSelect.click();
    await page.getByRole('option', { name: new RegExp(broker.name, 'i') }).click();

    const scopeSelect = form.getByRole('combobox').nth(2);
    await scopeSelect.click();
    await page.getByRole('option', { name: /F&O only/i }).click();

    // Verify tradebook input is hidden
    await expect(page.locator('input#tradebook-file-input')).toBeHidden();
    await expect(page.locator('input#holdings-file-input')).toBeHidden();

    // Upload Tax P&L only
    await page.locator('input#taxpnl-file-input').setInputFiles({
      name: 'zerodha-fno-pnl.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: taxPnlXlsx,
    });

    await page.getByRole('button', { name: 'Preview Reconciliation' }).click();

    // Step 2: F&O Closed Trades visible
    await expect(page.getByText('F&O Closed Trades')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(fnoSymbol).and(page.locator(':visible')).first()).toBeVisible();

    const importBtn = page.getByRole('button', { name: /Import Trades \(\d+\)/i });
    await expect(importBtn).toBeEnabled();
    await importBtn.click();

    await expect(page.getByText('Broker Import Reconciliation Complete!')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Done & View Portfolio' }).click();
  });

  test('3. Groww: order history + capital gains with unmapped rows banner and Skip unmapped rows flow', async ({
    page,
  }) => {
    test.slow();
    const userApi = makeApi(currentUser.cookie);
    const broker = await createBroker(userApi);

    const symKnown = generateYahooSymbol('GWKN');
    const isinKnown = generateIsin();
    await resolveInstrument(userApi, {
      type: 'stock',
      name: `Groww Known ${uniqueSeedSuffix()}`,
      isin: isinKnown,
      symbol: symKnown,
      exchange: 'NSE',
      yahooSymbol: symKnown,
    });

    const unknownSym = `GWUNRES${uniqueSeedSuffix()}`;
    const unknownIsin = generateIsin('IN9');

    const orderRows: GrowwOrderHistoryRow[] = [
      {
        stockName: 'Groww Known Corp',
        symbol: symKnown,
        isin: isinKnown,
        type: 'buy',
        quantity: 20,
        price: 150.0,
        executionDate: '2026-08-01',
        orderStatus: 'Executed',
        orderId: 'gw-ui-1',
      },
      {
        stockName: 'Unmapped Corp',
        symbol: unknownSym,
        isin: unknownIsin,
        type: 'buy',
        quantity: 10,
        price: 50.0,
        executionDate: '2026-08-01',
        orderStatus: 'Executed',
        orderId: 'gw-ui-2',
      },
    ];
    const orderXlsx = await genGrowwOrderHistoryXlsx(orderRows);
    const cgXlsx = await genGrowwCapitalGainsXlsx({ shortTerm: [] });

    await openTradebook(page);
    await page.getByRole('button', { name: /Bulk Import \/ Reconcile|Import Statement/i }).click();

    const form = page.locator('#import-step1-form');
    const modeSelect = form.getByRole('combobox').first();
    await modeSelect.click();
    await page.getByRole('option', { name: /Groww Reconciliation/i }).click();

    const brokerSelect = form.getByRole('combobox').nth(1);
    await brokerSelect.click();
    await page.getByRole('option', { name: new RegExp(broker.name, 'i') }).click();

    await page.locator('input#taxpnl-file-input').setInputFiles({
      name: 'groww-cg.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: cgXlsx,
    });
    await page.locator('input#tradebook-file-input').setInputFiles({
      name: 'groww-orders.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: orderXlsx,
    });

    await page.getByRole('button', { name: 'Preview Reconciliation' }).click();

    // Step 2: Unmapped red banner is displayed
    await expect(page.getByText(/no instrument mapped and will NOT be imported/i)).toBeVisible({
      timeout: 15000,
    });

    // Click "Skip unmapped rows"
    await page.getByRole('button', { name: 'Skip unmapped rows' }).click();

    // Import button should now be enabled for the remaining row
    const importBtn = page.getByRole('button', { name: /Import Trades \(\d+\)/i });
    await expect(importBtn).toBeEnabled({ timeout: 5000 });
    await importBtn.click();

    await expect(page.getByText('Broker Import Reconciliation Complete!')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Done & View Portfolio' }).click();
  });

  test('4. Mobile: Step 2 review renders and scrolls properly @mobile', async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 375, height: 667 });

    const userApi = makeApi(currentUser.cookie);
    const broker = await createBroker(userApi);

    const sym = generateYahooSymbol('MOBI');
    const isin = generateIsin();
    await resolveInstrument(userApi, {
      type: 'stock',
      name: `Mobile Scrip ${uniqueSeedSuffix()}`,
      isin,
      symbol: sym,
      exchange: 'NSE',
      yahooSymbol: sym,
    });

    const tbRows: ZerodhaRow[] = [
      { symbol: sym, isin, tradeDate: '2026-08-01', tradeType: 'buy', quantity: 10, price: 100.0, tradeId: 'm-1' },
      { symbol: sym, isin, tradeDate: '2026-08-02', tradeType: 'sell', quantity: 10, price: 110.0, tradeId: 'm-2' },
    ];
    const tbCsv = genZerodhaTradebookCsv(tbRows);
    const taxPnlXlsx = await genZerodhaTaxPnlXlsx({ shortTerm: [] });

    await openTradebook(page);
    await page.getByRole('button', { name: /Bulk Import \/ Reconcile|Import Statement/i }).click();

    const form = page.locator('#import-step1-form');
    const modeSelect = form.getByRole('combobox').first();
    await modeSelect.click();
    await page.getByRole('option', { name: /Zerodha Reconciliation/i }).click();

    const brokerSelect = form.getByRole('combobox').nth(1);
    await brokerSelect.click();
    await page.getByRole('option', { name: new RegExp(broker.name, 'i') }).click();

    await page.locator('input#taxpnl-file-input').setInputFiles({
      name: 'zerodha-taxpnl.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: taxPnlXlsx,
    });
    await page.locator('input#tradebook-file-input').setInputFiles({
      name: 'zerodha-tradebook.csv',
      mimeType: 'text/csv',
      buffer: tbCsv,
    });

    await page.getByRole('button', { name: 'Preview Reconciliation' }).click();

    // Step 2 review list view on mobile
    await expect(page.getByText('Executions')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(sym).and(page.locator(':visible')).first()).toBeVisible();

    // Scroll down in review dialog
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  });
});

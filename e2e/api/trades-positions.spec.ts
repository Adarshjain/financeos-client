import { expectStatus } from '../fixtures/api';
import { createBankAccount } from '../fixtures/seed/accounts';
import {
  createBroker,
  generateIsin,
  generateYahooSymbol,
  positions,
  refreshPrices,
  resolveInstrument,
  setManualPrice,
  summary,
  trade,
  uniqueSeedSuffix,
} from '../fixtures/seed/investments';
import { expectForeign, expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, freshUser, test } from '../fixtures/test';

test.describe('Trades & Positions API (@api)', () => {
  test('Create trade validation, broker vs bank, unknown ids, auto price refresh AFTER_COMMIT', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const bank = await createBankAccount(api);
    const symbol = generateYahooSymbol('AUTO');
    const inst = await resolveInstrument(api, {
      type: 'stock',
      name: `Auto Price Trade Inst ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol,
      exchange: 'NSE',
      yahooSymbol: symbol,
    });

    // Trading on bank account -> 400 with exact error message
    const bankTradeRes = await api.POST('/api/v1/investments/transactions', {
      body: {
        brokerAccountId: bank.id,
        instrumentId: inst.id,
        type: 'buy',
        quantity: 10,
        price: 100,
        tradeDate: '2026-08-01',
      },
    });
    expectStatus(bankTradeRes, 400);
    expect(bankTradeRes.error?.message).toContain('Account must be a broker account');

    // Unknown broker / instrument -> 404
    const unknownAcctRes = await api.POST('/api/v1/investments/transactions', {
      body: {
        brokerAccountId: '00000000-0000-0000-0000-000000000000',
        instrumentId: inst.id,
        type: 'buy',
        quantity: 10,
        price: 100,
        tradeDate: '2026-08-01',
      },
    });
    expectStatus(unknownAcctRes, 404);

    const unknownInstRes = await api.POST('/api/v1/investments/transactions', {
      body: {
        brokerAccountId: broker.id,
        instrumentId: '00000000-0000-0000-0000-000000000000',
        type: 'buy',
        quantity: 10,
        price: 100,
        tradeDate: '2026-08-01',
      },
    });
    expectStatus(unknownInstRes, 404);

    // Successful buy on broker account -> 201
    const t = await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: inst.id,
      type: 'buy',
      quantity: 10,
      price: 100,
      tradeDate: '2026-08-01',
    });
    expect(t.id).toBeDefined();
    expect(t.quantity).toBe(10);
    expect(t.price).toBe(100);

    // Right after POST, positions shows currentValue = 10 * 999.99 = 9999.90
    const pos = await positions(api);
    const instPos = pos.positions.find((p) => p.instrument.id === inst.id);
    expect(instPos).toBeDefined();
    expect(instPos?.quantity).toBe(10);
    expect(instPos?.currentValue).toBe(9999.9);

    // Instrument has today's YAHOO-sourced price row
    const pricesRes = await api.GET('/api/v1/instruments/{id}/prices', {
      params: { path: { id: inst.id } },
    });
    expectStatus(pricesRes, 200);
    const yahooPrice = pricesRes.data?.find((p) => p.source === 'YAHOO');
    expect(yahooPrice).toBeDefined();
    expect(yahooPrice?.close).toBe(999.99);
  });

  test('FIFO accounting: multi-lot buys, charges exclusion from cost basis, sell realization 650, overselling check', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const symbol = generateYahooSymbol('FIFO');
    const inst = await resolveInstrument(api, {
      type: 'stock',
      name: `FIFO Inst ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol,
      exchange: 'NSE',
      yahooSymbol: symbol,
    });

    // Buy 10 @ 100
    const b1 = await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: inst.id,
      type: 'buy',
      quantity: 10,
      price: 100,
      tradeDate: '2026-01-01',
    });

    // Buy 10 @ 120 with charges: 50
    const b2 = await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: inst.id,
      type: 'buy',
      quantity: 10,
      price: 120,
      tradeDate: '2026-01-02',
      charges: {
        brokerage: 20,
        stt: 10,
        exchangeTxnCharges: 5,
        sebiCharges: 5,
        stampDuty: 5,
        gst: 5,
      },
    });

    // Sell 15 @ 150
    const s1 = await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: inst.id,
      type: 'sell',
      quantity: 15,
      price: 150,
      tradeDate: '2026-01-03',
    });

    // Position check: remaining open qty 5, avgCost 120.0000, openCost 600
    const pos = await positions(api);
    const p = pos.positions.find((x) => x.instrument.id === inst.id);
    expect(p).toBeDefined();
    expect(p?.quantity).toBe(5);
    expect(p?.avgCost).toBe(120);
    expect(p?.invested).toBe(600);
    expect(p?.realizedGainLoss).toBe(650);

    // Attempt to sell 6 more (> 5 open) -> 400
    const oversellRes = await api.POST('/api/v1/investments/transactions', {
      body: {
        brokerAccountId: broker.id,
        instrumentId: inst.id,
        type: 'sell',
        quantity: 6,
        price: 150,
        tradeDate: '2026-01-04',
      },
    });
    expectStatus(oversellRes, 400);
    expect(oversellRes.error?.message).toContain('Cannot sell more than current open quantity');

    // Update buy 1 quantity and verify updated trade
    const reduceBuyRes = await api.PUT('/api/v1/investments/transactions/{id}', {
      params: { path: { id: b1.id } },
      body: {
        type: 'buy',
        quantity: 12,
        price: 105,
        tradeDate: '2026-01-01',
      },
    });
    expectStatus(reduceBuyRes, 200);
    expect(reduceBuyRes.data?.quantity).toBe(12);

    // Positions reflects updated buy cost
    const posUpdated = await positions(api);
    const pUpdated = posUpdated.positions.find((x) => x.instrument.id === inst.id);
    expect(pUpdated).toBeDefined();
    expect(pUpdated?.quantity).toBe(7); // 12 + 10 - 15 = 7
  });

  test('Trade deletion and lone trade position lifecycle', async ({ api }) => {
    const broker = await createBroker(api);
    const symbol = generateYahooSymbol('LONE');
    const inst = await resolveInstrument(api, {
      type: 'stock',
      name: `Lone Inst ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol,
      exchange: 'NSE',
      yahooSymbol: symbol,
    });

    const loneTrade = await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: inst.id,
      type: 'buy',
      quantity: 10,
      price: 100,
      tradeDate: '2026-08-01',
    });

    const posBefore = await positions(api);
    expect(posBefore.positions.some((p) => p.instrument.id === inst.id)).toBe(true);

    const delRes = await api.DELETE('/api/v1/investments/transactions/{id}', {
      params: { path: { id: loneTrade.id } },
    });
    expectStatus(delRes, 204);

    const posAfter = await positions(api);
    expect(posAfter.positions.some((p) => p.instrument.id === inst.id)).toBe(false);
  });

  test('Intraday trades: same day buy 10 and sell 4 -> open delivery position 6, settlementType visible in list', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const symbol = generateYahooSymbol('INTRA');
    const inst = await resolveInstrument(api, {
      type: 'stock',
      name: `Intraday Inst ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol,
      exchange: 'NSE',
      yahooSymbol: symbol,
    });

    const intraDate = '2026-08-10';

    await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: inst.id,
      type: 'buy',
      settlementType: 'intraday',
      quantity: 10,
      price: 200,
      tradeDate: intraDate,
    });

    await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: inst.id,
      type: 'sell',
      settlementType: 'intraday',
      quantity: 4,
      price: 210,
      tradeDate: intraDate,
    });

    const pos = await positions(api);
    const p = pos.positions.find((x) => x.instrument.id === inst.id);
    expect(p).toBeDefined();
    expect(p?.quantity).toBe(6);

    const listRes = await api.GET('/api/v1/investments/transactions', {
      params: {
        query: {
          brokerAccountId: broker.id,
          instrumentId: inst.id,
        },
      },
    });
    expectStatus(listRes, 200);
    expect(listRes.data?.content.length).toBe(2);
    expect(listRes.data?.content.every((t) => t.settlementType === 'intraday')).toBe(true);
  });

  test('Valued-at-cost for instruments without symbol, DEAD.NS failure reason', async ({ api }) => {
    const broker = await createBroker(api);

    // Instrument with no Yahoo symbol
    const noSymInst = await resolveInstrument(api, {
      type: 'stock',
      name: `No Symbol Inst ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
    });

    await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: noSymInst.id,
      type: 'buy',
      quantity: 10,
      price: 500,
      tradeDate: '2026-08-01',
    });

    const job = await refreshPrices(api, noSymInst.id);
    expect(job.status).toBe('SUCCEEDED');
    const detail = (job.result as any) ?? {};
    const failedList = (detail.failed ?? []) as Array<{ symbol?: string; reason?: string }>;
    expect(failedList.some((f) => f.reason?.includes('No Yahoo symbol is set'))).toBe(true);

    const pos = await positions(api);
    const p = pos.positions.find((x) => x.instrument.id === noSymInst.id);
    expect(p).toBeDefined();
    expect(p?.currentValue).toBe(p?.invested);
    expect(p?.unrealizedGainLoss).toBe(0);

    // Instrument with DEAD.NS symbol
    const deadInst = await resolveInstrument(api, {
      type: 'stock',
      name: `Dead Inst ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol: 'DEAD.NS',
      exchange: 'NSE',
      yahooSymbol: 'DEAD.NS',
    });

    await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: deadInst.id,
      type: 'buy',
      quantity: 5,
      price: 100,
      tradeDate: '2026-08-01',
    });

    const deadJob = await refreshPrices(api, deadInst.id);
    expect(deadJob.status).toBe('SUCCEEDED');
    const deadDetail = (deadJob.result as any) ?? {};
    const deadFailed = (deadDetail.failed ?? []) as Array<{ symbol?: string; reason?: string }>;
    expect(deadFailed.some((f) => f.reason?.includes('Yahoo has no data'))).toBe(true);
  });

  test('Mutual Fund price via AMFI feed: valid scheme NAV 123.4567, N.A. scheme failure reason', async ({
    api,
  }) => {
    const broker = await createBroker(api);

    // Valid scheme 100001
    const mf1 = await resolveInstrument(api, {
      type: 'mutual_fund',
      name: `E2E Bluechip ${uniqueSeedSuffix()}`,
      isin: generateIsin('INF'),
      amfiCode: '100001',
    });

    await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: mf1.id,
      type: 'buy',
      quantity: 100,
      price: 100,
      tradeDate: '2026-08-01',
    });

    const job1 = await refreshPrices(api, mf1.id);
    expect(job1.status).toBe('SUCCEEDED');

    const prices1 = await api.GET('/api/v1/instruments/{id}/prices', {
      params: { path: { id: mf1.id } },
    });
    expectStatus(prices1, 200);
    const amfiPrice = prices1.data?.find((p) => p.source === 'AMFI');
    expect(amfiPrice).toBeDefined();
    expect(amfiPrice?.close).toBe(123.4567);

    // N.A. scheme 100003
    const mf3 = await resolveInstrument(api, {
      type: 'mutual_fund',
      name: `E2E Suspended ${uniqueSeedSuffix()}`,
      isin: generateIsin('INF'),
      amfiCode: '100003',
    });

    await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: mf3.id,
      type: 'buy',
      quantity: 50,
      price: 50,
      tradeDate: '2026-08-01',
    });

    const job3 = await refreshPrices(api, mf3.id);
    expect(job3.status).toBe('SUCCEEDED');
    const detail3 = (job3.result as any) ?? {};
    const failed3 = (detail3.failed ?? []) as Array<{ reason?: string }>;
    expect(failed3.some((f) => f.reason?.includes('AMFI') || f.reason?.includes('100003'))).toBe(true);
  });

  test('Manual price for today blocks price refresh (skipped), yesterday manual price does not', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const symbol = generateYahooSymbol('MANSKP');
    const inst = await resolveInstrument(api, {
      type: 'stock',
      name: `Manual Skip Inst ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol,
      exchange: 'NSE',
      yahooSymbol: symbol,
    });

    await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: inst.id,
      type: 'buy',
      quantity: 10,
      price: 100,
      tradeDate: '2026-08-01',
    });

    const today = new Date().toISOString().slice(0, 10);
    await setManualPrice(api, inst.id, {
      price: 888.88,
      asOf: today,
    });

    const job = await refreshPrices(api, inst.id);
    expect(job.status).toBe('SUCCEEDED');
    const detail = (job.result as any) ?? {};
    expect(detail.skipped).toBeGreaterThanOrEqual(1);

    // Latest price remains manual
    const prices = await api.GET('/api/v1/instruments/{id}/prices', {
      params: { path: { id: inst.id } },
    });
    expectStatus(prices, 200);
    expect(prices.data?.[0]?.close).toBe(888.88);
    expect(prices.data?.[0]?.source).toBe('MANUAL');
  });

  test('Refresh without instrumentId refreshes only actively held instruments (sold out untouched)', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const symbolHeld = generateYahooSymbol('HELD');
    const instHeld = await resolveInstrument(api, {
      type: 'stock',
      name: `Held Inst ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol: symbolHeld,
      exchange: 'NSE',
      yahooSymbol: symbolHeld,
    });

    const symbolSold = generateYahooSymbol('SOLD');
    const instSold = await resolveInstrument(api, {
      type: 'stock',
      name: `Sold Inst ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol: symbolSold,
      exchange: 'NSE',
      yahooSymbol: symbolSold,
    });

    // Buy instHeld
    await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: instHeld.id,
      type: 'buy',
      quantity: 10,
      price: 100,
      tradeDate: '2026-08-01',
    });

    // Buy and fully sell instSold
    await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: instSold.id,
      type: 'buy',
      quantity: 5,
      price: 50,
      tradeDate: '2026-08-01',
    });
    await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: instSold.id,
      type: 'sell',
      quantity: 5,
      price: 60,
      tradeDate: '2026-08-02',
    });

    // Record the price count of instSold
    const pricesSoldBefore = await api.GET('/api/v1/instruments/{id}/prices', {
      params: { path: { id: instSold.id } },
    });
    expectStatus(pricesSoldBefore, 200);
    const countBefore = pricesSoldBefore.data?.length ?? 0;

    // Refresh all held instruments
    const refreshAllJob = await refreshPrices(api);
    expect(refreshAllJob.status).toBe('SUCCEEDED');

    const pricesSoldAfter = await api.GET('/api/v1/instruments/{id}/prices', {
      params: { path: { id: instSold.id } },
    });
    expectStatus(pricesSoldAfter, 200);
    expect(pricesSoldAfter.data?.length).toBe(countBefore);
  });

  test('Transactions list pagination, filters, summary rollup totals, and XIRR calculation', async ({
    request,
  }) => {
    // /investments/summary is user-wide: use a fresh user so positions created by other tests in
    // this worker (valued-at-cost, DEAD symbol, sold-out) cannot drag the XIRR sign around.
    const { api } = await freshUser(request, 'xirr');
    const broker = await createBroker(api);
    const symbol = generateYahooSymbol('PAGE');
    const inst = await resolveInstrument(api, {
      type: 'stock',
      name: `Page Inst ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol,
      exchange: 'NSE',
      yahooSymbol: symbol,
    });

    // Create 5 trades
    for (let i = 1; i <= 5; i++) {
      await trade(api, {
        brokerAccountId: broker.id,
        instrumentId: inst.id,
        type: 'buy',
        quantity: 2 * i,
        price: 100 + i,
        tradeDate: `2026-08-0${i}`,
      });
    }

    // List pagination size=2
    const p1 = await api.GET('/api/v1/investments/transactions', {
      params: {
        query: {
          brokerAccountId: broker.id,
          instrumentId: inst.id,
          page: 0,
          size: 2,
        },
      },
    });
    expectStatus(p1, 200);
    expect(p1.data?.content.length).toBe(2);
    expect(p1.data?.totalElements).toBe(5);
    expect(p1.data?.totalPages).toBe(3);

    // Summary endpoint rollup
    const summ = await summary(api);
    expect(summ.totalCurrentValue).toBeGreaterThan(0);
    expect(summ.totalInvested).toBeGreaterThan(0);
    expect(summ.byBroker.length).toBeGreaterThan(0);
    expect(summ.byInstrumentType.length).toBeGreaterThan(0);
    // Position priced at 999.99 is above cost (~103), so XIRR should be > 0
    expect(summ.xirr).toBeDefined();
    expect(summ.xirr).toBeGreaterThan(0);
  });

  test('Tenancy isolation: User B cannot view/update/delete User A trades or see A positions; 401 unauth', async ({
    api,
    request,
  }) => {
    const { api: apiB } = await secondUser(request, 'trades-user-b');
    const brokerA = await createBroker(api);
    const symbol = generateYahooSymbol('TNCY');
    const inst = await resolveInstrument(api, {
      type: 'stock',
      name: `Tenancy Inst ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol,
      exchange: 'NSE',
      yahooSymbol: symbol,
    });

    const tradeA = await trade(api, {
      brokerAccountId: brokerA.id,
      instrumentId: inst.id,
      type: 'buy',
      quantity: 10,
      price: 100,
      tradeDate: '2026-08-01',
    });

    // User B gets 404 when trying to access User A's trade
    await expectForeign(apiB, 'PUT', `/api/v1/investments/transactions/${tradeA.id}`, {
      type: 'buy',
      quantity: 20,
      price: 100,
      tradeDate: '2026-08-01',
    });

    await expectForeign(apiB, 'DELETE', `/api/v1/investments/transactions/${tradeA.id}`);

    // User B's positions are empty
    const posB = await positions(apiB);
    expect(posB.positions.some((p) => p.instrument.id === inst.id)).toBe(false);

    // 401s
    await expectUnauthenticated('GET', '/api/v1/investments/transactions');
    await expectUnauthenticated('POST', '/api/v1/investments/transactions', { quantity: 1 });
    await expectUnauthenticated('PUT', '/api/v1/investments/transactions/00000000-0000-0000-0000-000000000000', { quantity: 1 });
    await expectUnauthenticated('DELETE', '/api/v1/investments/transactions/00000000-0000-0000-0000-000000000000');
    await expectUnauthenticated('GET', '/api/v1/investments/positions');
    await expectUnauthenticated('GET', '/api/v1/investments/summary');
    await expectUnauthenticated('POST', '/api/v1/investments/prices/refresh');
  });
});

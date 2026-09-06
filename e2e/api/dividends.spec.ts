import { expectStatus } from '../fixtures/api';
import {
  acceptSuggestions,
  createBroker,
  createDividend,
  dividendSuggestions,
  generateIsin,
  generateYahooSymbol,
  resolveInstrument,
  trade,
  uniqueSeedSuffix,
} from '../fixtures/seed/investments';
import { expectForeign, expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Dividends API (@api)', () => {
  test('Dividend creation validation: holding requirement, CRUD lifecycle, and 404s', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const symbol = generateYahooSymbol('DIV');
    const inst = await resolveInstrument(api, {
      type: 'stock',
      name: `Dividend Inst ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol,
      exchange: 'NSE',
      yahooSymbol: symbol,
    });

    // 1. Create dividend without an existing holding -> 400 with exact error message
    const noHoldRes = await api.POST('/api/v1/investments/dividends', {
      body: {
        brokerAccountId: broker.id,
        instrumentId: inst.id,
        type: 'dividend',
        amount: 500,
        payDate: '2026-08-01',
      },
    });
    expectStatus(noHoldRes, 400);
    expect(noHoldRes.error?.message).toContain(`No holding found for broker account ${broker.id} and instrument ${inst.id}`);

    // Create holding via a trade
    await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: inst.id,
      type: 'buy',
      quantity: 100,
      price: 50,
      tradeDate: '2026-07-01',
    });

    // 2. Create dividend with holding present -> 201
    const div = await createDividend(api, {
      brokerAccountId: broker.id,
      instrumentId: inst.id,
      type: 'dividend',
      amount: 500,
      perUnit: 5,
      tds: 50,
      exDate: '2026-07-15',
      payDate: '2026-08-01',
      notes: 'Quarterly dividend',
    });
    expect(div.id).toBeDefined();
    expect(div.amount).toBe(500);
    expect(div.tds).toBe(50);
    expect(div.source).toBe('manual');

    // 3. PUT /investments/dividends/{id}
    const updateRes = await api.PUT('/api/v1/investments/dividends/{id}', {
      params: { path: { id: div.id } },
      body: {
        type: 'dividend',
        amount: 600,
        perUnit: 6,
        tds: 60,
        exDate: '2026-07-15',
        payDate: '2026-08-01',
        notes: 'Updated dividend notes',
      },
    });
    expectStatus(updateRes, 200);
    expect(updateRes.data?.amount).toBe(600);
    expect(updateRes.data?.notes).toBe('Updated dividend notes');

    // 4. DELETE /investments/dividends/{id}
    const delRes = await api.DELETE('/api/v1/investments/dividends/{id}', {
      params: { path: { id: div.id } },
    });
    expectStatus(delRes, 204);

    // 5. Unknown id -> 404
    const unknownRes = await api.PUT('/api/v1/investments/dividends/{id}', {
      params: { path: { id: '00000000-0000-0000-0000-000000000000' } },
      body: {
        type: 'dividend',
        amount: 100,
        payDate: '2026-08-01',
      },
    });
    expectStatus(unknownRes, 404);
  });

  test('Dividend list filters, pagination, and Indian FY summary bucketing', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const symbol = generateYahooSymbol('DIVFY');
    const inst = await resolveInstrument(api, {
      type: 'stock',
      name: `Dividend FY Inst ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol,
      exchange: 'NSE',
      yahooSymbol: symbol,
    });

    await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: inst.id,
      type: 'buy',
      quantity: 100,
      price: 50,
      tradeDate: '2024-01-01',
    });

    // Seed dividends in two distinct Indian FYs:
    // FY 2024-25: payDate 2024-08-15 (gross 1000, tds 100)
    // FY 2025-26: payDate 2025-08-15 (gross 1500, tds 150)
    const d1 = await createDividend(api, {
      brokerAccountId: broker.id,
      instrumentId: inst.id,
      type: 'dividend',
      amount: 1000,
      tds: 100,
      payDate: '2024-08-15',
    });

    await createDividend(api, {
      brokerAccountId: broker.id,
      instrumentId: inst.id,
      type: 'dividend',
      amount: 1500,
      tds: 150,
      payDate: '2025-08-15',
    });

    // List filtering
    const listRes = await api.GET('/api/v1/investments/dividends', {
      params: {
        query: {
          brokerAccountId: broker.id,
          instrumentId: inst.id,
          from: '2024-01-01',
          to: '2024-12-31',
        },
      },
    });
    expectStatus(listRes, 200);
    expect(listRes.data?.content.length).toBe(1);
    expect(listRes.data?.content[0].id).toBe(d1.id);

    // Summary endpoint with FY buckets
    const summaryRes = await api.GET('/api/v1/investments/dividends/summary', {
      params: {
        query: {
          brokerAccountId: broker.id,
          instrumentId: inst.id,
        },
      },
    });
    expectStatus(summaryRes, 200);
    const summaryData = summaryRes.data!;
    expect(summaryData.totalAmount).toBe(2500);
    expect(summaryData.totalTds).toBe(250);
    expect(summaryData.totalNet).toBe(2250);
    expect(summaryData.totalCount).toBe(2);

    const bucketLabels = summaryData.buckets.map((b) => b.label);
    expect(bucketLabels).toContain('FY 2024-25');
    expect(bucketLabels).toContain('FY 2025-26');
  });

  test('Dividend suggestions from Yahoo events: ex-date holding check, accept and deduplication', async ({
    api,
  }) => {
    const broker = await createBroker(api);

    // Resolve fixed RELIANCE.NS (do not create from scratch)
    const reliance = await resolveInstrument(api, {
      type: 'stock',
      name: 'Reliance Industries Limited',
      symbol: 'RELIANCE.NS',
      exchange: 'NSE',
      yahooSymbol: 'RELIANCE.NS',
    });

    // Buy BEFORE both stubbed ex-dates (stubbed dates are 1767571200 ~2026-01-05 and 1751673600 ~2025-07-05)
    // Trade on 2024-01-01 so holding open quantity > 0 on both ex-dates
    await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: reliance.id,
      type: 'buy',
      quantity: 50,
      price: 2000,
      tradeDate: '2024-01-01',
    });

    // 1. Scan suggestions
    const suggestionsRes = await dividendSuggestions(api, broker.id);
    expect(suggestionsRes.suggestions.length).toBe(2);
    const s1 = suggestionsRes.suggestions[0];
    const s2 = suggestionsRes.suggestions[1];
    expect(s1.symbol).toBe('RELIANCE.NS');
    expect(s1.qtyHeld).toBe(50);

    // 2. Accept suggestions
    const acceptRes1 = await acceptSuggestions(api, [
      {
        holdingId: s1.holdingId,
        exDate: s1.exDate,
        amount: s1.estimatedAmount,
        perUnit: s1.perUnit,
        payDate: s1.exDate,
        notes: 'Accepted suggestion 1',
      },
      {
        holdingId: s2.holdingId,
        exDate: s2.exDate,
        amount: s2.estimatedAmount,
        perUnit: s2.perUnit,
        payDate: s2.exDate,
        notes: 'Accepted suggestion 2',
      },
    ]);

    expect(acceptRes1.created.length).toBe(2);
    expect(acceptRes1.skippedCount).toBe(0);
    expect(acceptRes1.created.every((c) => c.source === 'suggested')).toBe(true);

    // 3. Accept suggestions again -> skippedCount = 2
    const acceptRes2 = await acceptSuggestions(api, [
      {
        holdingId: s1.holdingId,
        exDate: s1.exDate,
        amount: s1.estimatedAmount,
        perUnit: s1.perUnit,
        payDate: s1.exDate,
      },
      {
        holdingId: s2.holdingId,
        exDate: s2.exDate,
        amount: s2.estimatedAmount,
        perUnit: s2.perUnit,
        payDate: s2.exDate,
      },
    ]);
    expect(acceptRes2.created.length).toBe(0);
    expect(acceptRes2.skippedCount).toBe(2);
  });

  test('Tenancy isolation and unauthenticated 401 checks for dividend endpoints', async ({
    api,
    request,
  }) => {
    const { api: apiB } = await secondUser(request, 'dividend-user-b');
    const brokerA = await createBroker(api);
    const symbol = generateYahooSymbol('DIVTNCY');
    const inst = await resolveInstrument(api, {
      type: 'stock',
      name: `Dividend Tenancy Inst ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol,
      exchange: 'NSE',
      yahooSymbol: symbol,
    });

    await trade(api, {
      brokerAccountId: brokerA.id,
      instrumentId: inst.id,
      type: 'buy',
      quantity: 10,
      price: 100,
      tradeDate: '2026-08-01',
    });

    const divA = await createDividend(api, {
      brokerAccountId: brokerA.id,
      instrumentId: inst.id,
      type: 'dividend',
      amount: 100,
      payDate: '2026-08-05',
    });

    // User B cannot PUT or DELETE User A's dividend
    await expectForeign(apiB, 'PUT', `/api/v1/investments/dividends/${divA.id}`, {
      type: 'dividend',
      amount: 200,
      payDate: '2026-08-05',
    });
    await expectForeign(apiB, 'DELETE', `/api/v1/investments/dividends/${divA.id}`);

    // Unauthenticated 401s
    await expectUnauthenticated('GET', '/api/v1/investments/dividends');
    await expectUnauthenticated('POST', '/api/v1/investments/dividends', { amount: 100 });
    await expectUnauthenticated('PUT', '/api/v1/investments/dividends/00000000-0000-0000-0000-000000000000', { amount: 100 });
    await expectUnauthenticated('DELETE', '/api/v1/investments/dividends/00000000-0000-0000-0000-000000000000');
    await expectUnauthenticated('GET', '/api/v1/investments/dividends/summary');
    await expectUnauthenticated('GET', '/api/v1/investments/dividends/suggestions');
    await expectUnauthenticated('POST', '/api/v1/investments/dividends/suggestions/accept', { items: [] });
  });
});

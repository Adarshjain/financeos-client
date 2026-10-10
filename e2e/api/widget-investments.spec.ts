import type { ApiClient } from '../fixtures/api';
import { expectStatus } from '../fixtures/api';
import { istToday } from '../fixtures/dates';
import { createBrokerAccount } from '../fixtures/seed/accounts';
import {
  generateIsin,
  type InstrumentResponse,
  positions,
  resolveInstrument,
  summary,
  trade,
  uniqueSeedSuffix,
} from '../fixtures/seed/investments';
import { addDays } from '../fixtures/seed/loans';
import { runAdHoc } from '../fixtures/seed/reports';
import { currentFy, rawRowsOf, seedClose, type TaxHarvestResponse } from '../fixtures/seed/widgets';
import { expectUnauthenticated, newUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

async function harvest(api: ApiClient, query: { fy?: number; page?: number; size?: number } = {}): Promise<TaxHarvestResponse> {
  const res = await api.GET('/api/v1/investments/tax/harvest', { params: { query } });
  expectStatus(res, 200);
  return res.data!;
}

function money(record: Record<string, unknown>): Record<string, number> {
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, typeof v === 'object' ? NaN : Number(v)]));
}

/** YYYY-MM-DD shifted by whole calendar months (day clamped to the month's end). */
function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d, last));
  return first.toISOString().slice(0, 10);
}

async function stock(api: ApiClient, label: string): Promise<InstrumentResponse> {
  return resolveInstrument(api, { type: 'stock', name: `${label} ${uniqueSeedSuffix()}`, isin: generateIsin() });
}

test.describe('GET /investments/tax/harvest (@api)', () => {
  test('booked gains this FY with set-off and the exemption; open lots with term, gain and when they turn long term', async ({ request }) => {
    test.slow();
    const { api } = await newUser(request, 'harvest-equity');
    const broker = await createBrokerAccount(api, { name: 'Harvest Broker', cashBalance: 0 });
    const t = (instrumentId: string, type: 'buy' | 'sell', quantity: number, price: number, tradeDate: string) =>
      trade(api, { brokerAccountId: broker.id, instrumentId, type, quantity, price, tradeDate });

    // Booked today: +1000 long-term (held 400 days), −200 short-term (held 30 days).
    const longWin = await stock(api, 'Harvest Long Win');
    await t(longWin.id, 'buy', 10, 100, istToday(-400));
    await t(longWin.id, 'sell', 10, 200, istToday());
    const shortLoss = await stock(api, 'Harvest Short Loss');
    await t(shortLoss.id, 'buy', 10, 100, istToday(-30));
    await t(shortLoss.id, 'sell', 10, 80, istToday());

    // Open: a short-term gain, a long-term gain, one turning long term within 30 days, a short-term loss.
    const openShort = await stock(api, 'Harvest Open Short');
    await t(openShort.id, 'buy', 5, 100, istToday(-100));
    await seedClose(api, openShort.id, 120, istToday());
    const openLong = await stock(api, 'Harvest Open Long');
    await t(openLong.id, 'buy', 4, 50, istToday(-500));
    await seedClose(api, openLong.id, 75, istToday());
    const soon = await stock(api, 'Harvest Soon');
    await t(soon.id, 'buy', 2, 100, istToday(-350));
    await seedClose(api, soon.id, 110, istToday());
    const losing = await stock(api, 'Harvest Losing');
    await t(losing.id, 'buy', 3, 100, istToday(-20));
    await seedClose(api, losing.id, 90, istToday());

    const fy = currentFy();
    const res = await harvest(api);
    expect(res.fy).toBe(fy);
    expect(res.fyStart).toBe(`${fy}-04-01`);
    expect(res.fyEnd).toBe(`${fy + 1}-03-31`);

    // −200 short-term loss offsets the 1000 LTCG; the 800 left is inside the ₹1.25L exemption.
    expect(money(res.realised as unknown as Record<string, unknown>)).toMatchObject({
      stcg: 0,
      stcl: 200,
      ltcg: 1000,
      ltcl: 0,
      netStcg: 0,
      netLtcg: 800,
      netEquityLtcg: 800,
      stclCarriedForward: 0,
      ltclCarriedForward: 0,
      slabGains: 0,
      exemptionLimit: 125000,
      exemptionUsed: 800,
      exemptionLeft: 124200,
      taxableLtcg: 0,
    });
    expect(money(res.realised.otherGains as unknown as Record<string, unknown>)).toEqual({ shortTerm: 0, longTerm: 0, total: 0 });

    // Open lots, largest gain first (ties by older buy date).
    const lots = res.openLots.items;
    expect(res.openLots).toMatchObject({ page: 0, totalElements: 4, totalPages: 1 });
    expect(lots.map((l) => l.instrumentId)).toEqual([openLong.id, openShort.id, soon.id, losing.id]);
    const byId = Object.fromEntries(lots.map((l) => [l.instrumentId, l]));
    expect(byId[openShort.id]).toMatchObject({
      holdingId: expect.any(String),
      broker: 'Harvest Broker',
      assetClass: 'EQUITY',
      taxClass: 'EQUITY_ORIENTED',
      buyDate: istToday(-100),
      term: 'short',
      grandfathered: false,
      longTermOn: addDays(addMonths(istToday(-100), 12), 1),
    });
    expect([Number(byId[openShort.id].quantity), Number(byId[openShort.id].cost), Number(byId[openShort.id].value), Number(byId[openShort.id].gain)]).toEqual([
      5, 500, 600, 100,
    ]);
    expect(byId[openLong.id]).toMatchObject({ term: 'long', daysToLongTerm: 0 });
    expect(Number(byId[openLong.id].gain)).toBe(100);
    expect(byId[soon.id].term).toBe('short');
    expect(byId[soon.id].daysToLongTerm).toBeLessThanOrEqual(30);
    expect(Number(byId[losing.id].gain)).toBe(-30);

    expect(res.summary).toBeTruthy();
    expect(Number(res.summary!.unrealisedLongTermEquityGain)).toBe(100);
    expect(Number(res.summary!.harvestableLtcg)).toBe(100);
    expect(res.summary!.turningLongTermSoon.withinDays).toBe(30);
    expect(res.summary!.turningLongTermSoon.count).toBe(1);
    expect(Number(res.summary!.turningLongTermSoon.gain)).toBe(20);
    expect(money(res.summary!.harvestableLosses as unknown as Record<string, unknown>)).toEqual({ shortTerm: -30, longTerm: 0, total: -30 });

    // Open lots page on the server.
    const first = await harvest(api, { size: 2 });
    expect(first.openLots.items.map((l) => l.instrumentId)).toEqual([openLong.id, openShort.id]);
    expect(first.openLots).toMatchObject({ page: 0, size: 2, totalElements: 4, totalPages: 2 });
    const second = await harvest(api, { size: 2, page: 1 });
    expect(second.openLots.items.map((l) => l.instrumentId)).toEqual([soon.id, losing.id]);
  });

  test('a past FY: realised only (no open lots, no summary) and that year’s exemption limit; fy out of range is 400', async ({ request }) => {
    const { api } = await newUser(request, 'harvest-past');
    const broker = await createBrokerAccount(api, { name: 'Past Broker', cashBalance: 0 });
    const held = await stock(api, 'Past Held');
    await trade(api, { brokerAccountId: broker.id, instrumentId: held.id, type: 'buy', quantity: 1, price: 10, tradeDate: istToday(-60) });

    const fy = currentFy();
    const past = await harvest(api, { fy: fy - 1 });
    expect(past.fy).toBe(fy - 1);
    expect(past.fyStart).toBe(`${fy - 1}-04-01`);
    expect(past.summary ?? null).toBeNull();
    expect(past.openLots).toMatchObject({ items: [], totalElements: 0, totalPages: 1 });
    expect(Number(past.realised.exemptionLimit)).toBe(fy - 1 >= 2024 ? 125000 : 100000);
    expect(Number(past.realised.ltcg)).toBe(0);

    expect(Number((await harvest(api, { fy: 2023 })).realised.exemptionLimit), 'before FY 2024-25 it was ₹1L').toBe(100000);
    expect(Number((await harvest(api, { fy: 2024 })).realised.exemptionLimit)).toBe(125000);
    // The current FY lists today's open lot.
    expect((await harvest(api, { fy })).openLots.totalElements).toBe(1);

    for (const bad of [1999, 2101]) {
      const res = await api.GET('/api/v1/investments/tax/harvest', { params: { query: { fy: bad } } });
      expect(res.response.status, `fy=${bad}`).toBe(400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
    }
  });

  test('tax classes: specified debt bought after Apr 2023 is slab, gold is other long term; set-off pools them', async ({ request }) => {
    test.slow();
    const { api } = await newUser(request, 'harvest-classes');
    const broker = await createBrokerAccount(api, { name: 'Classes Broker', cashBalance: 0 });
    const t = (instrumentId: string, type: 'buy' | 'sell', quantity: number, price: number, tradeDate: string) =>
      trade(api, { brokerAccountId: broker.id, instrumentId, type, quantity, price, tradeDate });

    const equity = await stock(api, 'Classes Equity');
    const debt = await resolveInstrument(api, { type: 'mutual_fund', name: `Classes Liquid Fund ${uniqueSeedSuffix()}`, isin: generateIsin('INF') });
    const gold = await resolveInstrument(api, { type: 'etf', name: `Classes GOLD ETF ${uniqueSeedSuffix()}`, isin: generateIsin() });
    expect([equity.assetClass, equity.taxClass]).toEqual(['EQUITY', 'EQUITY_ORIENTED']);
    expect([debt.assetClass, debt.taxClass]).toEqual(['DEBT', 'SPECIFIED_DEBT']);
    expect([gold.assetClass, gold.taxClass]).toEqual(['GOLD', 'OTHER']);

    await t(equity.id, 'buy', 10, 100, istToday(-400));
    await t(equity.id, 'sell', 10, 200, istToday());
    await t(debt.id, 'buy', 100, 10, istToday(-800));
    await t(debt.id, 'sell', 100, 11, istToday());
    await t(gold.id, 'buy', 10, 50, istToday(-800));
    await t(gold.id, 'sell', 10, 55, istToday());

    const lots = rawRowsOf(
      await runAdHoc(api, {
        type: 'TABLE',
        datasource: 'realized_lots',
        definition: { mode: 'raw', columns: ['instrument', 'term', 'assetClass', 'taxClass', 'realizedPnl'], filters: [] },
      } as never)
    );
    const byInstrument = Object.fromEntries(lots.map((r) => [String(r.instrument), r]));
    expect(byInstrument[equity.name]).toMatchObject({ term: 'long', assetClass: 'EQUITY', taxClass: 'EQUITY_ORIENTED' });
    expect(byInstrument[debt.name]).toMatchObject({ term: 'slab', assetClass: 'DEBT', taxClass: 'SPECIFIED_DEBT' });
    expect(byInstrument[gold.name]).toMatchObject({ term: 'long', assetClass: 'GOLD', taxClass: 'OTHER' });

    // The term filter knows slab.
    const slab = rawRowsOf(
      await runAdHoc(api, {
        type: 'TABLE',
        datasource: 'realized_lots',
        definition: { mode: 'raw', columns: ['instrument'], filters: [{ field: 'term', operator: 'is', value: 'slab' }] },
      } as never)
    );
    expect(slab.map((r) => r.instrument)).toEqual([debt.name]);
    // Nothing here was bought before Feb 2018: no lot is grandfathered.
    const grandfathered = (value: boolean) =>
      runAdHoc(api, {
        type: 'TABLE',
        datasource: 'realized_lots',
        definition: { mode: 'raw', columns: ['instrument'], filters: [{ field: 'grandfathered', operator: 'is', value }] },
      } as never).then(rawRowsOf);
    expect(await grandfathered(true)).toEqual([]);
    expect(await grandfathered(false)).toHaveLength(3);

    const res = await harvest(api);
    expect(money(res.realised as unknown as Record<string, unknown>)).toMatchObject({
      ltcg: 1000,
      slabGains: 100,
      netStcg: 100,
      netEquityLtcg: 1000,
      netLtcg: 1050,
      exemptionUsed: 1000,
      exemptionLeft: 124000,
      taxableLtcg: 50,
    });
    expect(money(res.realised.otherGains as unknown as Record<string, unknown>)).toEqual({ shortTerm: 0, longTerm: 50, total: 50 });
  });

  test('equity term is by calendar months: sold on the 12-month anniversary is short, a day later is long', async ({ request }) => {
    const today = istToday();
    test.skip(today.endsWith('-02-29'), 'no same date a year ago');
    const { api } = await newUser(request, 'harvest-anniversary');
    const broker = await createBrokerAccount(api, { name: 'Anniv Broker', cashBalance: 0 });
    const exact = await stock(api, 'Anniv Exact');
    const dayMore = await stock(api, 'Anniv Day More');
    const yearAgo = addMonths(today, -12);
    await trade(api, { brokerAccountId: broker.id, instrumentId: exact.id, type: 'buy', quantity: 1, price: 10, tradeDate: yearAgo });
    await trade(api, { brokerAccountId: broker.id, instrumentId: exact.id, type: 'sell', quantity: 1, price: 11, tradeDate: today });
    await trade(api, { brokerAccountId: broker.id, instrumentId: dayMore.id, type: 'buy', quantity: 1, price: 10, tradeDate: addDays(yearAgo, -1) });
    await trade(api, { brokerAccountId: broker.id, instrumentId: dayMore.id, type: 'sell', quantity: 1, price: 11, tradeDate: today });

    const rows = rawRowsOf(
      await runAdHoc(api, {
        type: 'TABLE',
        datasource: 'realized_lots',
        definition: { mode: 'raw', columns: ['instrument', 'term'], filters: [] },
      } as never)
    );
    const terms = Object.fromEntries(rows.map((r) => [String(r.instrument), r.term]));
    expect(terms[exact.name]).toBe('short');
    expect(terms[dayMore.name]).toBe('long');
  });

  test('per user and behind a session', async ({ request }) => {
    const a = await newUser(request, 'harvest-tenant-a');
    const b = await newUser(request, 'harvest-tenant-b');
    const broker = await createBrokerAccount(a.api, { name: 'A Broker', cashBalance: 0 });
    const s = await stock(a.api, 'A Only');
    await trade(a.api, { brokerAccountId: broker.id, instrumentId: s.id, type: 'buy', quantity: 1, price: 10, tradeDate: istToday(-400) });
    await trade(a.api, { brokerAccountId: broker.id, instrumentId: s.id, type: 'sell', quantity: 1, price: 20, tradeDate: istToday() });
    expect(Number((await harvest(a.api)).realised.ltcg)).toBe(10);
    const other = await harvest(b.api);
    expect(Number(other.realised.ltcg)).toBe(0);
    expect(other.openLots.totalElements).toBe(0);
    await expectUnauthenticated('GET', '/api/v1/investments/tax/harvest');
  });
});

test.describe('Positions and summary: day change and asset class (@api)', () => {
  test('day change from the latest two stored closes, per position and summed in the summary', async ({ request }) => {
    test.slow();
    const { api } = await newUser(request, 'day-change');
    const broker = await createBrokerAccount(api, { name: 'Day Broker', cashBalance: 0 });
    const up = await stock(api, 'Day Up');
    const down = await stock(api, 'Day Down');
    const flat = await stock(api, 'Day One Price');
    await trade(api, { brokerAccountId: broker.id, instrumentId: up.id, type: 'buy', quantity: 10, price: 90, tradeDate: istToday(-30) });
    await trade(api, { brokerAccountId: broker.id, instrumentId: down.id, type: 'buy', quantity: 5, price: 180, tradeDate: istToday(-30) });
    await trade(api, { brokerAccountId: broker.id, instrumentId: flat.id, type: 'buy', quantity: 1, price: 10, tradeDate: istToday(-30) });
    await seedClose(api, up.id, 100, istToday(-1));
    await seedClose(api, up.id, 110, istToday());
    await seedClose(api, down.id, 200, istToday(-2));
    await seedClose(api, down.id, 190, istToday());
    await seedClose(api, flat.id, 12, istToday());

    const list = (await positions(api)).positions;
    const byInst = Object.fromEntries(list.map((p) => [p.instrument.id, p]));
    expect(byInst[up.id]).toMatchObject({ previousCloseAsOf: istToday(-1), lastPriceAsOf: istToday(), assetClass: 'EQUITY', taxClass: 'EQUITY_ORIENTED' });
    expect([Number(byInst[up.id].previousClose), Number(byInst[up.id].dayChange), Number(byInst[up.id].dayChangePct)]).toEqual([100, 100, 10]);
    expect(byInst[down.id].previousCloseAsOf).toBe(istToday(-2));
    expect([Number(byInst[down.id].previousClose), Number(byInst[down.id].dayChange), Number(byInst[down.id].dayChangePct)]).toEqual([200, -50, -5]);
    // One stored close: no move to report.
    expect(byInst[flat.id].previousClose ?? null).toBeNull();
    expect(byInst[flat.id].dayChange ?? null).toBeNull();
    expect(byInst[flat.id].dayChangePct ?? null).toBeNull();

    const s = await summary(api);
    expect(Number(s.dayChange)).toBe(50);
    // 50 against the previous value of the moving positions (10 × 100 + 5 × 200).
    expect(Number(s.dayChangePct)).toBe(2.5);
    expect(s.priceAsOf).toBe(istToday());
    expect(s.previousPriceAsOf).toBe(istToday(-1));
  });

  test('a stale latest price has no day change; a user with no holdings has no summary day change', async ({ request }) => {
    const { api } = await newUser(request, 'day-change-stale');
    expect((await summary(api)).dayChange ?? null).toBeNull();
    const broker = await createBrokerAccount(api, { name: 'Stale Broker', cashBalance: 0 });
    const stale = await stock(api, 'Day Stale');
    await trade(api, { brokerAccountId: broker.id, instrumentId: stale.id, type: 'buy', quantity: 2, price: 50, tradeDate: istToday(-60) });
    await seedClose(api, stale.id, 50, istToday(-20));
    await seedClose(api, stale.id, 60, istToday(-10));
    const p = (await positions(api)).positions.find((x) => x.instrument.id === stale.id)!;
    expect(p.dayChange ?? null).toBeNull();
    const s = await summary(api);
    expect(s.dayChange ?? null).toBeNull();
    expect(s.dayChangePct ?? null).toBeNull();
    expect(s.priceAsOf).toBe(istToday(-10));
  });

  test('positions datasource exposes assetClass and taxClass with labels, filterable', async ({ request }) => {
    const { api } = await newUser(request, 'positions-classes');
    const broker = await createBrokerAccount(api, { name: 'Classes Pos Broker', cashBalance: 0 });
    const eq = await stock(api, 'Pos Equity');
    const gold = await resolveInstrument(api, { type: 'etf', name: `Pos GOLD ETF ${uniqueSeedSuffix()}`, isin: generateIsin() });
    await trade(api, { brokerAccountId: broker.id, instrumentId: eq.id, type: 'buy', quantity: 1, price: 10, tradeDate: istToday(-5) });
    await trade(api, { brokerAccountId: broker.id, instrumentId: gold.id, type: 'buy', quantity: 1, price: 10, tradeDate: istToday(-5) });

    const table = (await runAdHoc(api, {
      type: 'TABLE',
      datasource: 'positions',
      definition: { mode: 'raw', columns: ['instrument', 'assetClass', 'taxClass'], filters: [] },
    } as never)) as unknown as { rows: Array<Record<string, unknown>>; columns: Array<{ key: string; valueLabels?: Record<string, string> }> };
    const byName = Object.fromEntries(table.rows.map((r) => [String(r.instrument), r]));
    expect(byName[eq.name]).toMatchObject({ assetClass: 'EQUITY', taxClass: 'EQUITY_ORIENTED' });
    expect(byName[gold.name]).toMatchObject({ assetClass: 'GOLD', taxClass: 'OTHER' });
    expect(table.columns.find((c) => c.key === 'assetClass')!.valueLabels).toMatchObject({ EQUITY: 'Equity', GOLD: 'Gold', DEBT: 'Debt' });
    expect(table.columns.find((c) => c.key === 'taxClass')!.valueLabels).toMatchObject({
      EQUITY_ORIENTED: 'Equity-oriented',
      SPECIFIED_DEBT: 'Specified debt',
      OTHER: 'Other',
    });

    const goldOnly = rawRowsOf(
      await runAdHoc(api, {
        type: 'TABLE',
        datasource: 'positions',
        definition: { mode: 'raw', columns: ['instrument'], filters: [{ field: 'assetClass', operator: 'is', value: 'GOLD' }] },
      } as never)
    );
    expect(goldOnly.map((r) => r.instrument)).toEqual([gold.name]);
  });
});

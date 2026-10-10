// Instrument edits are per account: PUT /instruments/{id} stores the caller's own display overrides
// (or, for an identifier change, moves only the caller's holdings to another catalog instrument —
// only the identifiers that changed pick it; clearing without a new one, or any corporate action on
// either instrument, is a 400),
// PATCH pins the caller's asset class, DELETE /overrides resets to the catalog, manual prices belong
// to their author, and POST /instruments/resolve never changes an existing row.

import type { ApiClient } from '../fixtures/api';
import { expectStatus, waitForJob } from '../fixtures/api';
import { istToday } from '../fixtures/dates';
import { genZerodhaTradebookCsv } from '../fixtures/gen/broker-files';
import {
  createBroker,
  createCorporateAction,
  generateIsin,
  generateYahooSymbol,
  type ImportCommitResponse,
  type ImportPreviewResponse,
  type InstrumentRequest,
  type InstrumentResponse,
  positions,
  refreshPrices,
  resolveInstrument,
  setManualPrice,
  trade,
  uniqueSeedSuffix,
} from '../fixtures/seed/investments';
import { secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

const UNKNOWN_ID = '00000000-0000-0000-0000-000000000000';

/** A fresh catalog stock with an ISIN and a Yahoo symbol, resolved by `api`. */
async function freshStock(api: ApiClient, label: string): Promise<InstrumentResponse> {
  const symbol = generateYahooSymbol(label);
  return resolveInstrument(api, {
    type: 'stock',
    name: `${label} Instrument ${uniqueSeedSuffix()}`,
    isin: generateIsin(),
    symbol,
    exchange: 'NSE',
    yahooSymbol: symbol,
    currency: 'INR',
  });
}

/** The PUT body that re-sends an instrument as it is, with `patch` applied. */
function bodyOf(inst: InstrumentResponse, patch: Partial<InstrumentRequest> = {}): InstrumentRequest {
  return {
    type: inst.type,
    name: inst.name,
    symbol: inst.symbol ?? undefined,
    exchange: inst.exchange ?? undefined,
    isin: inst.isin ?? undefined,
    amfiCode: inst.amfiCode ?? undefined,
    yahooSymbol: inst.yahooSymbol ?? undefined,
    currency: inst.currency,
    ...patch,
  };
}

async function put(api: ApiClient, id: string, body: InstrumentRequest) {
  return api.PUT('/api/v1/instruments/{id}', { params: { path: { id } }, body });
}

async function getInstrument(api: ApiClient, id: string): Promise<InstrumentResponse> {
  const res = await api.GET('/api/v1/instruments/{id}', { params: { path: { id } } });
  expectStatus(res, 200);
  return res.data!;
}

async function priceHistory(api: ApiClient, id: string) {
  const res = await api.GET('/api/v1/instruments/{id}/prices', { params: { path: { id } } });
  expectStatus(res, 200);
  return res.data!;
}

/** A broker plus one buy of `instrumentId` for `api`'s user; the holding id. */
async function holdingOf(api: ApiClient, instrumentId: string): Promise<string> {
  const broker = await createBroker(api);
  await trade(api, {
    brokerAccountId: broker.id,
    instrumentId,
    type: 'buy',
    quantity: 10,
    price: 100,
    tradeDate: '2026-08-01',
  });
  const pos = (await positions(api)).positions.find((p) => p.brokerAccountId === broker.id);
  expect(pos, 'the new holding is listed').toBeDefined();
  return pos!.holdingId;
}

/** Previews a Zerodha tradebook CSV for `brokerAccountId`. */
async function previewZerodha(api: ApiClient, brokerAccountId: string, csv: Buffer): Promise<ImportPreviewResponse> {
  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(csv)], { type: 'text/csv' }), 'zerodha-tradebook.csv');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (api as any).POST('/api/v1/investments/imports/preview', {
    params: { query: { source: 'zerodha_tradebook', brokerAccountId } },
    body: formData,
    bodySerializer: (b: unknown) => b,
  });
  expectStatus(res, 200);
  return res.data;
}

/** Commits every previewed row (on its matched instrument, else `fallbackInstrumentId`). */
async function commitZerodha(
  api: ApiClient,
  brokerAccountId: string,
  preview: ImportPreviewResponse,
  fallbackInstrumentId: string
): Promise<ImportCommitResponse> {
  const res = await api.POST('/api/v1/investments/imports/commit', {
    body: {
      source: 'zerodha_tradebook',
      brokerAccountId,
      rows: preview.rows.map((r) => ({
        rowIndex: r.rowIndex,
        instrumentId: r.matchedInstrument?.id || fallbackInstrumentId,
        skip: false,
        row: r.parsedRow,
      })),
    },
  });
  expectStatus(res, 202);
  const job = await waitForJob(api, (res.data as { jobId: string }).jobId);
  expect(job.status).toBe('SUCCEEDED');
  return job.result as unknown as ImportCommitResponse;
}

async function positionOf(api: ApiClient, holdingId: string) {
  return (await positions(api)).positions.find((p) => p.holdingId === holdingId);
}

test.describe('Instrument edits per account (@api)', () => {
  test('PUT display fields are the caller\'s overrides: another user and the catalog row are unaffected', async ({
    api,
    request,
  }) => {
    const { api: apiB } = await secondUser(request, 'inst-edit-b');
    const inst = await freshStock(api, 'OVR');
    expect(inst.overridden).toBe(false);
    expect(inst.overriddenFields).toEqual([]);

    const myName = `My name ${uniqueSeedSuffix()}`;
    const res = await put(api, inst.id, bodyOf(inst, { name: myName, exchange: 'BSE' }));
    expectStatus(res, 200);
    expect(res.data!.id).toBe(inst.id);
    expect(res.data!.name).toBe(myName);
    expect(res.data!.exchange).toBe('BSE');
    expect(res.data!.overridden).toBe(true);
    expect([...res.data!.overriddenFields].sort()).toEqual(['exchange', 'name']);

    // The caller reads their own view everywhere, search by the new name included.
    expect((await getInstrument(api, inst.id)).name).toBe(myName);
    const mine = await api.GET('/api/v1/instruments', { params: { query: { search: myName } } });
    expectStatus(mine, 200);
    expect(mine.data!.some((i) => i.id === inst.id && i.name === myName)).toBe(true);

    // User B sees the catalog: their GET, their search by the new name, their search by the catalog name.
    const b = await getInstrument(apiB, inst.id);
    expect(b.name).toBe(inst.name);
    expect(b.exchange).toBe('NSE');
    expect(b.overridden).toBe(false);
    expect(b.overriddenFields).toEqual([]);
    const bByMyName = await apiB.GET('/api/v1/instruments', { params: { query: { search: myName } } });
    expectStatus(bByMyName, 200);
    expect(bByMyName.data!.some((i) => i.id === inst.id)).toBe(false);
    const bByCatalogName = await apiB.GET('/api/v1/instruments', { params: { query: { search: inst.name } } });
    expectStatus(bByCatalogName, 200);
    expect(bByCatalogName.data!.find((i) => i.id === inst.id)?.name).toBe(inst.name);

    // A type override is the caller's too, and the type filter follows it for them only.
    const retyped = await put(api, inst.id, bodyOf(inst, { name: myName, exchange: 'BSE', type: 'etf' }));
    expectStatus(retyped, 200);
    expect(retyped.data!.type).toBe('etf');
    expect(retyped.data!.overriddenFields).toContain('type');
    const etfs = await api.GET('/api/v1/instruments', { params: { query: { search: myName, type: 'etf' } } });
    expect(etfs.data!.some((i) => i.id === inst.id)).toBe(true);
    expect((await getInstrument(apiB, inst.id)).type).toBe('stock');

    // Sending the catalog values again clears each override (case-insensitive for the codes).
    const cleared = await put(api, inst.id, bodyOf(inst, { exchange: 'nse' }));
    expectStatus(cleared, 200);
    expect(cleared.data!.name).toBe(inst.name);
    expect(cleared.data!.exchange).toBe('NSE');
    expect(cleared.data!.type).toBe('stock');
    expect(cleared.data!.overridden).toBe(false);
    expect(cleared.data!.overriddenFields).toEqual([]);

    // Unknown instrument → 404.
    expectStatus(await put(api, UNKNOWN_ID, bodyOf(inst)), 404);
  });

  test('PATCH pins the caller\'s asset class (positions follow) and null returns to the catalog class', async ({
    api,
    request,
  }) => {
    const { api: apiB } = await secondUser(request, 'inst-class-b');
    const inst = await freshStock(api, 'CLS');
    expect(inst.assetClass).toBe('EQUITY');
    const holdingId = await holdingOf(api, inst.id);

    const pinned = await api.PATCH('/api/v1/instruments/{id}', {
      params: { path: { id: inst.id } },
      body: { assetClass: 'GOLD' },
    });
    expectStatus(pinned, 200);
    expect(pinned.data!.assetClass).toBe('GOLD');
    expect(pinned.data!.assetClassSource).toBe('MANUAL');
    expect(pinned.data!.overridden).toBe(true);
    expect(pinned.data!.overriddenFields).toContain('assetClass');
    expect((await getInstrument(api, inst.id)).assetClass).toBe('GOLD');
    expect((await positionOf(api, holdingId))?.assetClass).toBe('GOLD');

    // Another user keeps the catalog class.
    const b = await getInstrument(apiB, inst.id);
    expect(b.assetClass).toBe('EQUITY');
    expect(b.assetClassSource).not.toBe('MANUAL');
    expect(b.overriddenFields).not.toContain('assetClass');

    // null drops the pin.
    const auto = await api.PATCH('/api/v1/instruments/{id}', {
      params: { path: { id: inst.id } },
      body: { assetClass: null },
    });
    expectStatus(auto, 200);
    expect(auto.data!.assetClass).toBe('EQUITY');
    expect(auto.data!.overriddenFields).not.toContain('assetClass');
    expect(auto.data!.overridden).toBe(false);
    expect((await positionOf(api, holdingId))?.assetClass).toBe('EQUITY');

    const unknown = await api.PATCH('/api/v1/instruments/{id}', {
      params: { path: { id: UNKNOWN_ID } },
      body: { assetClass: 'DEBT' },
    });
    expectStatus(unknown, 404);
  });

  test('DELETE /overrides resets display fields and asset class to the catalog, idempotently, for the caller only', async ({
    api,
    request,
  }) => {
    const { api: apiB } = await secondUser(request, 'inst-reset-b');
    const inst = await freshStock(api, 'RST');
    const bName = `B name ${uniqueSeedSuffix()}`;
    expectStatus(await put(apiB, inst.id, bodyOf(inst, { name: bName })), 200);

    expectStatus(await put(api, inst.id, bodyOf(inst, { name: `A name ${uniqueSeedSuffix()}`, symbol: 'AOWN' })), 200);
    expectStatus(
      await api.PATCH('/api/v1/instruments/{id}', { params: { path: { id: inst.id } }, body: { assetClass: 'DEBT' } }),
      200
    );
    expect([...(await getInstrument(api, inst.id)).overriddenFields].sort()).toEqual(['assetClass', 'name', 'symbol']);

    const reset = await api.DELETE('/api/v1/instruments/{id}/overrides', { params: { path: { id: inst.id } } });
    expectStatus(reset, 200);
    expect(reset.data!.id).toBe(inst.id);
    expect(reset.data!.name).toBe(inst.name);
    expect(reset.data!.symbol).toBe(inst.symbol);
    expect(reset.data!.assetClass).toBe('EQUITY');
    expect(reset.data!.overridden).toBe(false);
    expect(reset.data!.overriddenFields).toEqual([]);
    expect((await getInstrument(api, inst.id)).name).toBe(inst.name);

    // Nothing left to reset: same answer.
    const again = await api.DELETE('/api/v1/instruments/{id}/overrides', { params: { path: { id: inst.id } } });
    expectStatus(again, 200);
    expect(again.data!.overridden).toBe(false);

    // B's own edit survives A's reset.
    expect((await getInstrument(apiB, inst.id)).name).toBe(bName);

    expectStatus(await api.DELETE('/api/v1/instruments/{id}/overrides', { params: { path: { id: UNKNOWN_ID } } }), 404);
  });

  test('an identifier edit moves only the caller\'s holding and manual prices to the matching or a new instrument', async ({
    api,
    request,
  }) => {
    const { api: apiB } = await secondUser(request, 'inst-repoint-b');
    const source = await freshStock(api, 'SRC');
    const target = await freshStock(api, 'TGT');

    const holdingA = await holdingOf(api, source.id);
    const holdingB = await holdingOf(apiB, source.id);
    await setManualPrice(api, source.id, { price: 123, asOf: istToday(-3) });
    await setManualPrice(apiB, source.id, { price: 456, asOf: istToday(-3) });

    // 1. To an existing catalog instrument (found by ISIN): the answer is that instrument.
    const moved = await put(api, source.id, bodyOf(source, { isin: target.isin!, yahooSymbol: target.yahooSymbol! }));
    expectStatus(moved, 200);
    expect(moved.data!.id).toBe(target.id);
    expect(moved.data!.isin).toBe(target.isin);

    expect((await positionOf(api, holdingA))?.instrument.id).toBe(target.id);
    const aOnTarget = (await priceHistory(api, target.id)).filter((p) => p.source === 'MANUAL');
    expect(aOnTarget.map((p) => [p.asOf, p.close, p.editable])).toEqual([[istToday(-3), 123, true]]);
    expect((await priceHistory(api, source.id)).some((p) => p.source === 'MANUAL')).toBe(false);

    // User B's holding, price and view of both instruments are untouched.
    expect((await positionOf(apiB, holdingB))?.instrument.id).toBe(source.id);
    const bOnSource = (await priceHistory(apiB, source.id)).filter((p) => p.source === 'MANUAL');
    expect(bOnSource.map((p) => p.close)).toEqual([456]);
    expect((await priceHistory(apiB, target.id)).some((p) => p.source === 'MANUAL')).toBe(false);
    const sourceForB = await getInstrument(apiB, source.id);
    expect(sourceForB.isin).toBe(source.isin);
    expect(sourceForB.yahooSymbol).toBe(source.yahooSymbol);

    // 2. To identifiers no instrument has: a new catalog row.
    const freshIsin = generateIsin();
    const freshYahoo = generateYahooSymbol('NEW');
    const created = await put(
      api,
      target.id,
      bodyOf(target, { isin: freshIsin, yahooSymbol: freshYahoo, name: `Renamed on move ${uniqueSeedSuffix()}` })
    );
    expectStatus(created, 200);
    expect(created.data!.id).not.toBe(target.id);
    expect(created.data!.id).not.toBe(source.id);
    expect(created.data!.isin).toBe(freshIsin);
    expect(created.data!.yahooSymbol).toBe(freshYahoo);
    // The ticker (symbol + exchange) is unique in the catalog and stays with the row that has it; the
    // user did not change it, so it is not carried to the new row as an override either.
    expect(created.data!.symbol ?? null).toBeNull();
    expect(created.data!.overriddenFields).not.toContain('symbol');
    expect((await positionOf(api, holdingA))?.instrument.id).toBe(created.data!.id);
    // The target itself is unchanged for everyone.
    expect((await getInstrument(apiB, target.id)).isin).toBe(target.isin);
    expect((await getInstrument(api, target.id)).isin).toBe(target.isin);
  });

  test('changing only the Yahoo symbol (ISIN unchanged) moves the holding to an instrument with that symbol', async ({
    api,
    request,
  }) => {
    const { api: apiB } = await secondUser(request, 'inst-yahoo-only-b');
    const inst = await freshStock(api, 'YON');
    const holdingId = await holdingOf(api, inst.id);
    const holdingB = await holdingOf(apiB, inst.id);

    // Only the changed identifier picks the target: the unchanged ISIN (which still names this
    // instrument) does not send it back to itself.
    const newYahoo = generateYahooSymbol('YON2');
    const res = await put(api, inst.id, bodyOf(inst, { yahooSymbol: newYahoo }));
    expectStatus(res, 200);
    expect(res.data!.id).not.toBe(inst.id);
    expect(res.data!.yahooSymbol).toBe(newYahoo);
    expect(res.data!.mergedHoldings).toBe(false);
    expect(res.data!.mergeNote ?? null).toBeNull();
    expect((await positionOf(api, holdingId))?.instrument.id).toBe(res.data!.id);

    // The source row and the other holder are untouched.
    const source = await getInstrument(apiB, inst.id);
    expect(source.yahooSymbol).toBe(inst.yahooSymbol);
    expect(source.isin).toBe(inst.isin);
    expect((await positionOf(apiB, holdingB))?.instrument.id).toBe(inst.id);
  });

  test('clearing identifiers without a new one is 400 and moves nothing', async ({ api }) => {
    const inst = await freshStock(api, 'BAD');
    const holdingId = await holdingOf(api, inst.id);

    // Clearing one (the ISIN still set and unchanged): there is no new identifier to switch to.
    const one = await put(api, inst.id, bodyOf(inst, { yahooSymbol: undefined }));
    expectStatus(one, 400);
    expect(one.error?.message).toContain('Clearing an identifier');

    const cleared = await put(api, inst.id, bodyOf(inst, { isin: undefined, amfiCode: undefined, yahooSymbol: undefined }));
    expectStatus(cleared, 400);
    expect(cleared.error?.message).toContain("can't all be cleared");

    const blank = await put(api, inst.id, bodyOf(inst, { isin: ' ', amfiCode: '', yahooSymbol: '' }));
    expectStatus(blank, 400);

    const after = await getInstrument(api, inst.id);
    expect(after.yahooSymbol).toBe(inst.yahooSymbol);
    expect(after.isin).toBe(inst.isin);
    expect(after.overridden).toBe(false);
    expect((await positionOf(api, holdingId))?.instrument.id).toBe(inst.id);
  });

  test('an identifier edit is refused (400, naming it) when either instrument is part of a corporate action', async ({
    api,
  }) => {
    // The source has a split.
    const split = await freshStock(api, 'CAS');
    const splitHolding = await holdingOf(api, split.id);
    await createCorporateAction(api, split.id, { type: 'split', ratioFrom: 1, ratioTo: 2, exDate: istToday(-10) });
    const fromSplit = await put(api, split.id, bodyOf(split, { isin: generateIsin() }));
    expectStatus(fromSplit, 400);
    expect(fromSplit.error?.message).toContain('corporate action');
    expect(fromSplit.error?.message).toContain(`split of ${split.name}`);
    expect((await positionOf(api, splitHolding))?.instrument.id).toBe(split.id);

    // The target has one (a bonus), the source none.
    const plain = await freshStock(api, 'CAP');
    const plainHolding = await holdingOf(api, plain.id);
    const target = await freshStock(api, 'CAT');
    await createCorporateAction(api, target.id, { type: 'bonus', ratioFrom: 1, ratioTo: 1, exDate: istToday(-10) });
    const toBonus = await put(api, plain.id, bodyOf(plain, { isin: target.isin! }));
    expectStatus(toBonus, 400);
    expect(toBonus.error?.message).toContain(`bonus on ${target.name}`);
    expect((await positionOf(api, plainHolding))?.instrument.id).toBe(plain.id);
  });

  test('moving onto an instrument already held in the same broker merges the holdings and says so', async ({ api }) => {
    const source = await freshStock(api, 'MGS');
    const target = await freshStock(api, 'MGT');
    const broker = await createBroker(api);
    for (const [instrumentId, price] of [
      [source.id, 100],
      [target.id, 200],
    ] as const) {
      await trade(api, { brokerAccountId: broker.id, instrumentId, type: 'buy', quantity: 10, price, tradeDate: '2026-08-01' });
    }

    const res = await put(api, source.id, bodyOf(source, { isin: target.isin!, yahooSymbol: target.yahooSymbol! }));
    expectStatus(res, 200);
    expect(res.data!.id).toBe(target.id);
    expect(res.data!.mergedHoldings).toBe(true);
    // No sells on either side: realised figures cannot change, so no note.
    expect(res.data!.mergeNote ?? null).toBeNull();

    const held = (await positions(api)).positions.filter((p) => p.brokerAccountId === broker.id);
    expect(held.map((p) => [p.instrument.id, p.quantity])).toEqual([[target.id, 20]]);
  });

  test('re-importing a broker file after an identifier edit finds the moved trades: no duplicates', async ({ api }) => {
    const broker = await createBroker(api);
    const sym = generateYahooSymbol('RIM');
    const isin = generateIsin();
    const inst = await resolveInstrument(api, {
      type: 'stock',
      name: `Reimport Stock ${uniqueSeedSuffix()}`,
      isin,
      symbol: sym,
      exchange: 'NSE',
      yahooSymbol: sym,
    });
    const csv = genZerodhaTradebookCsv([
      { symbol: sym, isin, tradeDate: '2026-08-01', tradeType: 'buy', quantity: 40, price: 50, tradeId: `T_${uniqueSeedSuffix()}_1` },
      { symbol: sym, isin, tradeDate: '2026-08-04', tradeType: 'buy', quantity: 10, price: 52, tradeId: `T_${uniqueSeedSuffix()}_2` },
    ]);

    const first = await previewZerodha(api, broker.id, csv);
    const committed = await commitZerodha(api, broker.id, first, inst.id);
    expect(committed.committed).toBe(2);

    // The user corrects the ISIN: their holding moves to a new catalog instrument.
    const moved = await put(api, inst.id, bodyOf(inst, { isin: generateIsin() }));
    expectStatus(moved, 200);
    const targetId = moved.data!.id;
    expect(targetId).not.toBe(inst.id);

    // The same file (still carrying the old ISIN) maps to the moved holding and its trades.
    const again = await previewZerodha(api, broker.id, csv);
    expect(again.rows.map((r) => r.duplicate)).toEqual([true, true]);
    const recommit = await commitZerodha(api, broker.id, again, targetId);
    expect(recommit.committed).toBe(0);
    expect(recommit.skipped).toBe(2);

    const held = (await positions(api)).positions.filter((p) => p.brokerAccountId === broker.id);
    expect(held.map((p) => [p.instrument.id, p.quantity])).toEqual([[targetId, 50]]);
  });

  test('field lengths are validated: one past each limit is 400 with that field, the limit itself saves', async ({
    api,
  }) => {
    const inst = await freshStock(api, 'LEN');
    const limits: Array<[keyof InstrumentRequest, number]> = [
      ['name', 255],
      ['symbol', 50],
      ['exchange', 20],
      ['isin', 50],
      ['amfiCode', 50],
      ['yahooSymbol', 50],
      ['currency', 10],
    ];
    for (const [field, max] of limits) {
      const res = await put(api, inst.id, bodyOf(inst, { [field]: 'X'.repeat(max + 1) }));
      expectStatus(res, 400);
      expect(res.error?.code).toBe('VALIDATION_ERROR');
      expect((res.error as { details?: Record<string, string> } | undefined)?.details?.[field], field).toMatch(
        /at most \d+ characters/
      );
    }

    // Create shares the same request: an over-long name is rejected there too.
    const create = await api.POST('/api/v1/instruments', {
      body: { type: 'stock', name: 'N'.repeat(256), isin: generateIsin(), currency: 'INR' },
    });
    expectStatus(create, 400);
    expect((create.error as { details?: Record<string, string> } | undefined)?.details?.name).toBeDefined();

    // Exactly at the limits (display fields only, so no repoint) is accepted.
    const atLimit = await put(api, inst.id, bodyOf(inst, { name: 'N'.repeat(255), exchange: 'E'.repeat(20) }));
    expectStatus(atLimit, 200);
    expect(atLimit.data!.name).toHaveLength(255);
    expect(atLimit.data!.exchange).toBe('E'.repeat(20));
  });

  test('manual prices belong to their author: own rows editable, another user\'s invisible and 404, feed rows read-only', async ({
    api,
    request,
  }) => {
    const { api: apiB } = await secondUser(request, 'inst-price-b');
    const inst = await freshStock(api, 'PRU');
    const day = istToday(-2);

    // Both users price the same date without clashing; a second POST updates the author's row.
    await setManualPrice(api, inst.id, { price: 101, asOf: day });
    await setManualPrice(apiB, inst.id, { price: 202, asOf: day });
    await setManualPrice(api, inst.id, { price: 105, asOf: day });

    const aRows = (await priceHistory(api, inst.id)).filter((p) => p.asOf === day);
    expect(aRows.map((p) => [p.close, p.source, p.editable])).toEqual([[105, 'MANUAL', true]]);
    const bRows = (await priceHistory(apiB, inst.id)).filter((p) => p.asOf === day);
    expect(bRows.map((p) => [p.close, p.source, p.editable])).toEqual([[202, 'MANUAL', true]]);
    const aPrice = aRows[0];

    // B can neither edit nor delete A's row.
    const bPut = await apiB.PUT('/api/v1/instruments/{instrumentId}/prices/{priceId}', {
      params: { path: { instrumentId: inst.id, priceId: aPrice.id } },
      body: { price: 1 },
    });
    expectStatus(bPut, 404);
    const bDelete = await apiB.DELETE('/api/v1/instruments/{instrumentId}/prices/{priceId}', {
      params: { path: { instrumentId: inst.id, priceId: aPrice.id } },
    });
    expectStatus(bDelete, 404);
    expect((await priceHistory(api, inst.id)).find((p) => p.id === aPrice.id)?.close).toBe(105);

    // A edits and deletes their own; B's row stays.
    const aPut = await api.PUT('/api/v1/instruments/{instrumentId}/prices/{priceId}', {
      params: { path: { instrumentId: inst.id, priceId: aPrice.id } },
      body: { price: 110 },
    });
    expectStatus(aPut, 200);
    expect((await priceHistory(api, inst.id)).find((p) => p.id === aPrice.id)?.close).toBe(110);
    const aDelete = await api.DELETE('/api/v1/instruments/{instrumentId}/prices/{priceId}', {
      params: { path: { instrumentId: inst.id, priceId: aPrice.id } },
    });
    expectStatus(aDelete, 204);
    expect((await priceHistory(api, inst.id)).some((p) => p.id === aPrice.id)).toBe(false);
    expect((await priceHistory(apiB, inst.id)).filter((p) => p.asOf === day).map((p) => p.close)).toEqual([202]);

    // A feed price is read-only for everyone (404, not editable).
    const job = await refreshPrices(api, inst.id);
    expect(job.status).toBe('SUCCEEDED');
    const feed = (await priceHistory(api, inst.id)).find((p) => p.source === 'YAHOO');
    expect(feed, 'the stubbed Yahoo quote was stored').toBeDefined();
    expect(feed!.editable).toBe(false);
    expect((await priceHistory(apiB, inst.id)).find((p) => p.id === feed!.id)?.editable).toBe(false);
    const feedPut = await api.PUT('/api/v1/instruments/{instrumentId}/prices/{priceId}', {
      params: { path: { instrumentId: inst.id, priceId: feed!.id } },
      body: { price: 1 },
    });
    expectStatus(feedPut, 404);
    const feedDelete = await api.DELETE('/api/v1/instruments/{instrumentId}/prices/{priceId}', {
      params: { path: { instrumentId: inst.id, priceId: feed!.id } },
    });
    expectStatus(feedDelete, 404);
  });

  test('each owner\'s positions use their own manual price', async ({ api, request }) => {
    const { api: apiB } = await secondUser(request, 'inst-price-pos-b');
    // No Yahoo symbol: no feed price, so the manual prices are the only ones.
    const inst = await resolveInstrument(api, {
      type: 'stock',
      name: `Manual Only ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
    });
    const holdingA = await holdingOf(api, inst.id);
    const holdingB = await holdingOf(apiB, inst.id);
    await setManualPrice(api, inst.id, { price: 111, asOf: istToday() });
    await setManualPrice(apiB, inst.id, { price: 222, asOf: istToday() });

    const a = await positionOf(api, holdingA);
    expect(a?.lastPrice).toBe(111);
    expect(a?.lastPriceSource).toBe('MANUAL');
    expect((await getInstrument(api, inst.id)).lastPrice).toBe(111);
    const b = await positionOf(apiB, holdingB);
    expect(b?.lastPrice).toBe(222);
    expect((await getInstrument(apiB, inst.id)).lastPrice).toBe(222);
  });

  test('resolve reuses an existing row as it is: no rename, re-symbol or ISIN backfill', async ({ api, request }) => {
    const { api: apiB } = await secondUser(request, 'inst-resolve-b');
    const inst = await freshStock(api, 'RSV');

    // By id, from another user, with a different name.
    const byId = await resolveInstrument(apiB, { type: 'stock', name: 'Hijacked name', existingInstrumentId: inst.id });
    expect(byId.id).toBe(inst.id);
    expect(byId.name).toBe(inst.name);

    // By ISIN, with a different symbol / Yahoo symbol / name.
    const otherSymbol = generateYahooSymbol('RSV2');
    const byIsin = await resolveInstrument(apiB, {
      type: 'stock',
      name: 'Other name',
      isin: inst.isin!,
      symbol: otherSymbol,
      exchange: 'NSE',
      yahooSymbol: otherSymbol,
    });
    expect(byIsin.id).toBe(inst.id);
    for (const viewer of [api, apiB]) {
      const now = await getInstrument(viewer, inst.id);
      expect(now.name).toBe(inst.name);
      expect(now.symbol).toBe(inst.symbol);
      expect(now.yahooSymbol).toBe(inst.yahooSymbol);
    }

    // By symbol + exchange of a row without an ISIN: the ISIN is not written onto it.
    const ticker = generateYahooSymbol('RSV3');
    const noIsin = await resolveInstrument(api, { type: 'stock', name: `No ISIN ${uniqueSeedSuffix()}`, symbol: ticker, exchange: 'NSE' });
    expect(noIsin.isin ?? null).toBeNull();
    const bySymbol = await resolveInstrument(apiB, {
      type: 'stock',
      name: 'With ISIN',
      symbol: ticker,
      exchange: 'NSE',
      isin: generateIsin(),
    });
    expect(bySymbol.id).toBe(noIsin.id);
    expect((await getInstrument(api, noIsin.id)).isin ?? null).toBeNull();
  });
});

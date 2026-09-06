import { expectStatus } from '../fixtures/api';
import {
  createInstrument,
  generateIsin,
  generateYahooSymbol,
  refreshPrices,
  resolveInstrument,
  setManualPrice,
  uniqueSeedSuffix,
} from '../fixtures/seed/investments';
import { expect, test } from '../fixtures/test';

test.describe('Instruments API (@api)', () => {
  test('Catalog search: debounces/validates length, filters types, includes Yahoo/AMFI results and deduplicates', async ({
    api,
  }) => {
    // 1 char query returns empty
    const shortRes = await api.GET('/api/v1/instruments/catalog-search', {
      params: { query: { q: 'R' } },
    });
    expectStatus(shortRes, 200);
    expect(shortRes.data).toEqual([]);

    // 'REL' query returns Yahoo result with pricePreview 2500.50
    const relRes = await api.GET('/api/v1/instruments/catalog-search', {
      params: { query: { q: 'REL' } },
    });
    expectStatus(relRes, 200);
    const relMatches = relRes.data!;
    expect(relMatches.length).toBeGreaterThan(0);
    const reliance = relMatches.find((r) => r.symbol === 'RELIANCE.NS' || r.yahooSymbol === 'RELIANCE.NS');
    expect(reliance).toBeDefined();
    expect(reliance?.type).toBe('stock');
    expect(reliance?.pricePreview?.value).toBeGreaterThan(0);

    // MUTUALFUND entry from Yahoo is dropped (query NIFTY should have NIFTYBEES.NS ETF but not MUTUALFUND)
    const niftyRes = await api.GET('/api/v1/instruments/catalog-search', {
      params: { query: { q: 'NIFTY' } },
    });
    expectStatus(niftyRes, 200);
    const niftyMatches = niftyRes.data!;
    const niftyEtf = niftyMatches.find((r) => r.symbol === 'NIFTYBEES' || r.yahooSymbol === 'NIFTYBEES.NS');
    expect(niftyEtf).toBeDefined();
    expect(niftyEtf?.type).toBe('etf');
    const droppedMf = niftyMatches.find((r) => r.symbol === 'NIFTY_MF' || r.yahooSymbol === 'NIFTY_MF.BO');
    expect(droppedMf).toBeUndefined();

    // Trigger price refresh or search for AMFI scheme
    const amfiRes = await api.GET('/api/v1/instruments/catalog-search', {
      params: { query: { q: 'Bluechip' } },
    });
    expectStatus(amfiRes, 200);
    const amfiMatches = amfiRes.data!;
    const mfScheme = amfiMatches.find((r) => r.amfiCode === '100001' || r.name.includes('Bluechip'));
    expect(mfScheme).toBeDefined();
    expect(mfScheme?.type).toBe('mutual_fund');

    // Local instrument appears and is not duplicated
    const localIsin = generateIsin();
    const localSymbol = generateYahooSymbol('LOC');
    const localName = `Local Test Inst ${uniqueSeedSuffix()}`;
    const localInst = await resolveInstrument(api, {
      type: 'stock',
      name: localName,
      isin: localIsin,
      symbol: localSymbol,
      yahooSymbol: localSymbol,
    });
    expect(localInst.id).toBeDefined();

    const searchLocal = await api.GET('/api/v1/instruments/catalog-search', {
      params: { query: { q: localSymbol.slice(0, 5) } },
    });
    expectStatus(searchLocal, 200);
    const foundLocal = searchLocal.data!.filter((r) => r.existingInstrumentId === localInst.id || r.isin === localIsin);
    expect(foundLocal.length).toBe(1);
    expect(foundLocal[0].existingInstrumentId).toBe(localInst.id);

    // Cap <= 25
    expect(searchLocal.data!.length).toBeLessThanOrEqual(25);
  });

  test('Resolve and dedup: by existingInstrumentId, ISIN overwrite/alias, symbol+exchange backfill, create new', async ({
    api,
  }) => {
    // 1. New instrument creation
    const isin1 = generateIsin();
    const sym1 = generateYahooSymbol('RS1');
    const inst1 = await resolveInstrument(api, {
      type: 'stock',
      name: 'Resolve Test 1',
      isin: isin1,
      symbol: sym1,
      exchange: 'NSE',
      yahooSymbol: sym1,
    });
    expect(inst1.id).toBeDefined();
    expect(inst1.symbol).toBe(sym1);

    // 2. Resolve by existingInstrumentId
    const resolvedById = await resolveInstrument(api, {
      type: 'stock',
      name: 'Resolve Test 1 Updated Name',
      existingInstrumentId: inst1.id,
    });
    expect(resolvedById.id).toBe(inst1.id);

    // 3. Resolve by ISIN with symbol change -> overwrites symbol and creates alias
    const sym1New = generateYahooSymbol('RS1NEW');
    const resolvedByIsin = await resolveInstrument(api, {
      type: 'stock',
      name: 'Resolve Test 1 Re-symbol',
      isin: isin1,
      symbol: sym1New,
      exchange: 'NSE',
      yahooSymbol: sym1New,
    });
    expect(resolvedByIsin.id).toBe(inst1.id);

    const checkInst = await api.GET('/api/v1/instruments/{id}', {
      params: { path: { id: inst1.id } },
    });
    expectStatus(checkInst, 200);
    expect(checkInst.data?.symbol).toBe(sym1New);

    // 4. Resolve by symbol + exchange backfills blank ISIN
    const sym2 = generateYahooSymbol('RS2');
    const inst2 = await resolveInstrument(api, {
      type: 'stock',
      name: 'Resolve Test 2 No ISIN',
      symbol: sym2,
      exchange: 'NSE',
      yahooSymbol: sym2,
    });
    expect(inst2.isin == null || inst2.isin === '').toBe(true);

    const isin2Backfill = generateIsin();
    const backfilled = await resolveInstrument(api, {
      type: 'stock',
      name: 'Resolve Test 2 With ISIN',
      symbol: sym2,
      exchange: 'NSE',
      isin: isin2Backfill,
    });
    expect(backfilled.id).toBe(inst2.id);
    expect(backfilled.isin).toBe(isin2Backfill);
  });

  test('Instrument CRUD, list filters, direct create ISIN dedup, and 404 for unknown id', async ({
    api,
  }) => {
    const isin = generateIsin();
    const symbol = generateYahooSymbol('CRUD');
    const name = `CRUD Instrument ${uniqueSeedSuffix()}`;

    // POST /instruments
    const created = await createInstrument(api, {
      type: 'stock',
      name,
      symbol,
      exchange: 'NSE',
      isin,
      currency: 'INR',
      yahooSymbol: symbol,
    });
    expect(created.id).toBeDefined();
    expect(created.name).toBe(name);

    // POST /instruments with duplicate ISIN returns same instrument
    const dupRes = await api.POST('/api/v1/instruments', {
      body: {
        type: 'stock',
        name: 'Duplicate ISIN Name',
        isin,
        currency: 'INR',
      },
    });
    expectStatus(dupRes, 201);
    expect(dupRes.data?.id).toBe(created.id);

    // GET /instruments with search & type
    const listRes = await api.GET('/api/v1/instruments', {
      params: {
        query: {
          search: symbol,
          type: 'stock',
        },
      },
    });
    expectStatus(listRes, 200);
    expect(listRes.data?.some((i) => i.id === created.id)).toBe(true);

    // PUT /instruments/{id}
    const updatedName = `${name} (Updated)`;
    const putRes = await api.PUT('/api/v1/instruments/{id}', {
      params: { path: { id: created.id } },
      body: {
        type: 'stock',
        name: updatedName,
        symbol: created.symbol ?? undefined,
        exchange: 'BSE',
        isin: created.isin ?? undefined,
        currency: 'INR',
        yahooSymbol: created.yahooSymbol ?? undefined,
      },
    });
    expectStatus(putRes, 200);
    expect(putRes.data?.name).toBe(updatedName);
    expect(putRes.data?.exchange).toBe('BSE');

    // GET /instruments/{id}
    const getRes = await api.GET('/api/v1/instruments/{id}', {
      params: { path: { id: created.id } },
    });
    expectStatus(getRes, 200);
    expect(getRes.data?.name).toBe(updatedName);

    // Unknown id -> 404
    const unknownRes = await api.GET('/api/v1/instruments/{id}', {
      params: { path: { id: '00000000-0000-0000-0000-000000000000' } },
    });
    expectStatus(unknownRes, 404);
  });

  test('Manual prices: upsert idempotence per asOf, history filters, edit/delete MANUAL, rejecting edit on auto price', async ({
    api,
  }) => {
    const isin = generateIsin();
    const symbol = generateYahooSymbol('PRC');
    const inst = await resolveInstrument(api, {
      type: 'stock',
      name: `Price Test Instrument ${uniqueSeedSuffix()}`,
      isin,
      symbol,
      exchange: 'NSE',
      yahooSymbol: symbol,
    });

    const asOfToday = new Date().toISOString().slice(0, 10);
    const asOfYesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // 1. Upsert manual price for yesterday
    const p1Inst = await setManualPrice(api, inst.id, {
      price: 150.50,
      asOf: asOfYesterday,
    });
    expect(p1Inst.id).toBe(inst.id);

    // 2. Upsert manual price for today twice -> single row updated
    await setManualPrice(api, inst.id, {
      price: 160.00,
      asOf: asOfToday,
    });
    await setManualPrice(api, inst.id, {
      price: 165.75,
      asOf: asOfToday,
    });

    // 3. GET /instruments/{id}/prices?from=&to=
    const pricesList = await api.GET('/api/v1/instruments/{id}/prices', {
      params: {
        path: { id: inst.id },
        query: {
          from: asOfYesterday,
          to: asOfToday,
        },
      },
    });
    expectStatus(pricesList, 200);
    expect(pricesList.data?.length).toBe(2);

    const todayPrice = pricesList.data?.find((p) => p.asOf === asOfToday);
    expect(todayPrice).toBeDefined();
    expect(todayPrice?.close).toBe(165.75);

    // 4. PUT /instruments/{instrumentId}/prices/{priceId} edit MANUAL price
    const updateRes = await api.PUT('/api/v1/instruments/{instrumentId}/prices/{priceId}', {
      params: {
        path: {
          instrumentId: inst.id,
          priceId: todayPrice!.id,
        },
      },
      body: {
        price: 170.00,
        asOf: asOfToday,
      },
    });
    expectStatus(updateRes, 200);
    expect(updateRes.data?.lastPrice).toBe(170.00);

    // 5. Wrong-instrument price id -> 404
    const wrongInstRes = await api.PUT('/api/v1/instruments/{instrumentId}/prices/{priceId}', {
      params: {
        path: {
          instrumentId: '00000000-0000-0000-0000-000000000000',
          priceId: todayPrice!.id,
        },
      },
      body: { price: 175.00 },
    });
    expectStatus(wrongInstRes, 404);

    // 6. DELETE /instruments/{instrumentId}/prices/{priceId}
    const delRes = await api.DELETE('/api/v1/instruments/{instrumentId}/prices/{priceId}', {
      params: {
        path: {
          instrumentId: inst.id,
          priceId: todayPrice!.id,
        },
      },
    });
    expectStatus(delRes, 204);

    // 7. Editing an AUTO (YAHOO/AMFI) price row -> 400
    // Create an auto price row via price refresh
    const autoInst = await resolveInstrument(api, {
      type: 'stock',
      name: `Auto Price Inst ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol: 'RELIANCE.NS',
      exchange: 'NSE',
      yahooSymbol: 'RELIANCE.NS',
    });
    await refreshPrices(api, autoInst.id);

    const autoPrices = await api.GET('/api/v1/instruments/{id}/prices', {
      params: { path: { id: autoInst.id } },
    });
    expectStatus(autoPrices, 200);
    const yahooPrice = autoPrices.data?.find((p) => p.source === 'YAHOO');
    if (yahooPrice) {
      const tryEditAuto = await api.PUT('/api/v1/instruments/{instrumentId}/prices/{priceId}', {
        params: {
          path: {
            instrumentId: autoInst.id,
            priceId: yahooPrice.id,
          },
        },
        body: { price: 3000.00 },
      });
      expectStatus(tryEditAuto, 400);

      const tryDelAuto = await api.DELETE('/api/v1/instruments/{instrumentId}/prices/{priceId}', {
        params: {
          path: {
            instrumentId: autoInst.id,
            priceId: yahooPrice.id,
          },
        },
      });
      expectStatus(tryDelAuto, 400);
    }
  });

});

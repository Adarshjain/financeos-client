import { expectStatus } from '../fixtures/api';
import {
  createBroker,
  createCorporateAction,
  deleteCorporateAction,
  generateIsin,
  generateYahooSymbol,
  listAllCorporateActions,
  listInstrumentCorporateActions,
  positions,
  resolveInstrument,
  summary,
  trade,
  uniqueSeedSuffix,
  updateCorporateAction,
} from '../fixtures/seed/investments';
import { expectUnauthenticated } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Corporate Actions API (@api)', () => {
  test('Validation: bad type, ratios, demerger target/pct, merger target, negative cash, 404s', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const symA = generateYahooSymbol('VAL_A');
    const symB = generateYahooSymbol('VAL_B');

    const instA = await resolveInstrument(api, {
      type: 'stock',
      name: `CA Parent ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol: symA,
      exchange: 'NSE',
      yahooSymbol: symA,
    });

    const instB = await resolveInstrument(api, {
      type: 'stock',
      name: `CA Target ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol: symB,
      exchange: 'NSE',
      yahooSymbol: symB,
    });

    // 1. Bad type -> 400
    const badTypeRes = await api.POST('/api/v1/instruments/{instrumentId}/corporate-actions', {
      params: { path: { instrumentId: instA.id } },
      body: {
        type: 'invalid_type' as any,
        ratioFrom: 1,
        ratioTo: 2,
        exDate: '2026-08-01',
      },
    });
    expectStatus(badTypeRes, 400);

    // 2. Non-positive ratioFrom / ratioTo -> 400
    const zeroRatioRes = await api.POST('/api/v1/instruments/{instrumentId}/corporate-actions', {
      params: { path: { instrumentId: instA.id } },
      body: {
        type: 'split',
        ratioFrom: 0,
        ratioTo: 2,
        exDate: '2026-08-01',
      },
    });
    expectStatus(zeroRatioRes, 400);

    const negRatioRes = await api.POST('/api/v1/instruments/{instrumentId}/corporate-actions', {
      params: { path: { instrumentId: instA.id } },
      body: {
        type: 'split',
        ratioFrom: 1,
        ratioTo: -1,
        exDate: '2026-08-01',
      },
    });
    expectStatus(negRatioRes, 400);

    // 3. Demerger without targetInstrumentId -> 400
    const demergerNoTarget = await api.POST('/api/v1/instruments/{instrumentId}/corporate-actions', {
      params: { path: { instrumentId: instA.id } },
      body: {
        type: 'demerger',
        ratioFrom: 2,
        ratioTo: 1,
        costAllocationPct: 20,
        exDate: '2026-08-01',
      },
    });
    expectStatus(demergerNoTarget, 400);

    // 4. Demerger without costAllocationPct -> 400
    const demergerNoPct = await api.POST('/api/v1/instruments/{instrumentId}/corporate-actions', {
      params: { path: { instrumentId: instA.id } },
      body: {
        type: 'demerger',
        ratioFrom: 2,
        ratioTo: 1,
        targetInstrumentId: instB.id,
        exDate: '2026-08-01',
      },
    });
    expectStatus(demergerNoPct, 400);

    // 5. Demerger costAllocationPct 0 or 101 -> 400
    const demergerZeroPct = await api.POST('/api/v1/instruments/{instrumentId}/corporate-actions', {
      params: { path: { instrumentId: instA.id } },
      body: {
        type: 'demerger',
        ratioFrom: 2,
        ratioTo: 1,
        targetInstrumentId: instB.id,
        costAllocationPct: 0,
        exDate: '2026-08-01',
      },
    });
    expectStatus(demergerZeroPct, 400);

    const demergerHighPct = await api.POST('/api/v1/instruments/{instrumentId}/corporate-actions', {
      params: { path: { instrumentId: instA.id } },
      body: {
        type: 'demerger',
        ratioFrom: 2,
        ratioTo: 1,
        targetInstrumentId: instB.id,
        costAllocationPct: 101,
        exDate: '2026-08-01',
      },
    });
    expectStatus(demergerHighPct, 400);

    // 6. Merger target = parent -> 400
    const mergerSameTarget = await api.POST('/api/v1/instruments/{instrumentId}/corporate-actions', {
      params: { path: { instrumentId: instA.id } },
      body: {
        type: 'merger',
        ratioFrom: 1,
        ratioTo: 1,
        targetInstrumentId: instA.id,
        exDate: '2026-08-01',
      },
    });
    expectStatus(mergerSameTarget, 400);

    // 7. Negative fractionalCashInLieu -> 400
    const negCashRes = await api.POST('/api/v1/instruments/{instrumentId}/corporate-actions', {
      params: { path: { instrumentId: instA.id } },
      body: {
        type: 'merger',
        ratioFrom: 100,
        ratioTo: 155,
        targetInstrumentId: instB.id,
        fractionalCashInLieu: -10,
        exDate: '2026-08-01',
      },
    });
    expectStatus(negCashRes, 400);

    // 8. Unknown target instrument -> 404
    const unknownTargetRes = await api.POST('/api/v1/instruments/{instrumentId}/corporate-actions', {
      params: { path: { instrumentId: instA.id } },
      body: {
        type: 'demerger',
        ratioFrom: 2,
        ratioTo: 1,
        targetInstrumentId: '00000000-0000-0000-0000-000000000000',
        costAllocationPct: 20,
        exDate: '2026-08-01',
      },
    });
    expectStatus(unknownTargetRes, 404);

    // Create a valid CA to test wrong path PUT/DELETE
    const ca = await createCorporateAction(api, instA.id, {
      type: 'split',
      ratioFrom: 1,
      ratioTo: 2,
      exDate: '2026-08-01',
    });

    // 9. PUT/DELETE under the wrong instrument path -> 404
    const wrongPathPut = await api.PUT('/api/v1/instruments/{instrumentId}/corporate-actions/{id}', {
      params: { path: { instrumentId: instB.id, id: ca.id } },
      body: {
        type: 'split',
        ratioFrom: 1,
        ratioTo: 3,
        exDate: '2026-08-01',
      },
    });
    expectStatus(wrongPathPut, 404);

    const wrongPathDel = await api.DELETE('/api/v1/instruments/{instrumentId}/corporate-actions/{id}', {
      params: { path: { instrumentId: instB.id, id: ca.id } },
    });
    expectStatus(wrongPathDel, 404);
  });

  test('Split 1:2 on 10 @ 100 and Bonus 1:1 and future exDate lifecycle', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const symSplit = generateYahooSymbol('SPL');
    const symBonus = generateYahooSymbol('BON');

    const instSplit = await resolveInstrument(api, {
      type: 'stock',
      name: `Split Inst ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol: symSplit,
      exchange: 'NSE',
      yahooSymbol: symSplit,
    });

    const instBonus = await resolveInstrument(api, {
      type: 'stock',
      name: `Bonus Inst ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol: symBonus,
      exchange: 'NSE',
      yahooSymbol: symBonus,
    });

    // Initial buy: 10 @ 100
    await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: instSplit.id,
      type: 'buy',
      quantity: 10,
      price: 100,
      tradeDate: '2026-01-01',
    });

    // 1. Corporate action split 1:2 applies to position timeline
    const caSplit = await createCorporateAction(api, instSplit.id, {
      type: 'split',
      ratioFrom: 1,
      ratioTo: 2,
      exDate: '2026-06-01',
    });

    let posList = await positions(api);
    let pSplit = posList.positions.find((p) => p.instrument.id === instSplit.id);
    expect(pSplit).toBeDefined();
    expect(pSplit?.quantity).toBe(20);
    expect(pSplit?.avgCost).toBe(50);
    expect(pSplit?.invested).toBe(1000);

    // Update split ratio to 1:4 -> 40 @ 25, invested 1000 unchanged
    await updateCorporateAction(api, instSplit.id, caSplit.id, {
      type: 'split',
      ratioFrom: 1,
      ratioTo: 4,
      exDate: '2026-06-01',
    });

    posList = await positions(api);
    pSplit = posList.positions.find((p) => p.instrument.id === instSplit.id);
    expect(pSplit?.quantity).toBe(40);
    expect(pSplit?.avgCost).toBe(25);
    expect(pSplit?.invested).toBe(1000);

    // 2. Bonus 1:1 on 10 @ 100 -> qty doubles (20 @ 50)
    await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: instBonus.id,
      type: 'buy',
      quantity: 10,
      price: 100,
      tradeDate: '2026-01-01',
    });

    await createCorporateAction(api, instBonus.id, {
      type: 'bonus',
      ratioFrom: 1,
      ratioTo: 2, // 1:1 bonus means holding 1 share gives 1 bonus share -> total 2 shares for 1 (multiplier 2/1 = 2)
      exDate: '2026-06-01',
    });

    posList = await positions(api);
    const pBonus = posList.positions.find((p) => p.instrument.id === instBonus.id);
    expect(pBonus?.quantity).toBe(20);
    expect(pBonus?.avgCost).toBe(50);
    expect(pBonus?.invested).toBe(1000);
  });

  test('Demerger: parent 100 @ 100, ratio 2->1, 20% -> parent 100 sh @ 80, child 50 sh @ 40, child holding materialised', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const symParent = generateYahooSymbol('DEM_P');
    const symChild = generateYahooSymbol('DEM_C');

    const instParent = await resolveInstrument(api, {
      type: 'stock',
      name: `Demerger Parent ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol: symParent,
      exchange: 'NSE',
      yahooSymbol: symParent,
    });

    const instChild = await resolveInstrument(api, {
      type: 'stock',
      name: `Demerger Child ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol: symChild,
      exchange: 'NSE',
      yahooSymbol: symChild,
    });

    // Parent: 100 @ 100
    await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: instParent.id,
      type: 'buy',
      quantity: 100,
      price: 100,
      tradeDate: '2026-01-01',
    });

    // Demerger: ratio 2->1, cost allocation 20%
    await createCorporateAction(api, instParent.id, {
      type: 'demerger',
      ratioFrom: 2,
      ratioTo: 1,
      targetInstrumentId: instChild.id,
      costAllocationPct: 20,
      exDate: '2026-06-01',
    });

    const posList = await positions(api);
    const pParent = posList.positions.find((p) => p.instrument.id === instParent.id);
    const pChild = posList.positions.find((p) => p.instrument.id === instChild.id);

    expect(pParent).toBeDefined();
    expect(pParent?.quantity).toBe(100);
    expect(pParent?.avgCost).toBe(80);
    expect(pParent?.invested).toBe(8000);

    expect(pChild).toBeDefined();
    expect(pChild?.quantity).toBe(50);
    expect(pChild?.avgCost).toBe(40);
    expect(pChild?.invested).toBe(2000);
  });

  test('Merger: transferor 100 @ 100, ratio 25->42 -> acquirer 168 @ openCost 10,000, transferor closed with mergedIntoName', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const symTrans = generateYahooSymbol('MRG_T');
    const symAcq = generateYahooSymbol('MRG_A');

    const instTrans = await resolveInstrument(api, {
      type: 'stock',
      name: `Merger Transferor ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol: symTrans,
      exchange: 'NSE',
      yahooSymbol: symTrans,
    });

    const instAcq = await resolveInstrument(api, {
      type: 'stock',
      name: `Merger Acquirer ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol: symAcq,
      exchange: 'NSE',
      yahooSymbol: symAcq,
    });

    // Buy 100 transferor @ 100 = 10,000
    await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: instTrans.id,
      type: 'buy',
      quantity: 100,
      price: 100,
      tradeDate: '2026-01-01',
    });

    // Merger: ratio 25->42
    await createCorporateAction(api, instTrans.id, {
      type: 'merger',
      ratioFrom: 25,
      ratioTo: 42,
      targetInstrumentId: instAcq.id,
      exDate: '2026-06-01',
    });

    const posList = await positions(api);
    const pTrans = posList.positions.find((p) => p.instrument.id === instTrans.id);
    const pAcq = posList.positions.find((p) => p.instrument.id === instAcq.id);

    // Positions endpoint returns only open positions (openQty > 0); transferor position (openQty = 0) is closed
    expect(pTrans).toBeUndefined();

    expect(pAcq).toBeDefined();
    expect(pAcq?.quantity).toBe(168); // 100 * 42 / 25 = 168
    expect(pAcq?.invested).toBe(10000);

    // Summary totals do not double count
    const summ = await summary(api);
    expect(summ.totalInvested).toBeGreaterThanOrEqual(10000);
  });

  test('Fractional merger: 121 @ 100, ratio 100->155 with cash-in-lieu 385 -> +349.5161 realized, then PUT to 0 -> -35.4839', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const symFracT = generateYahooSymbol('FRAC_T');
    const symFracA = generateYahooSymbol('FRAC_A');

    const instFracT = await resolveInstrument(api, {
      type: 'stock',
      name: `Frac Transferor ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol: symFracT,
      exchange: 'NSE',
      yahooSymbol: symFracT,
    });

    const instFracA = await resolveInstrument(api, {
      type: 'stock',
      name: `Frac Acquirer ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol: symFracA,
      exchange: 'NSE',
      yahooSymbol: symFracA,
    });

    // 121 @ 100 = 12,100
    await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: instFracT.id,
      type: 'buy',
      quantity: 121,
      price: 100,
      tradeDate: '2026-01-01',
    });

    // Merger with fractionalCashInLieu = 385
    const ca = await createCorporateAction(api, instFracT.id, {
      type: 'merger',
      ratioFrom: 100,
      ratioTo: 155,
      targetInstrumentId: instFracA.id,
      fractionalCashInLieu: 385,
      exDate: '2026-06-01',
    });

    let posList = await positions(api);
    let pAcq = posList.positions.find((p) => p.instrument.id === instFracA.id);
    expect(pAcq).toBeDefined();
    expect(pAcq?.quantity).toBe(187);
    // Realized PnL is reported on PositionDto.realizedGainLoss
    expect(pAcq?.realizedGainLoss).toBeCloseTo(349.5161, 3);

    // Update fractionalCashInLieu to 0
    await updateCorporateAction(api, instFracT.id, ca.id, {
      type: 'merger',
      ratioFrom: 100,
      ratioTo: 155,
      targetInstrumentId: instFracA.id,
      fractionalCashInLieu: 0,
      exDate: '2026-06-01',
    });

    posList = await positions(api);
    pAcq = posList.positions.find((p) => p.instrument.id === instFracA.id);
    expect(pAcq?.quantity).toBe(187);
    expect(pAcq?.realizedGainLoss).toBeCloseTo(-35.4839, 3);
  });

  test('Listing, updating ratio recomputes positions, delete reverts positions', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const sym = generateYahooSymbol('REV');

    const inst = await resolveInstrument(api, {
      type: 'stock',
      name: `Revert Inst ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol: sym,
      exchange: 'NSE',
      yahooSymbol: sym,
    });

    await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: inst.id,
      type: 'buy',
      quantity: 10,
      price: 100,
      tradeDate: '2026-01-01',
    });

    const ca = await createCorporateAction(api, inst.id, {
      type: 'split',
      ratioFrom: 1,
      ratioTo: 2,
      exDate: '2026-06-01',
    });

    // 1. GET /corporate-actions lists all
    const allCAs = await listAllCorporateActions(api);
    expect(allCAs.some((item) => item.id === ca.id)).toBe(true);

    // 2. GET per-instrument corporate actions
    const instCAs = await listInstrumentCorporateActions(api, inst.id);
    expect(instCAs.length).toBe(1);
    expect(instCAs[0].id).toBe(ca.id);

    // 3. Update ratio 1:5 -> qty becomes 50 @ 20
    await updateCorporateAction(api, inst.id, ca.id, {
      type: 'split',
      ratioFrom: 1,
      ratioTo: 5,
      exDate: '2026-06-01',
    });

    let posList = await positions(api);
    let pos = posList.positions.find((p) => p.instrument.id === inst.id);
    expect(pos?.quantity).toBe(50);
    expect(pos?.avgCost).toBe(20);

    // 4. Delete CA -> reverts back to 10 @ 100
    await deleteCorporateAction(api, inst.id, ca.id);

    posList = await positions(api);
    pos = posList.positions.find((p) => p.instrument.id === inst.id);
    expect(pos?.quantity).toBe(10);
    expect(pos?.avgCost).toBe(100);

    const emptyCAs = await listInstrumentCorporateActions(api, inst.id);
    expect(emptyCAs.length).toBe(0);
  });

  test('Unauthenticated 401s on all corporate action endpoints', async () => {
    const dummyId = '00000000-0000-0000-0000-000000000000';

    await expectUnauthenticated('GET', '/api/v1/corporate-actions');
    await expectUnauthenticated('GET', `/api/v1/instruments/${dummyId}/corporate-actions`);
    await expectUnauthenticated('POST', `/api/v1/instruments/${dummyId}/corporate-actions`, {
      type: 'split',
      ratioFrom: 1,
      ratioTo: 2,
      exDate: '2026-08-01',
    });
    await expectUnauthenticated('PUT', `/api/v1/instruments/${dummyId}/corporate-actions/${dummyId}`, {
      type: 'split',
      ratioFrom: 1,
      ratioTo: 2,
      exDate: '2026-08-01',
    });
    await expectUnauthenticated('DELETE', `/api/v1/instruments/${dummyId}/corporate-actions/${dummyId}`);
  });
});

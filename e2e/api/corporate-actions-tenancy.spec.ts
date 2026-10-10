// Corporate actions are per user: each user's lists hold only their own, another user's id is a 404
// for edit and delete, a user's action adjusts only their own positions, and creating one needs a
// signed-in user.

import type { ApiClient } from '../fixtures/api';
import { expectStatus } from '../fixtures/api';
import {
  createBroker,
  createCorporateAction,
  generateIsin,
  generateYahooSymbol,
  listAllCorporateActions,
  listInstrumentCorporateActions,
  positions,
  resolveInstrument,
  trade,
  uniqueSeedSuffix,
} from '../fixtures/seed/investments';
import { expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

/** A broker plus one buy of 10 @ 100 of `instrumentId` (before any ex-date used below). */
async function hold(api: ApiClient, instrumentId: string) {
  const broker = await createBroker(api);
  await trade(api, { brokerAccountId: broker.id, instrumentId, type: 'buy', quantity: 10, price: 100, tradeDate: '2026-01-01' });
  return broker.id;
}

async function quantityAt(api: ApiClient, brokerAccountId: string, instrumentId: string) {
  const pos = (await positions(api)).positions.find(
    (p) => p.brokerAccountId === brokerAccountId && p.instrument.id === instrumentId
  );
  return pos?.quantity;
}

test.describe('Corporate actions per user (@api)', () => {
  test('lists hold only the caller\'s own; another user\'s id is 404 for edit and delete; positions are per user', async ({
    api,
    request,
  }) => {
    const { api: apiB } = await secondUser(request, 'ca-tenancy-b');
    const sym = generateYahooSymbol('CAT');
    const inst = await resolveInstrument(api, {
      type: 'stock',
      name: `CA Tenancy ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol: sym,
      exchange: 'NSE',
      yahooSymbol: sym,
    });
    const brokerA = await hold(api, inst.id);
    const brokerB = await hold(apiB, inst.id);

    const aSplit = await createCorporateAction(api, inst.id, { type: 'split', ratioFrom: 1, ratioTo: 2, exDate: '2026-06-01' });

    // A sees it; B sees nothing, on either list, and B's position ignores it.
    expect((await listAllCorporateActions(api)).map((c) => c.id)).toContain(aSplit.id);
    expect((await listInstrumentCorporateActions(api, inst.id)).map((c) => c.id)).toEqual([aSplit.id]);
    expect((await listAllCorporateActions(apiB)).some((c) => c.id === aSplit.id)).toBe(false);
    expect(await listInstrumentCorporateActions(apiB, inst.id)).toEqual([]);
    expect(await quantityAt(api, brokerA, inst.id)).toBe(20);
    expect(await quantityAt(apiB, brokerB, inst.id)).toBe(10);

    // B can neither edit nor delete A's action.
    const bPut = await apiB.PUT('/api/v1/instruments/{instrumentId}/corporate-actions/{id}', {
      params: { path: { instrumentId: inst.id, id: aSplit.id } },
      body: { type: 'split', ratioFrom: 1, ratioTo: 10, exDate: '2026-06-01' },
    });
    expectStatus(bPut, 404);
    const bDelete = await apiB.DELETE('/api/v1/instruments/{instrumentId}/corporate-actions/{id}', {
      params: { path: { instrumentId: inst.id, id: aSplit.id } },
    });
    expectStatus(bDelete, 404);
    const aStill = (await listInstrumentCorporateActions(api, inst.id)).find((c) => c.id === aSplit.id);
    expect(aStill?.ratioTo).toBe(2);
    expect(await quantityAt(api, brokerA, inst.id)).toBe(20);

    // B records their own (a 1:1 bonus, stored held → held-after as 1 → 2) on the same instrument:
    // each list has only its owner's.
    const bBonus = await createCorporateAction(apiB, inst.id, { type: 'bonus', ratioFrom: 1, ratioTo: 2, exDate: '2026-07-01' });
    expect((await listInstrumentCorporateActions(apiB, inst.id)).map((c) => c.id)).toEqual([bBonus.id]);
    expect((await listInstrumentCorporateActions(api, inst.id)).map((c) => c.id)).toEqual([aSplit.id]);
    expect((await listAllCorporateActions(api)).some((c) => c.id === bBonus.id)).toBe(false);
    expect(await quantityAt(apiB, brokerB, inst.id)).toBe(20);
    expect(await quantityAt(api, brokerA, inst.id)).toBe(20);

    // A can't touch B's either; B deleting their own leaves A's.
    const aPutB = await api.PUT('/api/v1/instruments/{instrumentId}/corporate-actions/{id}', {
      params: { path: { instrumentId: inst.id, id: bBonus.id } },
      body: { type: 'bonus', ratioFrom: 1, ratioTo: 5, exDate: '2026-07-01' },
    });
    expectStatus(aPutB, 404);
    const bDeleteOwn = await apiB.DELETE('/api/v1/instruments/{instrumentId}/corporate-actions/{id}', {
      params: { path: { instrumentId: inst.id, id: bBonus.id } },
    });
    expectStatus(bDeleteOwn, 204);
    expect(await quantityAt(apiB, brokerB, inst.id)).toBe(10);
    expect((await listInstrumentCorporateActions(api, inst.id)).map((c) => c.id)).toEqual([aSplit.id]);

    // Deleting an already-deleted action is a 404 for its owner too.
    const again = await apiB.DELETE('/api/v1/instruments/{instrumentId}/corporate-actions/{id}', {
      params: { path: { instrumentId: inst.id, id: bBonus.id } },
    });
    expectStatus(again, 404);
  });

  test('a demerger is per user too: the child holding appears only for its owner', async ({ api, request }) => {
    const { api: apiB } = await secondUser(request, 'ca-tenancy-dem-b');
    const parent = await resolveInstrument(api, { type: 'stock', name: `Tenancy Parent ${uniqueSeedSuffix()}`, isin: generateIsin() });
    const child = await resolveInstrument(api, { type: 'stock', name: `Tenancy Child ${uniqueSeedSuffix()}`, isin: generateIsin() });
    await hold(api, parent.id);
    await hold(apiB, parent.id);

    await createCorporateAction(api, parent.id, {
      type: 'demerger',
      ratioFrom: 2,
      ratioTo: 1,
      targetInstrumentId: child.id,
      costAllocationPct: 20,
      exDate: '2026-06-01',
    });

    const aChild = (await positions(api)).positions.find((p) => p.instrument.id === child.id);
    expect(aChild?.quantity).toBe(5);
    expect((await positions(apiB)).positions.some((p) => p.instrument.id === child.id)).toBe(false);
    const bParent = (await positions(apiB)).positions.find((p) => p.instrument.id === parent.id);
    expect(bParent?.avgCost).toBe(100);
  });

  test('listing and creating need a signed-in user', async ({ api }) => {
    const inst = await resolveInstrument(api, { type: 'stock', name: `CA Auth ${uniqueSeedSuffix()}`, isin: generateIsin() });
    await expectUnauthenticated('GET', '/api/v1/corporate-actions');
    await expectUnauthenticated('POST', `/api/v1/instruments/${inst.id}/corporate-actions`, {
      type: 'split',
      ratioFrom: 1,
      ratioTo: 2,
      exDate: '2026-06-01',
    });
    expect(await listInstrumentCorporateActions(api, inst.id)).toEqual([]);
  });
});

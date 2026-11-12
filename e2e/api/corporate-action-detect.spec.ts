import { expectStatus } from '../fixtures/api';
import {
  DETECT_EX_DATE,
  inboxRowsForCorporateActions,
  seedDetectablePurchases,
  suggestionOf,
  waitForSuggestion,
} from '../fixtures/seed/corporateActionDetect';
import { listInstrumentCorporateActions, positions, resolveInstrument } from '../fixtures/seed/investments';
import { secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Detected corporate actions API (@api)', () => {
  test('an import is read against the exchange feed: the confirmed bonus is applied, the rest wait for review', async ({ api }) => {
    test.slow();
    const seed = await seedDetectablePurchases(api);

    // Confirmed by the price feed (2:1 split on the ex-date): applied on its own and listed on the Corporate actions page
    // (the Inbox gets no row for an automatic one).
    const applied = await waitForSuggestion(api, 'appliedAutomatically', seed.bonus.id);
    expect(applied.kind).toBe('bonus');

    const actions = await listInstrumentCorporateActions(api, seed.bonus.id);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ type: 'bonus', ratioFrom: 1, ratioTo: 2, exDate: DETECT_EX_DATE });
    const held = (await positions(api)).positions.find((p) => p.instrument.id === seed.bonus.id);
    expect(held?.quantity).toBe(20);

    const suggestion = await api.GET('/api/v1/corporate-action-suggestions/{id}', { params: { path: { id: applied.id } } });
    expectStatus(suggestion, 200);
    expect(suggestion.data).toMatchObject({ kind: 'bonus', status: 'auto_applied', exDate: DETECT_EX_DATE, instrument: { id: seed.bonus.id } });

    // No split in the price feed, and a demerger: nothing is applied, the user is asked.
    await waitForSuggestion(api, 'needsReview', seed.miss.id);
    await waitForSuggestion(api, 'needsReview', seed.demerge.id);
    // The Inbox only points: both wait behind one row to the page, with no actions of its own.
    await expect
      .poll(async () => (await inboxRowsForCorporateActions(api)).map((r) => ({ count: r.count, actions: r.actions.length })))
      .toEqual([{ count: 2, actions: 0 }]);
    const [pointer] = await inboxRowsForCorporateActions(api);
    expect(pointer.key).toBe('page:/investments/corporate-actions');
    expect(pointer.title).toBe('Corporate actions: 2 to review');
    expect(await listInstrumentCorporateActions(api, seed.miss.id)).toHaveLength(0);
    expect(await listInstrumentCorporateActions(api, seed.demerge.id)).toHaveLength(0);

    // The demerger carries the new company the exchange listed after the ex-date; the listing cache warms in the
    // background, so the first read may not have it yet. The bonus items have none.
    await expect
      .poll(async () => (await suggestionOf(api, 'needsReview', seed.demerge.id))?.possibleChildren.map((c) => c.symbol), { timeout: 60_000 })
      .toEqual(['E2EDMCHILD']);
    expect((await suggestionOf(api, 'needsReview', seed.miss.id))?.possibleChildren).toEqual([]);
    expect((await suggestionOf(api, 'appliedAutomatically', seed.bonus.id))?.possibleChildren).toEqual([]);
  });

  test('undo takes the applied action and its listing away', async ({ api }) => {
    test.slow();
    const seed = await seedDetectablePurchases(api);
    const applied = await waitForSuggestion(api, 'appliedAutomatically', seed.bonus.id);
    const id = applied.id;

    const undo = await api.POST('/api/v1/corporate-action-suggestions/{id}/undo', { params: { path: { id } } });
    expectStatus(undo, 200);
    expect(await listInstrumentCorporateActions(api, seed.bonus.id)).toHaveLength(0);
    expect(await suggestionOf(api, 'appliedAutomatically', seed.bonus.id)).toBeUndefined();
    const held = (await positions(api)).positions.find((p) => p.instrument.id === seed.bonus.id);
    expect(held?.quantity).toBe(10);

    // Only an automatically applied one can be undone.
    const again = await api.POST('/api/v1/corporate-action-suggestions/{id}/undo', { params: { path: { id } } });
    expectStatus(again, 400);
  });

  test('not applicable dismisses a pending suggestion; accept and dismiss refuse a settled one', async ({ api }) => {
    test.slow();
    const seed = await seedDetectablePurchases(api);
    const review = await waitForSuggestion(api, 'needsReview', seed.miss.id);
    const id = review.id;

    const dismissed = await api.POST('/api/v1/corporate-action-suggestions/{id}/dismiss', { params: { path: { id } } });
    expectStatus(dismissed, 200);
    expect(await suggestionOf(api, 'needsReview', seed.miss.id)).toBeUndefined();
    expect(await listInstrumentCorporateActions(api, seed.miss.id)).toHaveLength(0);

    const again = await api.POST('/api/v1/corporate-action-suggestions/{id}/dismiss', { params: { path: { id } } });
    expectStatus(again, 400);
    const accept = await api.POST('/api/v1/corporate-action-suggestions/{id}/accept', {
      params: { path: { id } },
      body: { type: 'bonus', ratioFrom: 1, ratioTo: 2, exDate: DETECT_EX_DATE },
    });
    expectStatus(accept, 400);
  });

  test('accepting a demerger records it and clears it from the review list', async ({ api }) => {
    test.slow();
    const seed = await seedDetectablePurchases(api);
    const review = await waitForSuggestion(api, 'needsReview', seed.demerge.id);
    const id = review.id;
    const child = await resolveInstrument(api, {
      type: 'stock',
      name: 'E2E Demerged Child Limited',
      isin: 'INE2E0000045',
      symbol: 'E2EDCHILD',
      exchange: 'NSE',
      yahooSymbol: 'E2EDCHILD.NS',
    });

    const accept = await api.POST('/api/v1/corporate-action-suggestions/{id}/accept', {
      params: { path: { id } },
      body: {
        type: 'demerger',
        ratioFrom: 1,
        ratioTo: 1,
        exDate: DETECT_EX_DATE,
        targetInstrumentId: child.id,
        costAllocationPct: 20,
        fractionalCashInLieu: 0,
      },
    });
    expectStatus(accept, 200);
    expect(accept.data).toMatchObject({ status: 'accepted' });

    const actions = await listInstrumentCorporateActions(api, seed.demerge.id);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ type: 'demerger', exDate: DETECT_EX_DATE });
    expect(await suggestionOf(api, 'needsReview', seed.demerge.id)).toBeUndefined();
  });

  test('another user sees none of it and gets 404 on the suggestion', async ({ request }) => {
    test.slow();
    // A fresh owner: the shared user has already undone its applied action, and an undone action is never re-applied.
    const { api: owner } = await secondUser(request, 'detect-owner');
    const seed = await seedDetectablePurchases(owner);
    const applied = await waitForSuggestion(owner, 'appliedAutomatically', seed.bonus.id);
    const review = await waitForSuggestion(owner, 'needsReview', seed.miss.id);

    const { api: other } = await secondUser(request, 'detect-other');
    const inbox = await other.GET('/api/v1/inbox');
    expectStatus(inbox, 200);
    expect(inbox.data!.items.filter((i) => i.kind.startsWith('corporate_action'))).toEqual([]);
    expectStatus(await other.GET('/api/v1/corporate-action-suggestions/{id}', { params: { path: { id: applied.id } } }), 404);
    expectStatus(await other.POST('/api/v1/corporate-action-suggestions/{id}/undo', { params: { path: { id: applied.id } } }), 404);
    expectStatus(await other.POST('/api/v1/corporate-action-suggestions/{id}/dismiss', { params: { path: { id: review.id } } }), 404);
    expect(await listInstrumentCorporateActions(other, seed.bonus.id)).toHaveLength(0);
  });
});

import { expectStatus } from '../fixtures/api';
import {
  DETECT_EX_DATE,
  inboxItemOf,
  seedDetectablePurchases,
  waitForInboxItem,
} from '../fixtures/seed/corporateActionDetect';
import { listInstrumentCorporateActions, positions, resolveInstrument } from '../fixtures/seed/investments';
import { secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Detected corporate actions API (@api)', () => {
  test('an import is read against the exchange feed: the confirmed bonus is applied, the rest wait for review', async ({ api }) => {
    test.slow();
    const seed = await seedDetectablePurchases(api);

    // Confirmed by the price feed (2:1 split on the ex-date): applied on its own, with an inbox row to undo it.
    const applied = await waitForInboxItem(api, 'corporate_action_applied', seed.bonus.id);
    expect(applied.key).toBe(`ca_applied:${applied.refs.suggestionId}`);
    expect(applied.title).toContain('Bonus 1:1 applied to');
    expect(applied.href).toBe('/investments/corporate-actions');
    expect(applied.actions.map((a) => a.type)).toEqual(expect.arrayContaining(['open', 'dismiss']));

    const actions = await listInstrumentCorporateActions(api, seed.bonus.id);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ type: 'bonus', ratioFrom: 1, ratioTo: 2, exDate: DETECT_EX_DATE });
    const held = (await positions(api)).positions.find((p) => p.instrument.id === seed.bonus.id);
    expect(held?.quantity).toBe(20);

    const suggestion = await api.GET('/api/v1/corporate-action-suggestions/{id}', { params: { path: { id: applied.refs.suggestionId! } } });
    expectStatus(suggestion, 200);
    expect(suggestion.data).toMatchObject({ kind: 'bonus', status: 'auto_applied', exDate: DETECT_EX_DATE, instrument: { id: seed.bonus.id } });

    // No split in the price feed, and a demerger: nothing is applied, the user is asked.
    const missReview = await waitForInboxItem(api, 'corporate_action_review', seed.miss.id);
    const demergeReview = await waitForInboxItem(api, 'corporate_action_review', seed.demerge.id);
    expect(missReview.key).toBe(`ca_review:${missReview.refs.suggestionId}`);
    expect(demergeReview.key).toBe(`ca_review:${demergeReview.refs.suggestionId}`);
    expect(await listInstrumentCorporateActions(api, seed.miss.id)).toHaveLength(0);
    expect(await listInstrumentCorporateActions(api, seed.demerge.id)).toHaveLength(0);
  });

  test('undo takes the applied action and its row away', async ({ api }) => {
    test.slow();
    const seed = await seedDetectablePurchases(api);
    const applied = await waitForInboxItem(api, 'corporate_action_applied', seed.bonus.id);
    const id = applied.refs.suggestionId!;

    const undo = await api.POST('/api/v1/corporate-action-suggestions/{id}/undo', { params: { path: { id } } });
    expectStatus(undo, 200);
    expect(await listInstrumentCorporateActions(api, seed.bonus.id)).toHaveLength(0);
    expect(await inboxItemOf(api, 'corporate_action_applied', seed.bonus.id)).toBeUndefined();
    const held = (await positions(api)).positions.find((p) => p.instrument.id === seed.bonus.id);
    expect(held?.quantity).toBe(10);

    // Only an automatically applied one can be undone.
    const again = await api.POST('/api/v1/corporate-action-suggestions/{id}/undo', { params: { path: { id } } });
    expectStatus(again, 400);
  });

  test('not applicable dismisses a pending suggestion; accept and dismiss refuse a settled one', async ({ api }) => {
    test.slow();
    const seed = await seedDetectablePurchases(api);
    const review = await waitForInboxItem(api, 'corporate_action_review', seed.miss.id);
    const id = review.refs.suggestionId!;

    const dismissed = await api.POST('/api/v1/corporate-action-suggestions/{id}/dismiss', { params: { path: { id } } });
    expectStatus(dismissed, 200);
    expect(await inboxItemOf(api, 'corporate_action_review', seed.miss.id)).toBeUndefined();
    expect(await listInstrumentCorporateActions(api, seed.miss.id)).toHaveLength(0);

    const again = await api.POST('/api/v1/corporate-action-suggestions/{id}/dismiss', { params: { path: { id } } });
    expectStatus(again, 400);
    const accept = await api.POST('/api/v1/corporate-action-suggestions/{id}/accept', {
      params: { path: { id } },
      body: { type: 'bonus', ratioFrom: 1, ratioTo: 2, exDate: DETECT_EX_DATE },
    });
    expectStatus(accept, 400);
  });

  test('accepting a demerger records it and clears its row', async ({ api }) => {
    test.slow();
    const seed = await seedDetectablePurchases(api);
    const review = await waitForInboxItem(api, 'corporate_action_review', seed.demerge.id);
    const id = review.refs.suggestionId!;
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
    expect(await inboxItemOf(api, 'corporate_action_review', seed.demerge.id)).toBeUndefined();
  });

  test('another user sees none of it and gets 404 on the suggestion', async ({ request }) => {
    test.slow();
    // A fresh owner: the shared user has already undone its applied action, and an undone action is never re-applied.
    const { api: owner } = await secondUser(request, 'detect-owner');
    const seed = await seedDetectablePurchases(owner);
    const applied = await waitForInboxItem(owner, 'corporate_action_applied', seed.bonus.id);
    const review = await waitForInboxItem(owner, 'corporate_action_review', seed.miss.id);

    const { api: other } = await secondUser(request, 'detect-other');
    const inbox = await other.GET('/api/v1/inbox');
    expectStatus(inbox, 200);
    expect(inbox.data!.items.filter((i) => i.kind.startsWith('corporate_action'))).toEqual([]);
    expectStatus(await other.GET('/api/v1/corporate-action-suggestions/{id}', { params: { path: { id: applied.refs.suggestionId! } } }), 404);
    expectStatus(await other.POST('/api/v1/corporate-action-suggestions/{id}/undo', { params: { path: { id: applied.refs.suggestionId! } } }), 404);
    expectStatus(await other.POST('/api/v1/corporate-action-suggestions/{id}/dismiss', { params: { path: { id: review.refs.suggestionId! } } }), 404);
    expect(await listInstrumentCorporateActions(other, seed.bonus.id)).toHaveLength(0);
  });
});

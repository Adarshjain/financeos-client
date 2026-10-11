import type { ApiClient } from '../fixtures/api';
import { expectStatus, waitForJob } from '../fixtures/api';
import { createCreditCard } from '../fixtures/seed/accounts';
import {
  createBroker,
  createFnoTrade,
  createSip,
  generateIsin,
  generateYahooSymbol,
  listFnoTrades,
  positions,
  resolveInstrument,
  uniqueSeedSuffix,
} from '../fixtures/seed/investments';
import { secondUser } from '../fixtures/tenancy';
import { expect, freshUser, test } from '../fixtures/test';

/**
 * Investment rows and the broker account a write names belong to one user. Another user's id answers
 * 404 — the same as an id that does not exist, so the response never reveals that it does — and the
 * owner's data is untouched.
 */
test.describe('Investment tenancy (@api)', () => {
  async function instrument(api: ApiClient) {
    const symbol = generateYahooSymbol('TNCY');
    return resolveInstrument(api, {
      type: 'stock',
      name: `Tenancy Inst ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol,
      exchange: 'NSE',
      yahooSymbol: symbol,
    });
  }

  const fnoBody = (brokerAccountId: string) => ({
    brokerAccountId,
    tradingSymbol: 'NIFTY24AUGFUT',
    quantity: 50,
    buyValue: 1200000,
    sellValue: 1215000,
    totalCharges: 200,
  });

  test('F&O: another user cannot update or delete my trade, or file a trade on my broker account', async ({ request }) => {
    const { api } = await freshUser(request, 'tenancy-a');
    const brokerA = await createBroker(api);
    const tradeA = await createFnoTrade(api, { ...fnoBody(brokerA.id), notes: 'mine' });
    const { api: apiB } = await secondUser(request, 'fno-tenancy-b');
    const brokerB = await createBroker(apiB);

    const update = await apiB.PUT('/api/v1/investments/fno/{id}', {
      params: { path: { id: tradeA.id } },
      body: { ...fnoBody(brokerB.id), notes: 'overwritten' },
    });
    expectStatus(update, 404);

    const del = await apiB.DELETE('/api/v1/investments/fno/{id}', { params: { path: { id: tradeA.id } } });
    expectStatus(del, 404);

    const onMyAccount = await apiB.POST('/api/v1/investments/fno', { body: fnoBody(brokerA.id) });
    expectStatus(onMyAccount, 404);

    // A's trade is unchanged and A's account carries no trade of B's.
    const mine = (await listFnoTrades(api)).trades;
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ id: tradeA.id, notes: 'mine', brokerAccountId: brokerA.id });
    expect((await listFnoTrades(apiB)).trades).toHaveLength(0);
  });

  test('SIPs: another user cannot read my SIP or create one on my broker account', async ({ request }) => {
    const { api } = await freshUser(request, 'tenancy-a');
    const brokerA = await createBroker(api);
    const inst = await instrument(api);
    const sipA = await createSip(api, {
      brokerAccountId: brokerA.id,
      instrumentId: inst.id,
      amount: 2500,
      frequency: 'monthly',
      dayOfMonth: 7,
      startDate: '2026-01-07',
    });
    const { api: apiB } = await secondUser(request, 'sip-tenancy-b');

    const read = await apiB.GET('/api/v1/investments/sips/{id}', { params: { path: { id: sipA.id } } });
    expectStatus(read, 404);

    const onMyAccount = await apiB.POST('/api/v1/investments/sips', {
      body: {
        brokerAccountId: brokerA.id,
        instrumentId: inst.id,
        amount: 1,
        frequency: 'monthly',
        dayOfMonth: 1,
        startDate: '2026-01-01',
      },
    });
    expectStatus(onMyAccount, 404);

    // The owner still reads it.
    const own = await api.GET('/api/v1/investments/sips/{id}', { params: { path: { id: sipA.id } } });
    expectStatus(own, 200);
    expect(own.data?.amount).toBe(2500);
  });

  test('manual trades: another user cannot file a trade on my broker account', async ({ request }) => {
    const { api } = await freshUser(request, 'tenancy-a');
    const brokerA = await createBroker(api);
    const { api: apiB } = await secondUser(request, 'trade-tenancy-b');
    const inst = await instrument(apiB);

    const res = await apiB.POST('/api/v1/investments/transactions', {
      body: { brokerAccountId: brokerA.id, instrumentId: inst.id, type: 'buy', quantity: 1, price: 10, tradeDate: '2026-08-01' },
    });
    expectStatus(res, 404);
    expect((await positions(api)).positions ?? []).toHaveLength(0);
  });

  test('broker imports: another user cannot preview or commit an import or reconcile into my broker account', async ({ request }) => {
    const { api } = await freshUser(request, 'tenancy-a');
    const brokerA = await createBroker(api);
    const { api: apiB } = await secondUser(request, 'import-tenancy-b');

    const file = () => {
      const form = new FormData();
      form.append('file', new Blob([new Uint8Array(Buffer.from('trade_date,symbol\n'))], { type: 'text/csv' }), 'tradebook.csv');
      return form;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const preview = await (apiB as any).POST('/api/v1/investments/imports/preview', {
      params: { query: { source: 'zerodha_tradebook', brokerAccountId: brokerA.id } },
      body: file(),
      bodySerializer: (b: unknown) => b,
    });
    expectStatus(preview, 404);

    const reconcileForm = new FormData();
    reconcileForm.append('taxpnlFiles', new Blob([new Uint8Array([0])]), 'taxpnl.xlsx');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reconcilePreview = await (apiB as any).POST('/api/v1/investments/imports/reconcile/preview', {
      params: { query: { broker: 'zerodha', brokerAccountId: brokerA.id } },
      body: reconcileForm,
      bodySerializer: (b: unknown) => b,
    });
    expectStatus(reconcilePreview, 404);

    // Commits run as jobs: the job fails on the account lookup and writes nothing.
    const commit = await apiB.POST('/api/v1/investments/imports/commit', {
      body: { source: 'zerodha_tradebook', brokerAccountId: brokerA.id, rows: [] },
    });
    expectStatus(commit, 202);
    const commitJob = await waitForJob(apiB, commit.data!.jobId);
    expect(commitJob.status).toBe('FAILED');
    expect(commitJob.errorCode).toBe('ResourceNotFoundException');

    const reconcileCommit = await apiB.POST('/api/v1/investments/imports/reconcile/commit', {
      body: { broker: 'zerodha', brokerAccountId: brokerA.id, executions: [], classifications: [], fnoTrades: [] },
    });
    expectStatus(reconcileCommit, 202);
    const reconcileJob = await waitForJob(apiB, reconcileCommit.data!.jobId);
    expect(reconcileJob.status).toBe('FAILED');
    expect(reconcileJob.errorCode).toBe('ResourceNotFoundException');

    expect((await positions(api)).positions ?? []).toHaveLength(0);
  });

  test('credit cards: a new card can replace my own old card but not another user\'s account', async ({ request }) => {
    const { api } = await freshUser(request, 'tenancy-a');
    const { api: apiB } = await secondUser(request, 'replaces-tenancy-b');
    const theirCard = await createCreditCard(apiB);

    const cardBody = (replacesAccountId: string) => ({
      type: 'credit_card' as const,
      name: `Replacement ${uniqueSeedSuffix()}`,
      last4: '9876',
      creditLimit: 50000,
      anniversaryDate: '2026-01-01',
      financialPosition: 'liability' as const,
      excludeFromNetAsset: false,
      replacesAccountId,
    });

    const foreign = await api.POST('/api/v1/accounts', { body: cardBody(theirCard.id) });
    expectStatus(foreign, 404);

    const myOldCard = await createCreditCard(api);
    const own = await api.POST('/api/v1/accounts', { body: cardBody(myOldCard.id) });
    expectStatus(own, 201);
    expect((own.data as { replacesAccountId?: string }).replacesAccountId).toBe(myOldCard.id);
  });
});

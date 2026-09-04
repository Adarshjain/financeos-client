import { expectStatus } from '../fixtures/api';
import { createBankAccount } from '../fixtures/seed/accounts';
import {
  createBroker,
  createSip,
  generateIsin,
  generateYahooSymbol,
  resolveInstrument,
  trade,
  uniqueSeedSuffix,
} from '../fixtures/seed/investments';
import { expectForeign, expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('SIPs API (@api)', () => {
  test('SIP creation validation: non-broker account 400, negative amount 400, unknown ids 404', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const bank = await createBankAccount(api);
    const symbol = generateYahooSymbol('SIPVAL');
    const inst = await resolveInstrument(api, {
      type: 'stock',
      name: `SIP Validation Inst ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol,
      exchange: 'NSE',
      yahooSymbol: symbol,
    });

    // Non-broker account -> 400
    const bankSipRes = await api.POST('/api/v1/investments/sips', {
      body: {
        brokerAccountId: bank.id,
        instrumentId: inst.id,
        amount: 5000,
        frequency: 'monthly',
        dayOfMonth: 5,
        startDate: '2026-01-05',
      },
    });
    expectStatus(bankSipRes, 400);
    expect(bankSipRes.error?.message).toContain('Account must be a broker account');

    // Amount <= 0 -> 400
    const zeroAmtRes = await api.POST('/api/v1/investments/sips', {
      body: {
        brokerAccountId: broker.id,
        instrumentId: inst.id,
        amount: 0,
        frequency: 'monthly',
        dayOfMonth: 5,
        startDate: '2026-01-05',
      },
    });
    expectStatus(zeroAmtRes, 400);

    // Unknown instrument -> 404
    const unknownInstRes = await api.POST('/api/v1/investments/sips', {
      body: {
        brokerAccountId: broker.id,
        instrumentId: '00000000-0000-0000-0000-000000000000',
        amount: 5000,
        frequency: 'monthly',
        dayOfMonth: 5,
        startDate: '2026-01-05',
      },
    });
    expectStatus(unknownInstRes, 404);
  });

  test('SIP CRUD, dynamic progress computation matching buy trades, and active filter', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const symbol = generateYahooSymbol('SIPPROG');
    const inst = await resolveInstrument(api, {
      type: 'stock',
      name: `SIP Progress Inst ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol,
      exchange: 'NSE',
      yahooSymbol: symbol,
    });

    // Compute a date 3 months ago on day 5
    const now = new Date();
    const d3MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 5);
    const startDate = d3MonthsAgo.toISOString().slice(0, 10);

    // Create 2 matching buy trades
    const dMonth1 = new Date(now.getFullYear(), now.getMonth() - 3, 5).toISOString().slice(0, 10);
    const dMonth2 = new Date(now.getFullYear(), now.getMonth() - 2, 5).toISOString().slice(0, 10);

    await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: inst.id,
      type: 'buy',
      quantity: 10,
      price: 100,
      tradeDate: dMonth1,
    });

    await trade(api, {
      brokerAccountId: broker.id,
      instrumentId: inst.id,
      type: 'buy',
      quantity: 10,
      price: 100,
      tradeDate: dMonth2,
    });

    // Create SIP
    const sip = await createSip(api, {
      brokerAccountId: broker.id,
      instrumentId: inst.id,
      amount: 1000,
      frequency: 'monthly',
      dayOfMonth: 5,
      startDate,
      active: true,
      notes: 'Initial SIP Note',
    });

    expect(sip.id).toBeDefined();
    expect(sip.progress).toBeDefined();
    expect(sip.progress?.executedInstallments).toBe(2);
    expect(sip.progress?.expectedInstallments).toBeGreaterThanOrEqual(3);
    expect(sip.progress?.unitsAccumulated).toBe(20);

    // GET /investments/sips/{id}
    const getRes = await api.GET('/api/v1/investments/sips/{id}', {
      params: { path: { id: sip.id } },
    });
    expectStatus(getRes, 200);
    expect(getRes.data?.progress?.executedInstallments).toBe(2);

    // PUT /investments/sips/{id} -> toggle active to false and update notes
    const updateRes = await api.PUT('/api/v1/investments/sips/{id}', {
      params: { path: { id: sip.id } },
      body: {
        amount: 1500,
        frequency: 'monthly',
        dayOfMonth: 5,
        startDate,
        active: false,
        notes: 'Paused SIP',
      },
    });
    expectStatus(updateRes, 200);
    expect(updateRes.data?.active).toBe(false);
    expect(updateRes.data?.notes).toBe('Paused SIP');
    expect(updateRes.data?.amount).toBe(1500);

    // Filter by active=true vs active=false
    const activeList = await api.GET('/api/v1/investments/sips', {
      params: {
        query: {
          brokerAccountId: broker.id,
          active: true,
        },
      },
    });
    expectStatus(activeList, 200);
    expect(activeList.data?.some((s) => s.id === sip.id)).toBe(false);

    const inactiveList = await api.GET('/api/v1/investments/sips', {
      params: {
        query: {
          brokerAccountId: broker.id,
          active: false,
        },
      },
    });
    expectStatus(inactiveList, 200);
    expect(inactiveList.data?.some((s) => s.id === sip.id)).toBe(true);

    // DELETE /investments/sips/{id}
    const delRes = await api.DELETE('/api/v1/investments/sips/{id}', {
      params: { path: { id: sip.id } },
    });
    expectStatus(delRes, 204);

    const getAfterDel = await api.GET('/api/v1/investments/sips/{id}', {
      params: { path: { id: sip.id } },
    });
    expectStatus(getAfterDel, 404);
  });

  test('Tenancy isolation and unauthenticated 401 checks for SIP endpoints', async ({
    api,
    request,
  }) => {
    const { api: apiB } = await secondUser(request, 'sip-user-b');
    const brokerA = await createBroker(api);
    const symbol = generateYahooSymbol('SIPTNCY');
    const inst = await resolveInstrument(api, {
      type: 'stock',
      name: `SIP Tenancy Inst ${uniqueSeedSuffix()}`,
      isin: generateIsin(),
      symbol,
      exchange: 'NSE',
      yahooSymbol: symbol,
    });

    const sipA = await createSip(api, {
      brokerAccountId: brokerA.id,
      instrumentId: inst.id,
      amount: 1000,
      frequency: 'monthly',
      dayOfMonth: 1,
      startDate: '2026-01-01',
    });

    // Cross-tenant update and delete are rejected with 404
    await expectForeign(apiB, 'PUT', `/api/v1/investments/sips/${sipA.id}`, {
      amount: 10000,
      frequency: 'monthly',
      dayOfMonth: 5,
      startDate: '2026-01-01',
      active: true,
    });

    await expectForeign(apiB, 'DELETE', `/api/v1/investments/sips/${sipA.id}`);

    // Unauthenticated 401 checks
    await expectUnauthenticated('GET', '/api/v1/investments/sips');
    await expectUnauthenticated('POST', '/api/v1/investments/sips', { amount: 1000 });
    await expectUnauthenticated('GET', `/api/v1/investments/sips/${sipA.id}`);
    await expectUnauthenticated('PUT', `/api/v1/investments/sips/${sipA.id}`, { amount: 1000 });
    await expectUnauthenticated('DELETE', `/api/v1/investments/sips/${sipA.id}`);
  });
});

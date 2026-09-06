import { expectStatus } from '../fixtures/api';
import { createBankAccount } from '../fixtures/seed/accounts';
import {
  createBroker,
  createFnoTrade,
  deleteFnoTrade,
  listFnoTrades,
  updateFnoTrade,
} from '../fixtures/seed/investments';
import { secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('F&O Trades API (@api)', () => {
  test('Full fields vs tradingSymbol-only parsing (FUT and OPT CE/PE), P&L calculation', async ({
    api,
  }) => {
    const broker = await createBroker(api);

    // 1. Full fields create
    const fullTrade = await createFnoTrade(api, {
      brokerAccountId: broker.id,
      tradingSymbol: 'BANKNIFTY24AUG48000PE',
      underlyingSymbol: 'BANKNIFTY',
      contractType: 'option',
      optionType: 'PE',
      strikePrice: 48000,
      expiryDate: '2026-08-27',
      quantity: 15,
      buyValue: 3000,
      sellValue: 4500,
      totalCharges: 50,
      notes: 'Hedge position',
    });

    expect(fullTrade.id).toBeDefined();
    expect(fullTrade.tradingSymbol).toBe('BANKNIFTY24AUG48000PE');
    expect(fullTrade.contractType).toBe('option');
    expect(fullTrade.optionType).toBe('PE');
    expect(fullTrade.strikePrice).toBe(48000);
    // realizedPnl = sellValue (4500) - buyValue (3000) - totalCharges (50) = 1450
    expect(fullTrade.realizedPnl).toBe(1450);

    // 2. Symbol-only parsing: Future (NIFTY24AUGFUT)
    const futTrade = await createFnoTrade(api, {
      brokerAccountId: broker.id,
      tradingSymbol: 'NIFTY24AUGFUT',
      quantity: 50,
      buyValue: 1200000,
      sellValue: 1215000,
      totalCharges: 200,
    });

    expect(futTrade.contractType).toBe('future');
    expect(futTrade.underlyingSymbol).toBe('NIFTY');
    expect(futTrade.realizedPnl).toBe(1215000 - 1200000 - 200); // 14800

    // 3. Symbol-only parsing: Option CE (NIFTY24AUG24250CE)
    const optTrade = await createFnoTrade(api, {
      brokerAccountId: broker.id,
      tradingSymbol: 'NIFTY24AUG24250CE',
      quantity: 50,
      buyValue: 10000,
      sellValue: 8000,
      totalCharges: 40,
    });

    expect(optTrade.contractType).toBe('option');
    expect(optTrade.optionType).toBe('CE');
    expect(optTrade.strikePrice).toBe(24250);
    expect(optTrade.underlyingSymbol).toBe('NIFTY');
    expect(optTrade.realizedPnl).toBe(8000 - 10000 - 40); // -2040

    // 4. PUT update: modify values and check realizedPnl recomputed
    const updated = await updateFnoTrade(api, optTrade.id, {
      brokerAccountId: broker.id,
      tradingSymbol: 'NIFTY24AUG24250CE',
      quantity: 50,
      buyValue: 10000,
      sellValue: 12000,
      totalCharges: 50,
      notes: 'Exited in profit after all',
    });

    expect(updated.sellValue).toBe(12000);
    expect(updated.totalCharges).toBe(50);
    expect(updated.realizedPnl).toBe(12000 - 10000 - 50); // 1950
    expect(updated.notes).toBe('Exited in profit after all');
  });

  test('Validations: non-broker account 400, list returns all trades (unpaginated), tenancy isolation', async ({
    api,
    request,
  }) => {
    const brokerA = await createBroker(api);
    const bankAccount = await createBankAccount(api);

    // 1. Non-broker account -> 400
    const nonBrokerRes = await api.POST('/api/v1/investments/fno', {
      body: {
        brokerAccountId: bankAccount.id,
        tradingSymbol: 'NIFTY24AUGFUT',
        quantity: 50,
        buyValue: 100000,
        sellValue: 105000,
      },
    });
    expectStatus(nonBrokerRes, 400);

    // Create 3 trades for user A
    const t1 = await createFnoTrade(api, {
      brokerAccountId: brokerA.id,
      tradingSymbol: 'NIFTY24AUGFUT',
      quantity: 50,
      buyValue: 100000,
      sellValue: 105000,
    });

    const t2 = await createFnoTrade(api, {
      brokerAccountId: brokerA.id,
      tradingSymbol: 'NIFTY24AUG24000CE',
      quantity: 50,
      buyValue: 5000,
      sellValue: 7000,
    });

    const t3 = await createFnoTrade(api, {
      brokerAccountId: brokerA.id,
      tradingSymbol: 'NIFTY24AUG23500PE',
      quantity: 50,
      buyValue: 4000,
      sellValue: 2000,
    });

    // 2. List returns all trades; sending paging params (e.g. page=0&size=1) still returns all rows (unpaginated server-side)
    const listRes = await api.GET('/api/v1/investments/fno', {
      params: {
        query: { page: 0, size: 1 } as any,
      },
    });
    expectStatus(listRes, 200);
    const trades = listRes.data?.trades || [];
    expect(trades.length).toBeGreaterThanOrEqual(3);
    const tradeIds = trades.map((t) => t.id);
    expect(tradeIds).toContain(t1.id);
    expect(tradeIds).toContain(t2.id);
    expect(tradeIds).toContain(t3.id);

    // 3. Second user (User B) tenancy isolation
    const { api: apiB } = await secondUser(request);

    // User B's list should not include User A's trades (scoped by userId on GET)
    const listB = await listFnoTrades(apiB);
    const listBIds = (listB as any).trades ? (listB as any).trades.map((t: any) => t.id) : [];
    expect(listBIds).not.toContain(t1.id);
    expect(listBIds).not.toContain(t2.id);

    // 4. Delete trade
    await deleteFnoTrade(api, t1.id);
    const remaining = await listFnoTrades(api);
    const remainingIds = (remaining as any).trades?.map((t: any) => t.id) || [];
    expect(remainingIds).not.toContain(t1.id);
  });

});

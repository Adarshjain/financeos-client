import type { components } from '../../src/lib/api/schema.d.ts';
import { type ApiClient, expectStatus, waitForJob } from '../fixtures/api';
import {
  genGrowwCapitalGainsXlsx,
  genGrowwOrderHistoryXlsx,
  type GrowwCapitalGainsSpec,
  type GrowwOrderHistoryRow,
} from '../fixtures/gen/broker-files';
import { createBankAccount } from '../fixtures/seed/accounts';
import {
  createBroker,
  generateIsin,
  generateYahooSymbol,
  type ImportCommitResponse,
  positions,
  resolveInstrument,
  uniqueSeedSuffix,
} from '../fixtures/seed/investments';
import { expectUnauthenticated } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

type ReconcilePreviewResponse = components['schemas']['ReconcilePreviewResponse'];
type ReconcileCommitRequest = components['schemas']['ReconcileCommitRequest'];

export async function previewGroww(
  api: ApiClient,
  brokerAccountId: string,
  opts: {
    tradebookFiles?: Buffer[];
    taxpnlFiles: Buffer[];
    assetScope?: 'all' | 'equity' | 'fno';
  }
): Promise<{ status: number; data?: ReconcilePreviewResponse; error?: unknown }> {
  const formData = new FormData();
  if (opts.tradebookFiles) {
    opts.tradebookFiles.forEach((buf, idx) => {
      formData.append(
        'tradebookFiles',
        new Blob([new Uint8Array(buf)], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `groww-orders-${idx}.xlsx`
      );
    });
  }
  opts.taxpnlFiles.forEach((buf, idx) => {
    formData.append(
      'taxpnlFiles',
      new Blob([new Uint8Array(buf)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      `groww-cg-${idx}.xlsx`
    );
  });

  const query: Record<string, string> = {
    broker: 'groww',
    brokerAccountId,
  };
  if (opts.assetScope) {
    query.assetScope = opts.assetScope;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (api as any).POST('/api/v1/investments/imports/reconcile/preview', {
    params: { query },
    body: formData,
    bodySerializer: (b: unknown) => b,
  });
  return { status: res.response.status, data: res.data, error: res.error };
}

export async function commitReconcile(
  api: ApiClient,
  body: ReconcileCommitRequest
): Promise<{ status: number; result?: ImportCommitResponse; jobId?: string; error?: unknown }> {
  const res = await api.POST('/api/v1/investments/imports/reconcile/commit', {
    body,
  });
  if (res.response.status !== 202 && res.response.status !== 200) {
    return { status: res.response.status, error: res.error };
  }
  const jobId = (res.data as { jobId: string }).jobId;
  const job = await waitForJob(api, jobId);
  expect(job.status).toBe('SUCCEEDED');
  return {
    status: res.response.status,
    jobId,
    result: job.result as unknown as ImportCommitResponse,
  };
}

test.describe('Groww Reconciliation API (@api)', () => {
  test('1. Groww order history + capital gains: intraday split, Groww rate card charges, FIFO derived holdings, commit', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const symA = generateYahooSymbol('GROWWA');
    const isinA = generateIsin();
    const symB = generateYahooSymbol('GROWWB');
    const isinB = generateIsin();

    const instA = await resolveInstrument(api, {
      type: 'stock',
      name: `Groww Stock A ${uniqueSeedSuffix()}`,
      isin: isinA,
      symbol: symA,
      exchange: 'NSE',
      yahooSymbol: symA,
    });
    const instB = await resolveInstrument(api, {
      type: 'stock',
      name: `Groww Stock B ${uniqueSeedSuffix()}`,
      isin: isinB,
      symbol: symB,
      exchange: 'NSE',
      yahooSymbol: symB,
    });

    // Scrip A: Buy 100 @ 200 on 2026-08-01, Sell 100 @ 210 on 2026-08-01 (Intraday 50, Delivery 50)
    // Scrip B: Buy 50 @ 100 on 2026-08-01 (Delivery 50)
    const orderRows: GrowwOrderHistoryRow[] = [
      {
        stockName: `Groww Stock A`,
        symbol: symA,
        isin: isinA,
        type: 'buy',
        quantity: 100,
        price: 200.0,
        executionDate: '01-08-2026 10:00 AM',
        orderStatus: 'Executed',
        orderId: 'gw-ord-1',
      },
      {
        stockName: `Groww Stock A`,
        symbol: symA,
        isin: isinA,
        type: 'sell',
        quantity: 100,
        price: 210.0,
        executionDate: '01-08-2026 02:30 PM',
        orderStatus: 'Executed',
        orderId: 'gw-ord-2',
      },
      {
        stockName: `Groww Stock B`,
        symbol: symB,
        isin: isinB,
        type: 'buy',
        quantity: 50,
        price: 100.0,
        executionDate: '01-08-2026 11:15 AM',
        orderStatus: 'Executed',
        orderId: 'gw-ord-3',
      },
    ];
    const orderXlsx = await genGrowwOrderHistoryXlsx(orderRows);

    const cgSpec: GrowwCapitalGainsSpec = {
      intraday: [
        {
          stockName: 'Groww Stock A',
          isin: isinA,
          quantity: 50,
          buyDate: '2026-08-01',
          buyPrice: 200.0,
          buyValue: 10000.0,
          sellDate: '2026-08-01',
          sellPrice: 210.0,
          sellValue: 10500.0,
          realisedPnl: 500.0,
        },
      ],
      shortTerm: [
        {
          stockName: 'Groww Stock A',
          isin: isinA,
          quantity: 50,
          buyDate: '2026-08-01',
          buyPrice: 200.0,
          buyValue: 10000.0,
          sellDate: '2026-08-01',
          sellPrice: 210.0,
          sellValue: 10500.0,
          realisedPnl: 500.0,
        },
      ],
    };
    const cgXlsx = await genGrowwCapitalGainsXlsx(cgSpec);

    const { status, data: preview } = await previewGroww(api, broker.id, {
      tradebookFiles: [orderXlsx],
      taxpnlFiles: [cgXlsx],
    });

    expect(status).toBe(200);
    expect(preview).toBeDefined();
    expect(preview!.summaryStats.totalExecutions).toBe(5); // 2 intra (buy+sell) + 2 deliv (buy+sell) for A + 1 deliv buy for B
    expect(preview!.summaryStats.intradayExecutions).toBe(2);
    expect(preview!.summaryStats.deliveryExecutions).toBe(3);

    // Groww rate card calculated charges: verify charges are non-empty for Groww rows
    const buyDelivA = preview!.executions.find(
      (e) => e.symbol === symA && e.type === 'buy' && e.settlementType === 'delivery'
    );
    expect(buyDelivA).toBeDefined();
    expect(buyDelivA!.charges).toBeDefined();
    // Groww charges include brokerage, stampDuty, gst, etc.
    expect(Number(buyDelivA!.charges.brokerage) || Number(buyDelivA!.charges.stampDuty)).toBeGreaterThan(0);

    // Derived holdings: Scrip B has 50 open @ 100; Scrip A delivery buy was 50 and sell was 50 -> 0 open for A
    expect(preview!.derivedHoldings).toHaveLength(1);
    expect(preview!.derivedHoldings[0].symbol).toBe(symB);
    expect(preview!.derivedHoldings[0].quantity).toBe(50);

    // Commit all
    const commitPayload: ReconcileCommitRequest = {
      broker: 'groww',
      brokerAccountId: broker.id,
      executions: preview!.executions.map((e) => ({
        rowIndex: e.rowIndex,
        symbol: e.symbol,
        isin: e.isin,
        tradeDate: e.tradeDate,
        type: e.type,
        settlementType: e.settlementType,
        quantity: e.quantity,
        price: e.price,
        charges: e.charges,
        instrumentId: e.symbol === symA ? instA.id : instB.id,
        externalRef: e.externalRef,
      })),
      classifications: preview!.classifications.map((c) => ({
        isin: c.isin,
        symbol: c.symbol,
        tradeDate: c.tradeDate,
        intradayQty: c.intradayQty,
        intradayBuyValue: c.intradayBuyValue,
        intradaySellValue: c.intradaySellValue,
      })),
    };

    const commitRes = await commitReconcile(api, commitPayload);
    expect(commitRes.status).toBe(202);
    expect(commitRes.result!.committed).toBe(5);

    // Positions verify: Scrip B holding = 50
    const posRes = await positions(api);
    const posB = posRes.positions.find((p) => p.instrument.id === instB.id);
    expect(posB).toBeDefined();
    expect(posB!.quantity).toBe(50);
  });

  test('2. Order status filtering: non-Executed orders (Cancelled/Rejected) are excluded', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const sym = generateYahooSymbol('STATUS');
    const isin = generateIsin();

    await resolveInstrument(api, {
      type: 'stock',
      name: `Status Test Corp ${uniqueSeedSuffix()}`,
      isin,
      symbol: sym,
      exchange: 'NSE',
      yahooSymbol: sym,
    });

    const orderRows: GrowwOrderHistoryRow[] = [
      {
        stockName: 'Status Corp',
        symbol: sym,
        isin,
        type: 'buy',
        quantity: 25,
        price: 100.0,
        executionDate: '2026-08-01',
        orderStatus: 'Executed',
        orderId: 'exec-1',
      },
      {
        stockName: 'Status Corp',
        symbol: sym,
        isin,
        type: 'buy',
        quantity: 50,
        price: 90.0,
        executionDate: '2026-08-01',
        orderStatus: 'Cancelled',
        orderId: 'canc-1',
      },
      {
        stockName: 'Status Corp',
        symbol: sym,
        isin,
        type: 'sell',
        quantity: 10,
        price: 110.0,
        executionDate: '2026-08-01',
        orderStatus: 'Rejected',
        orderId: 'rej-1',
      },
    ];
    const orderXlsx = await genGrowwOrderHistoryXlsx(orderRows);
    const cgXlsx = await genGrowwCapitalGainsXlsx({ shortTerm: [] });

    const { status, data: preview } = await previewGroww(api, broker.id, {
      tradebookFiles: [orderXlsx],
      taxpnlFiles: [cgXlsx],
    });

    expect(status).toBe(200);
    // Only the 'Executed' row is parsed
    expect(preview!.executions).toHaveLength(1);
    expect(preview!.executions[0].quantity).toBe(25);
    expect(preview!.executions[0].externalRef).toBe('exec-1');
  });

  test('3. Groww + assetScope=fno returns 200 with empty fnoTrades (Groww is equity-only)', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const sym = generateYahooSymbol('FNOIGN');
    const isin = generateIsin();

    await resolveInstrument(api, {
      type: 'stock',
      name: `Fno Ignored Corp ${uniqueSeedSuffix()}`,
      isin,
      symbol: sym,
      exchange: 'NSE',
      yahooSymbol: sym,
    });

    const orderRows: GrowwOrderHistoryRow[] = [
      {
        stockName: 'Fno Ignored Corp',
        symbol: sym,
        isin,
        type: 'buy',
        quantity: 10,
        price: 100.0,
        executionDate: '2026-08-01',
        orderStatus: 'Executed',
        orderId: 'fno-ign-1',
      },
    ];
    const orderXlsx = await genGrowwOrderHistoryXlsx(orderRows);
    const cgXlsx = await genGrowwCapitalGainsXlsx({ shortTerm: [] });

    const { status, data: preview } = await previewGroww(api, broker.id, {
      tradebookFiles: [orderXlsx],
      taxpnlFiles: [cgXlsx],
      assetScope: 'fno',
    });

    expect(status).toBe(200);
    expect(preview!.executions).toHaveLength(0);
    expect(preview!.fnoTrades).toHaveLength(0);
    expect(preview!.derivedHoldings).toHaveLength(0);
  });

  test('4. Validation: non-broker 400, missing taxpnl 400, non-existent account 404, 401 unauthenticated', async ({
    api,
  }) => {
    const bankAccount = await createBankAccount(api, { name: 'Groww Bank Account' });
    const orderXlsx = await genGrowwOrderHistoryXlsx([
      { symbol: 'ABC', isin: 'INE123', type: 'buy', quantity: 10, price: 100, executionDate: '2026-08-01' },
    ]);
    const cgXlsx = await genGrowwCapitalGainsXlsx({ shortTerm: [] });

    // Non-broker -> 400
    const nonBrokerRes = await previewGroww(api, bankAccount.id, {
      tradebookFiles: [orderXlsx],
      taxpnlFiles: [cgXlsx],
    });
    expect(nonBrokerRes.status).toBe(400);

    // Missing taxpnl -> 400
    const broker = await createBroker(api);
    const formData = new FormData();
    formData.append(
      'tradebookFiles',
      new Blob([new Uint8Array(orderXlsx)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      'orders.xlsx'
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const missingTaxpnlRes = await (api as any).POST('/api/v1/investments/imports/reconcile/preview', {
      params: { query: { broker: 'groww', brokerAccountId: broker.id } },
      body: formData,
      bodySerializer: (b: unknown) => b,
    });
    expectStatus(missingTaxpnlRes, 400);

    // Non-existent account -> 404
    const nonExistentAccountId = '00000000-0000-0000-0000-000000000000';
    const foreignPreview = await previewGroww(api, nonExistentAccountId, {
      tradebookFiles: [orderXlsx],
      taxpnlFiles: [cgXlsx],
    });
    expect(foreignPreview.status).toBe(404);

    // 401 unauthenticated
    await expectUnauthenticated('POST', '/api/v1/investments/imports/reconcile/preview');
  });
});

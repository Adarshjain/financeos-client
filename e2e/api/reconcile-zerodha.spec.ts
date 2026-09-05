import type { components } from '../../src/lib/api/schema.d.ts';
import { type ApiClient, expectStatus, waitForJob } from '../fixtures/api';
import {
  genHoldingsSnapshotCsv,
  genZerodhaTaxPnlXlsx,
  genZerodhaTradebookCsv,
  type ZerodhaRow,
  type ZerodhaTaxPnlSpec,
} from '../fixtures/gen/broker-files';
import { createBankAccount } from '../fixtures/seed/accounts';
import {
  createBroker,
  createInstrument,
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

export async function previewZerodha(
  api: ApiClient,
  brokerAccountId: string,
  opts: {
    tradebookFiles?: Buffer[];
    taxpnlFiles: Buffer[];
    holdingsFile?: { buffer: Buffer; filename: string };
    assetScope?: 'all' | 'equity' | 'fno';
  }
): Promise<{ status: number; data?: ReconcilePreviewResponse; error?: unknown }> {
  const formData = new FormData();
  if (opts.tradebookFiles) {
    opts.tradebookFiles.forEach((buf, idx) => {
      formData.append(
        'tradebookFiles',
        new Blob([new Uint8Array(buf)], { type: 'text/csv' }),
        `tradebook-${idx}.csv`
      );
    });
  }
  opts.taxpnlFiles.forEach((buf, idx) => {
    formData.append(
      'taxpnlFiles',
      new Blob([new Uint8Array(buf)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      `taxpnl-${idx}.xlsx`
    );
  });
  if (opts.holdingsFile) {
    formData.append(
      'holdingsFile',
      new Blob([new Uint8Array(opts.holdingsFile.buffer)], { type: 'text/csv' }),
      opts.holdingsFile.filename
    );
  }

  const query: Record<string, string> = {
    broker: 'zerodha',
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

test.describe('Zerodha Reconciliation API (@api)', () => {
  test('1. Clean delivery only: FIFO remainder, clean cost basis, realizedSummary exact, no warnings', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const symA = generateYahooSymbol('DELIVA');
    const isinA = generateIsin();
    const symB = generateYahooSymbol('DELIVB');
    const isinB = generateIsin();

    // Pre-resolve instruments
    await resolveInstrument(api, {
      type: 'stock',
      name: `Delivery Corp A ${uniqueSeedSuffix()}`,
      isin: isinA,
      symbol: symA,
      exchange: 'NSE',
      yahooSymbol: symA,
    });
    await resolveInstrument(api, {
      type: 'stock',
      name: `Delivery Corp B ${uniqueSeedSuffix()}`,
      isin: isinB,
      symbol: symB,
      exchange: 'NSE',
      yahooSymbol: symB,
    });

    // Scrip A: Buy 100 @ 100 (day 1), Buy 50 @ 110 (day 2), Sell 30 @ 120 (day 3) -> 120 open
    // Scrip B: Buy 200 @ 50 (day 1) -> 200 open
    const tbRows: ZerodhaRow[] = [
      { symbol: symA, isin: isinA, tradeDate: '2026-08-01', tradeType: 'buy', quantity: 100, price: 100.0, tradeId: 't1' },
      { symbol: symA, isin: isinA, tradeDate: '2026-08-02', tradeType: 'buy', quantity: 50, price: 110.0, tradeId: 't2' },
      { symbol: symA, isin: isinA, tradeDate: '2026-08-03', tradeType: 'sell', quantity: 30, price: 120.0, tradeId: 't3' },
      { symbol: symB, isin: isinB, tradeDate: '2026-08-01', tradeType: 'buy', quantity: 200, price: 50.0, tradeId: 't4' },
    ];
    const tbCsv = genZerodhaTradebookCsv(tbRows);

    // Tax P&L: Scrip A Sell 30 is Short Term exit (profit: 30 * (120 - 100) = 600)
    const taxPnlSpec: ZerodhaTaxPnlSpec = {
      shortTerm: [
        {
          symbol: symA,
          isin: isinA,
          entryDate: '2026-08-01',
          exitDate: '2026-08-03',
          quantity: 30,
          buyValue: 3000.0,
          sellValue: 3600.0,
          profit: 600.0,
          brokerage: 20.0,
          stt: 3.6,
        },
      ],
    };
    const taxPnlXlsx = await genZerodhaTaxPnlXlsx(taxPnlSpec);

    const { status, data: preview } = await previewZerodha(api, broker.id, {
      tradebookFiles: [tbCsv],
      taxpnlFiles: [taxPnlXlsx],
    });

    expect(status).toBe(200);
    expect(preview).toBeDefined();
    expect(preview!.summaryStats.totalExecutions).toBe(4);
    expect(preview!.summaryStats.deliveryExecutions).toBe(4);
    expect(preview!.summaryStats.intradayExecutions).toBe(0);
    expect(preview!.summaryStats.duplicates).toBe(0);
    expect(preview!.summaryStats.warningsCount).toBe(0);
    expect(preview!.warnings).toHaveLength(0);

    // Every execution has settlementType = delivery
    for (const exec of preview!.executions) {
      expect(exec.settlementType).toBe('delivery');
      expect(exec.matchedInstrument).toBeDefined();
    }

    // Check derived holdings:
    // Scrip A: (70*100 + 50*110) / 120 = 12500 / 120 = 104.1667 avg cost
    const holdingA = preview!.derivedHoldings.find((h) => h.symbol === symA);
    expect(holdingA).toBeDefined();
    expect(holdingA!.quantity).toBe(120);
    expect(holdingA!.avgCost).toBeCloseTo(104.1667, 3);
    expect(holdingA!.costValue).toBe(12500.0);

    // Scrip B: 200 @ 50 = 10000
    const holdingB = preview!.derivedHoldings.find((h) => h.symbol === symB);
    expect(holdingB).toBeDefined();
    expect(holdingB!.quantity).toBe(200);
    expect(holdingB!.avgCost).toBe(50);
    expect(holdingB!.costValue).toBe(10000.0);

    // Realized summary: computed = classifier (diff 0)
    expect(preview!.realizedSummary).toBeDefined();
    expect(preview!.realizedSummary!.deliveryRealized).toBe(600);
    expect(preview!.realizedSummary!.classifierDeliveryRealized).toBe(600);
    expect(preview!.realizedSummary!.deliveryDiff).toBe(0);
  });

  test('2. Intraday split: greedy allocation produces intraday + delivery portions', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const sym = generateYahooSymbol('INTRA');
    const isin = generateIsin();

    await resolveInstrument(api, {
      type: 'stock',
      name: `Intraday Corp ${uniqueSeedSuffix()}`,
      isin,
      symbol: sym,
      exchange: 'NSE',
      yahooSymbol: sym,
    });

    // Day 1: Buy 100 @ 200, Sell 100 @ 210
    // Classifier intraday = 60
    // Expected: 60 intraday buy + 60 intraday sell; 40 delivery buy + 40 delivery sell
    const tbRows: ZerodhaRow[] = [
      { symbol: sym, isin, tradeDate: '2026-08-05', tradeType: 'buy', quantity: 100, price: 200.0, tradeId: 'tb-b1' },
      { symbol: sym, isin, tradeDate: '2026-08-05', tradeType: 'sell', quantity: 100, price: 210.0, tradeId: 'tb-s1' },
    ];
    const tbCsv = genZerodhaTradebookCsv(tbRows);

    const taxPnlSpec: ZerodhaTaxPnlSpec = {
      intraday: [
        {
          symbol: sym,
          isin,
          date: '2026-08-05',
          quantity: 60,
          buyValue: 12000.0,
          sellValue: 12600.0,
          profit: 600.0,
        },
      ],
      shortTerm: [
        {
          symbol: sym,
          isin,
          entryDate: '2026-08-05',
          exitDate: '2026-08-05',
          quantity: 40,
          buyValue: 8000.0,
          sellValue: 8400.0,
          profit: 400.0,
        },
      ],
    };
    const taxPnlXlsx = await genZerodhaTaxPnlXlsx(taxPnlSpec);

    const { status, data: preview } = await previewZerodha(api, broker.id, {
      tradebookFiles: [tbCsv],
      taxpnlFiles: [taxPnlXlsx],
    });

    expect(status).toBe(200);
    expect(preview!.summaryStats.intradayExecutions).toBe(2);
    expect(preview!.summaryStats.deliveryExecutions).toBe(2);
    expect(preview!.summaryStats.totalExecutions).toBe(4);

    const intraBuys = preview!.executions.filter((e) => e.type === 'buy' && e.settlementType === 'intraday');
    const intraSells = preview!.executions.filter((e) => e.type === 'sell' && e.settlementType === 'intraday');
    const delivBuys = preview!.executions.filter((e) => e.type === 'buy' && e.settlementType === 'delivery');
    const delivSells = preview!.executions.filter((e) => e.type === 'sell' && e.settlementType === 'delivery');

    expect(intraBuys.reduce((sum, e) => sum + e.quantity, 0)).toBe(60);
    expect(intraSells.reduce((sum, e) => sum + e.quantity, 0)).toBe(60);
    expect(delivBuys.reduce((sum, e) => sum + e.quantity, 0)).toBe(40);
    expect(delivSells.reduce((sum, e) => sum + e.quantity, 0)).toBe(40);

    // Classifications carries day aggregate
    expect(preview!.classifications).toHaveLength(1);
    expect(preview!.classifications[0].intradayQty).toBe(60);
    expect(preview!.classifications[0].tradeDate).toBe('2026-08-05');
  });

  test('3. Straddle boundary execution split: unique externalRefs with -I and -D', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const sym = generateYahooSymbol('STRAD');
    const isin = generateIsin();

    await resolveInstrument(api, {
      type: 'stock',
      name: `Straddle Corp ${uniqueSeedSuffix()}`,
      isin,
      symbol: sym,
      exchange: 'NSE',
      yahooSymbol: sym,
    });

    // Single buy of 150, sell of 100. Intraday classifier shows 100.
    // The buy of 150 straddles: 100 intraday + 50 delivery.
    const tbRows: ZerodhaRow[] = [
      { symbol: sym, isin, tradeDate: '2026-08-06', tradeType: 'buy', quantity: 150, price: 100.0, tradeId: 'tr-strad-buy' },
      { symbol: sym, isin, tradeDate: '2026-08-06', tradeType: 'sell', quantity: 100, price: 110.0, tradeId: 'tr-strad-sell' },
    ];
    const tbCsv = genZerodhaTradebookCsv(tbRows);

    const taxPnlSpec: ZerodhaTaxPnlSpec = {
      intraday: [
        {
          symbol: sym,
          isin,
          date: '2026-08-06',
          quantity: 100,
          buyValue: 10000.0,
          sellValue: 11000.0,
          profit: 1000.0,
        },
      ],
    };
    const taxPnlXlsx = await genZerodhaTaxPnlXlsx(taxPnlSpec);

    const { status, data: preview } = await previewZerodha(api, broker.id, {
      tradebookFiles: [tbCsv],
      taxpnlFiles: [taxPnlXlsx],
    });

    expect(status).toBe(200);
    expect(preview!.executions).toHaveLength(3);

    const splitIntra = preview!.executions.find((e) => e.type === 'buy' && e.settlementType === 'intraday');
    const splitDeliv = preview!.executions.find((e) => e.type === 'buy' && e.settlementType === 'delivery');
    expect(splitIntra).toBeDefined();
    expect(splitDeliv).toBeDefined();
    expect(splitIntra!.quantity).toBe(100);
    expect(splitDeliv!.quantity).toBe(50);
    expect(splitIntra!.externalRef).toBe('tr-strad-buy-I');
    expect(splitDeliv!.externalRef).toBe('tr-strad-buy-D');

    // Remaining open delivery holding is 50
    expect(preview!.derivedHoldings).toHaveLength(1);
    expect(preview!.derivedHoldings[0].quantity).toBe(50);
  });

  test('4. CLASSIFIER_MISMATCH: warning present when classifier intraday exceeds tradebook volume', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const sym = generateYahooSymbol('MISMATCH');
    const isin = generateIsin();

    await resolveInstrument(api, {
      type: 'stock',
      name: `Mismatch Corp ${uniqueSeedSuffix()}`,
      isin,
      symbol: sym,
      exchange: 'NSE',
      yahooSymbol: sym,
    });

    // Tradebook has buy 100, sell 100
    const tbRows: ZerodhaRow[] = [
      { symbol: sym, isin, tradeDate: '2026-08-07', tradeType: 'buy', quantity: 100, price: 100.0, tradeId: 'mm-b1' },
      { symbol: sym, isin, tradeDate: '2026-08-07', tradeType: 'sell', quantity: 100, price: 110.0, tradeId: 'mm-s1' },
    ];
    const tbCsv = genZerodhaTradebookCsv(tbRows);

    // Classifier says intraday was 150
    const taxPnlSpec: ZerodhaTaxPnlSpec = {
      intraday: [
        {
          symbol: sym,
          isin,
          date: '2026-08-07',
          quantity: 150,
          buyValue: 15000.0,
          sellValue: 16500.0,
          profit: 1500.0,
        },
      ],
    };
    const taxPnlXlsx = await genZerodhaTaxPnlXlsx(taxPnlSpec);

    const { status, data: preview } = await previewZerodha(api, broker.id, {
      tradebookFiles: [tbCsv],
      taxpnlFiles: [taxPnlXlsx],
    });

    expect(status).toBe(200);
    const mismatchWarning = preview!.warnings.find((w) => w.type === 'CLASSIFIER_MISMATCH');
    expect(mismatchWarning).toBeDefined();
    expect(mismatchWarning!.message).toContain('exceeds tradebook buys');
  });

  test('5. OFF_MARKET_EXIT: synthetic CA_EXIT_ sell row generated for buyback / corporate exits', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const sym = generateYahooSymbol('BUYBACK');
    const isin = generateIsin();

    await resolveInstrument(api, {
      type: 'stock',
      name: `Buyback Corp ${uniqueSeedSuffix()}`,
      isin,
      symbol: sym,
      exchange: 'NSE',
      yahooSymbol: sym,
    });

    // Tradebook only has the buy of 100 shares; tender/buyback exit was off-market
    const tbRows: ZerodhaRow[] = [
      { symbol: sym, isin, tradeDate: '2026-08-01', tradeType: 'buy', quantity: 100, price: 100.0, tradeId: 'bb-b1' },
    ];
    const tbCsv = genZerodhaTradebookCsv(tbRows);

    // Tax P&L classifier lists Buyback of 40 shares @ 150
    const taxPnlSpec: ZerodhaTaxPnlSpec = {
      buyback: [
        {
          symbol: sym,
          isin,
          entryDate: '2026-08-01',
          exitDate: '2026-08-20',
          quantity: 40,
          buyValue: 4000.0,
          sellValue: 6000.0,
          profit: 2000.0,
        },
      ],
    };
    const taxPnlXlsx = await genZerodhaTaxPnlXlsx(taxPnlSpec);

    const { status, data: preview } = await previewZerodha(api, broker.id, {
      tradebookFiles: [tbCsv],
      taxpnlFiles: [taxPnlXlsx],
    });

    expect(status).toBe(200);
    const offMarketExec = preview!.executions.find((e) => e.externalRef?.startsWith('CA_EXIT_'));
    expect(offMarketExec).toBeDefined();
    expect(offMarketExec!.quantity).toBe(40);
    expect(offMarketExec!.type).toBe('sell');
    expect(offMarketExec!.settlementType).toBe('delivery');

    const offMarketWarning = preview!.warnings.find((w) => w.type === 'OFF_MARKET_EXIT');
    expect(offMarketWarning).toBeDefined();

    // Derived holding reduced from 100 to 60
    const holding = preview!.derivedHoldings.find((h) => h.symbol === sym);
    expect(holding).toBeDefined();
    expect(holding!.quantity).toBe(60);
  });

  test('6. DATA_GAP: sell without enough prior buy history emits warning', async ({ api }) => {
    const broker = await createBroker(api);
    const sym = generateYahooSymbol('GAP');
    const isin = generateIsin();

    await resolveInstrument(api, {
      type: 'stock',
      name: `Gap Corp ${uniqueSeedSuffix()}`,
      isin,
      symbol: sym,
      exchange: 'NSE',
      yahooSymbol: sym,
    });

    // Tradebook only has a sell of 50 shares, no earlier buys
    const tbRows: ZerodhaRow[] = [
      { symbol: sym, isin, tradeDate: '2026-08-10', tradeType: 'sell', quantity: 50, price: 150.0, tradeId: 'gap-s1' },
    ];
    const tbCsv = genZerodhaTradebookCsv(tbRows);

    const taxPnlSpec: ZerodhaTaxPnlSpec = {
      shortTerm: [
        {
          symbol: sym,
          isin,
          entryDate: '2025-01-01',
          exitDate: '2026-08-10',
          quantity: 50,
          buyValue: 5000.0,
          sellValue: 7500.0,
          profit: 2500.0,
        },
      ],
    };
    const taxPnlXlsx = await genZerodhaTaxPnlXlsx(taxPnlSpec);

    const { status, data: preview } = await previewZerodha(api, broker.id, {
      tradebookFiles: [tbCsv],
      taxpnlFiles: [taxPnlXlsx],
    });

    expect(status).toBe(200);
    const dataGapWarn = preview!.warnings.find((w) => w.type === 'DATA_GAP');
    expect(dataGapWarn).toBeDefined();
    expect(dataGapWarn!.message).toContain('sold with no prior buy');
  });

  test('7. Duplicates: duplicate row across two tradebook files flagged, different day trade_id not duplicate', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const sym = generateYahooSymbol('DUP');
    const isin = generateIsin();

    const inst = await resolveInstrument(api, {
      type: 'stock',
      name: `Dup Corp ${uniqueSeedSuffix()}`,
      isin,
      symbol: sym,
      exchange: 'NSE',
      yahooSymbol: sym,
    });

    // Commit an existing transaction first via direct commit
    await commitReconcile(api, {
      broker: 'zerodha',
      brokerAccountId: broker.id,
      executions: [
        {
          rowIndex: 1,
          symbol: sym,
          isin,
          tradeDate: '2026-08-01',
          type: 'buy',
          settlementType: 'delivery',
          quantity: 20,
          price: 100.0,
          instrumentId: inst.id,
          externalRef: 'trade-existing-1',
        },
      ],
    });

    // Preview two tradebook files:
    // File 1 has the existing trade (trade-existing-1 on 2026-08-01) + new trade (trade-new-1 on 2026-08-02)
    // File 2 has the identical new trade (trade-new-1 on 2026-08-02) + a trade on 2026-08-03 with distinct tradeId 'trade-new-2'
    const tb1Rows: ZerodhaRow[] = [
      { symbol: sym, isin, tradeDate: '2026-08-01', tradeType: 'buy', quantity: 20, price: 100.0, tradeId: 'trade-existing-1' },
      { symbol: sym, isin, tradeDate: '2026-08-02', tradeType: 'buy', quantity: 15, price: 105.0, tradeId: 'trade-new-1' },
    ];
    const tb2Rows: ZerodhaRow[] = [
      { symbol: sym, isin, tradeDate: '2026-08-02', tradeType: 'buy', quantity: 15, price: 105.0, tradeId: 'trade-new-1' }, // Dup in files
      { symbol: sym, isin, tradeDate: '2026-08-03', tradeType: 'buy', quantity: 20, price: 110.0, tradeId: 'trade-new-2' }, // New trade
    ];

    const tb1Csv = genZerodhaTradebookCsv(tb1Rows);
    const tb2Csv = genZerodhaTradebookCsv(tb2Rows);

    const taxPnlSpec: ZerodhaTaxPnlSpec = {
      shortTerm: [],
    };
    const taxPnlXlsx = await genZerodhaTaxPnlXlsx(taxPnlSpec);

    const { status, data: preview } = await previewZerodha(api, broker.id, {
      tradebookFiles: [tb1Csv, tb2Csv],
      taxpnlFiles: [taxPnlXlsx],
    });

    expect(status).toBe(200);
    // After full-tuple file dedup: 3 unique executions (2026-08-01, 2026-08-02, 2026-08-03)
    expect(preview!.executions).toHaveLength(3);

    const execAug1 = preview!.executions.find((e) => e.tradeDate === '2026-08-01');
    const execAug2 = preview!.executions.find((e) => e.tradeDate === '2026-08-02');
    const execAug3 = preview!.executions.find((e) => e.tradeDate === '2026-08-03');

    // 2026-08-01 matches existing DB transaction -> isDuplicate = true
    expect(execAug1!.isDuplicate).toBe(true);
    // 2026-08-02 was deduplicated across files, but is not in DB -> isDuplicate = false
    expect(execAug2!.isDuplicate).toBe(false);
    // 2026-08-03 is a new trade not in DB -> isDuplicate = false
    expect(execAug3!.isDuplicate).toBe(false);
  });

  test('8. Unresolved instruments: preview flags UNRESOLVED_INSTRUMENT, commit with mapped & new instrument succeeds', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const unknownIsin1 = generateIsin('IN9');
    const unknownSym1 = `UNRES1${uniqueSeedSuffix()}`;
    const unknownIsin2 = generateIsin('IN8');
    const unknownSym2 = `NEWSC${uniqueSeedSuffix()}`;

    const knownSym = generateYahooSymbol('MAPPED');
    const knownInst = await createInstrument(api, {
      name: `Target Instrument ${uniqueSeedSuffix()}`,
      symbol: knownSym,
      type: 'stock',
      exchange: 'NSE',
    });

    const tbRows: ZerodhaRow[] = [
      { symbol: unknownSym1, isin: unknownIsin1, tradeDate: '2026-08-08', tradeType: 'buy', quantity: 10, price: 50.0, tradeId: 'u-1' },
      { symbol: unknownSym2, isin: unknownIsin2, tradeDate: '2026-08-08', tradeType: 'buy', quantity: 20, price: 75.0, tradeId: 'u-2' },
    ];
    const tbCsv = genZerodhaTradebookCsv(tbRows);

    const taxPnlSpec: ZerodhaTaxPnlSpec = { shortTerm: [] };
    const taxPnlXlsx = await genZerodhaTaxPnlXlsx(taxPnlSpec);

    const { status, data: preview } = await previewZerodha(api, broker.id, {
      tradebookFiles: [tbCsv],
      taxpnlFiles: [taxPnlXlsx],
    });

    expect(status).toBe(200);
    expect(preview!.summaryStats.unresolvedInstruments).toBe(2);
    const unresWarns = preview!.warnings.filter((w) => w.type === 'UNRESOLVED_INSTRUMENT');
    expect(unresWarns).toHaveLength(2);

    // Commit mapping:
    // Row 1 mapped to knownInst.id
    // Row 2 mapped to newInstrument (without yahooSymbol)
    const commitBody: ReconcileCommitRequest = {
      broker: 'zerodha',
      brokerAccountId: broker.id,
      executions: [
        {
          rowIndex: 1,
          symbol: unknownSym1,
          isin: unknownIsin1,
          tradeDate: '2026-08-08',
          type: 'buy',
          settlementType: 'delivery',
          quantity: 10,
          price: 50.0,
          instrumentId: knownInst.id,
          externalRef: 'u-1',
        },
        {
          rowIndex: 2,
          symbol: unknownSym2,
          isin: unknownIsin2,
          tradeDate: '2026-08-08',
          type: 'buy',
          settlementType: 'delivery',
          quantity: 20,
          price: 75.0,
          newInstrument: {
            name: `New Created Corp ${unknownSym2}`,
            symbol: unknownSym2,
            type: 'stock',
            exchange: 'NSE',
          },
          externalRef: 'u-2',
        },
      ],
    };

    const commitRes = await commitReconcile(api, commitBody);
    expect(commitRes.status).toBe(202);
    expect(commitRes.result!.committed).toBe(2);
    expect(commitRes.result!.failed).toHaveLength(0);
  });

  test('9. Full commit lifecycle: positions netted, holdings match derivedHoldings, idempotence on re-commit', async ({
    api,
  }) => {
    const broker = await createBroker(api);
    const sym = generateYahooSymbol('COMM');
    const isin = generateIsin();

    const inst = await resolveInstrument(api, {
      type: 'stock',
      name: `Commit Test Corp ${uniqueSeedSuffix()}`,
      isin,
      symbol: sym,
      exchange: 'NSE',
      yahooSymbol: sym,
    });

    const tbRows: ZerodhaRow[] = [
      { symbol: sym, isin, tradeDate: '2026-08-01', tradeType: 'buy', quantity: 100, price: 100.0, tradeId: 'c-b1' },
      { symbol: sym, isin, tradeDate: '2026-08-02', tradeType: 'buy', quantity: 50, price: 110.0, tradeId: 'c-b2' },
      { symbol: sym, isin, tradeDate: '2026-08-02', tradeType: 'sell', quantity: 30, price: 120.0, tradeId: 'c-s1' },
    ];
    const tbCsv = genZerodhaTradebookCsv(tbRows);

    // 30 intraday on 2026-08-02
    const taxPnlSpec: ZerodhaTaxPnlSpec = {
      intraday: [
        {
          symbol: sym,
          isin,
          date: '2026-08-02',
          quantity: 30,
          buyValue: 3300.0,
          sellValue: 3600.0,
          profit: 300.0,
        },
      ],
    };
    const taxPnlXlsx = await genZerodhaTaxPnlXlsx(taxPnlSpec);

    const { status, data: preview } = await previewZerodha(api, broker.id, {
      tradebookFiles: [tbCsv],
      taxpnlFiles: [taxPnlXlsx],
    });
    expect(status).toBe(200);

    const commitPayload: ReconcileCommitRequest = {
      broker: 'zerodha',
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
        instrumentId: inst.id,
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

    const commit1 = await commitReconcile(api, commitPayload);
    expect(commit1.result!.committed).toBe(preview!.executions.length);
    expect(commit1.result!.skipped).toBe(0);

    // Verify positions: delivery holding = 120 (100 from day 1 + 20 remainder from day 2)
    const posRes = await positions(api);
    const pos = posRes.positions.find((p) => p.instrument.id === inst.id);
    expect(pos).toBeDefined();
    expect(pos!.quantity).toBe(120);

    // Re-commit the exact same payload -> all rows skipped as duplicates
    const commit2 = await commitReconcile(api, commitPayload);
    expect(commit2.result!.committed).toBe(0);
    expect(commit2.result!.skipped).toBe(preview!.executions.length);
  });

  test('10. assetScope filtering: equity vs fno vs all', async ({ api }) => {
    const broker = await createBroker(api);
    const sym = generateYahooSymbol('SCOPETST');
    const isin = generateIsin();

    await resolveInstrument(api, {
      type: 'stock',
      name: `Scope Test Corp ${uniqueSeedSuffix()}`,
      isin,
      symbol: sym,
      exchange: 'NSE',
      yahooSymbol: sym,
    });

    const tbRows: ZerodhaRow[] = [
      { symbol: sym, isin, tradeDate: '2026-08-01', tradeType: 'buy', quantity: 50, price: 100.0, tradeId: 'sc-b1' },
    ];
    const tbCsv = genZerodhaTradebookCsv(tbRows);

    const fnoSymbol = 'NIFTY26AUG24500CE';
    const taxPnlSpec: ZerodhaTaxPnlSpec = {
      shortTerm: [],
      fno: [
        {
          tradingSymbol: fnoSymbol,
          quantity: 50,
          buyValue: 5000.0,
          sellValue: 7500.0,
          profit: 2500.0,
          entryDate: '2026-08-01',
          exitDate: '2026-08-05',
          brokerage: 40.0,
          stt: 12.5,
        },
      ],
    };
    const taxPnlXlsx = await genZerodhaTaxPnlXlsx(taxPnlSpec);

    // A. assetScope = equity -> fnoTrades empty
    const { data: equityPreview } = await previewZerodha(api, broker.id, {
      tradebookFiles: [tbCsv],
      taxpnlFiles: [taxPnlXlsx],
      assetScope: 'equity',
    });
    expect(equityPreview!.executions).toHaveLength(1);
    expect(equityPreview!.fnoTrades).toHaveLength(0);
    expect(equityPreview!.realizedSummary).toBeDefined();

    // B. assetScope = fno (tradebookFiles omitted) -> executions empty, realizedSummary null, fnoTrades populated
    const { data: fnoPreview } = await previewZerodha(api, broker.id, {
      taxpnlFiles: [taxPnlXlsx],
      assetScope: 'fno',
    });
    expect(fnoPreview!.executions).toHaveLength(0);
    expect(fnoPreview!.derivedHoldings).toHaveLength(0);
    expect(fnoPreview!.realizedSummary).toBeNull();
    expect(fnoPreview!.fnoTrades).toHaveLength(1);
    expect(fnoPreview!.fnoTrades[0].tradingSymbol).toBe(fnoSymbol);

    // Commit F&O trades
    const fnoCommit = await commitReconcile(api, {
      broker: 'zerodha',
      brokerAccountId: broker.id,
      executions: [],
      fnoTrades: [
        {
          tradingSymbol: fnoSymbol,
          underlyingSymbol: 'NIFTY',
          contractType: 'option',
          optionType: 'CE',
          strikePrice: 24500,
          expiryDate: '2026-08-27',
          entryDate: '2026-08-01',
          exitDate: '2026-08-05',
          quantity: 50,
          buyValue: 5000.0,
          sellValue: 7500.0,
          totalCharges: 52.5,
          externalRef: fnoPreview!.fnoTrades[0].externalRef,
        },
      ],
    });
    expect(fnoCommit.result!.committed).toBe(1);

    // Re-commit -> duplicate skipped
    const fnoCommit2 = await commitReconcile(api, {
      broker: 'zerodha',
      brokerAccountId: broker.id,
      executions: [],
      fnoTrades: [
        {
          tradingSymbol: fnoSymbol,
          quantity: 50,
          buyValue: 5000.0,
          sellValue: 7500.0,
          externalRef: fnoPreview!.fnoTrades[0].externalRef,
        },
      ],
    });
    expect(fnoCommit2.result!.committed).toBe(0);
    expect(fnoCommit2.result!.skipped).toBe(1);

    // C. assetScope = all -> Both equity executions and fnoTrades populated
    const { data: allPreview } = await previewZerodha(api, broker.id, {
      tradebookFiles: [tbCsv],
      taxpnlFiles: [taxPnlXlsx],
      assetScope: 'all',
    });
    expect(allPreview!.executions).toHaveLength(1);
    expect(allPreview!.fnoTrades).toHaveLength(1);
  });

  test('11. holdingsFile anchor mismatch emits DATA_GAP warning', async ({ api }) => {
    const broker = await createBroker(api);
    const sym = generateYahooSymbol('ANCHOR');
    const isin = generateIsin();

    await resolveInstrument(api, {
      type: 'stock',
      name: `Anchor Test Corp ${uniqueSeedSuffix()}`,
      isin,
      symbol: sym,
      exchange: 'NSE',
      yahooSymbol: sym,
    });

    const tbRows: ZerodhaRow[] = [
      { symbol: sym, isin, tradeDate: '2026-08-01', tradeType: 'buy', quantity: 100, price: 100.0, tradeId: 'an-b1' },
    ];
    const tbCsv = genZerodhaTradebookCsv(tbRows);

    const taxPnlSpec: ZerodhaTaxPnlSpec = { shortTerm: [] };
    const taxPnlXlsx = await genZerodhaTaxPnlXlsx(taxPnlSpec);

    // Holdings snapshot says we only have 70 shares in demat (mismatch vs derived 100)
    const snapshotCsv = genHoldingsSnapshotCsv([
      { isin, symbol: sym, quantity: 70, averagePrice: 100.0 },
    ]);

    const { status, data: preview } = await previewZerodha(api, broker.id, {
      tradebookFiles: [tbCsv],
      taxpnlFiles: [taxPnlXlsx],
      holdingsFile: { buffer: snapshotCsv, filename: 'holdings.csv' },
    });

    expect(status).toBe(200);
    const snapWarning = preview!.warnings.find((w) => w.type === 'DATA_GAP' && w.message.includes('Holdings snapshot mismatch'));
    expect(snapWarning).toBeDefined();
    expect(snapWarning!.message).toMatch(/Derived FIFO qty 100(\.0000)? vs Demat snapshot qty 70/);
  });

  test('12. Validation & Security: non-broker 400, missing taxpnl 400, non-existent account 404, 401 unauthenticated', async ({
    api,
  }) => {
    // A. Non-broker account -> 400
    const bankAccount = await createBankAccount(api, { name: 'Savings Account' });
    const tbCsv = genZerodhaTradebookCsv([
      { symbol: 'ABC', isin: 'INE123456789', tradeDate: '2026-08-01', tradeType: 'buy', quantity: 10, price: 100 },
    ]);
    const taxPnlXlsx = await genZerodhaTaxPnlXlsx({ shortTerm: [] });

    const nonBrokerRes = await previewZerodha(api, bankAccount.id, {
      tradebookFiles: [tbCsv],
      taxpnlFiles: [taxPnlXlsx],
    });
    expect(nonBrokerRes.status).toBe(400);

    // Async commit for non-broker account enqueues (202), and the job fails with ValidationException
    const nonBrokerCommit = await api.POST('/api/v1/investments/imports/reconcile/commit', {
      body: {
        broker: 'zerodha',
        brokerAccountId: bankAccount.id,
        executions: [],
      },
    });
    expectStatus(nonBrokerCommit, 202);
    const nonBrokerJob = await waitForJob(api, (nonBrokerCommit.data as { jobId: string }).jobId);
    expect(nonBrokerJob.status).toBe('FAILED');
    expect(nonBrokerJob.errorMessage).toContain('Account must be a broker account');

    // B. Missing taxpnlFiles -> 400
    const broker = await createBroker(api);
    const formData = new FormData();
    formData.append('tradebookFiles', new Blob([new Uint8Array(tbCsv)], { type: 'text/csv' }), 'tb.csv');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const missingTaxpnlRes = await (api as any).POST('/api/v1/investments/imports/reconcile/preview', {
      params: { query: { broker: 'zerodha', brokerAccountId: broker.id } },
      body: formData,
      bodySerializer: (b: unknown) => b,
    });
    expectStatus(missingTaxpnlRes, 400);

    // C. Non-existent account -> 404
    const nonExistentAccountId = '00000000-0000-0000-0000-000000000000';
    const nonExistentPreview = await previewZerodha(api, nonExistentAccountId, {
      tradebookFiles: [tbCsv],
      taxpnlFiles: [taxPnlXlsx],
    });
    expect(nonExistentPreview.status).toBe(404);

    const nonExistentCommit = await api.POST('/api/v1/investments/imports/reconcile/commit', {
      body: {
        broker: 'zerodha',
        brokerAccountId: nonExistentAccountId,
        executions: [],
      },
    });
    expectStatus(nonExistentCommit, 202);
    const nonExistentJob = await waitForJob(api, (nonExistentCommit.data as { jobId: string }).jobId);
    expect(nonExistentJob.status).toBe('FAILED');

    // D. 401 unauthenticated
    await expectUnauthenticated('POST', '/api/v1/investments/imports/reconcile/preview');
    await expectUnauthenticated('POST', '/api/v1/investments/imports/reconcile/commit', {
      broker: 'zerodha',
      brokerAccountId: broker.id,
      executions: [],
    });
  });
});

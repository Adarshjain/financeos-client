import type { Broker } from '@/lib/account.types';
import type { FnoTradePreview, ImportPreview, ReconciledExecution, ReconcilePreview } from '@/lib/types';

export const broker = (over: Partial<Broker> = {}) =>
  ({ id: 'b1', name: 'Zerodha main', type: 'BROKER', provider: 'Zerodha', ...over }) as Broker;

export const execution = (over: Partial<ReconciledExecution> = {}): ReconciledExecution => ({
  rowIndex: 1,
  tradeDate: '2026-03-11',
  type: 'buy',
  settlementType: 'delivery',
  symbol: 'ZOMATO',
  isin: 'INE758T01015',
  exchange: 'NSE',
  quantity: 100,
  price: 214.6,
  totalValue: 21460,
  isDuplicate: false,
  matchedInstrument: { id: 'i-zomato', type: 'stock', name: 'Zomato Ltd' },
  ...over,
});

export const fnoTrade = (over: Partial<FnoTradePreview> = {}): FnoTradePreview => ({
  tradingSymbol: 'NIFTY2682824500CE',
  underlyingSymbol: 'NIFTY',
  contractType: 'option',
  optionType: 'CE',
  strikePrice: 24500,
  expiryDate: '2026-08-28',
  quantity: 75,
  buyValue: 11250,
  sellValue: 29625,
  totalCharges: 142.6,
  realizedPnl: 18232.4,
  externalRef: 'fno-1',
  isDuplicate: false,
  ...over,
});

/** Zomato matched, IDEAFORGE and TATATECH unmatched, RELIANCE a matched duplicate; two F&O trades, one a duplicate. */
export const reconcilePreview = (over: Partial<ReconcilePreview> = {}): ReconcilePreview => ({
  executions: [
    execution(),
    execution({ rowIndex: 2, symbol: 'IDEAFORGE', isin: 'INE349Y01013', price: 487.35, quantity: 40, totalValue: 19494, matchedInstrument: undefined }),
    execution({ rowIndex: 3, symbol: 'TATATECH', isin: 'INE142M01025', tradeDate: '2026-07-02', matchedInstrument: undefined }),
    execution({
      rowIndex: 4,
      symbol: 'RELIANCE',
      tradeDate: '2025-02-10',
      isDuplicate: true,
      matchedInstrument: { id: 'i-rel', type: 'stock', name: 'Reliance Industries Ltd' },
    }),
  ],
  derivedHoldings: [],
  warnings: [
    { type: 'UNRESOLVED_INSTRUMENT', severity: 'WARNING', symbol: 'IDEAFORGE', message: 'Instrument IDEAFORGE is not mapped to catalog.' },
    { type: 'DATA_GAP', severity: 'INFO', message: 'Incomplete tradebook history.' },
  ],
  summaryStats: {
    totalExecutions: 38,
    deliveryExecutions: 31,
    intradayExecutions: 7,
    matchedInstruments: 2,
    unresolvedInstruments: 2,
    duplicates: 4,
    warningsCount: 6,
  },
  classifications: [],
  fnoTrades: [
    fnoTrade(),
    fnoTrade({ tradingSymbol: 'NIFTY2681324000PE', optionType: 'PE', strikePrice: 24000, realizedPnl: -2820, externalRef: 'fno-2', isDuplicate: true }),
  ],
  ...over,
});

const casRow = (rowIndex: number, over: Record<string, unknown> = {}, rest: Record<string, unknown> = {}) => ({
  rowIndex,
  parsedRow: {
    kind: 'trade',
    type: 'buy',
    parsedName: 'E2E Bluechip Growth Fund',
    parsedSymbol: 'BLUECHIP',
    parsedIsin: 'INF100E2E001',
    quantity: 40.5,
    price: 123.4567,
    amount: 5000,
    tradeDate: '2026-08-01',
    ...over,
  },
  matchStatus: 'matched',
  matchedInstrument: { id: 'f1', name: 'E2E Bluechip Growth Fund' },
  duplicate: false,
  ...rest,
});

/** A matched purchase, an unmatched one, a duplicate, and a row the file could not read. */
export const casPreview = (): ImportPreview =>
  ({
    rows: [
      casRow(1),
      casRow(2, { parsedName: 'Unknown Midcap Fund', parsedIsin: 'INF999X00001' }, { matchStatus: 'unmatched', matchedInstrument: undefined }),
      casRow(3, { tradeDate: '2026-08-05' }, { duplicate: true }),
      casRow(4, { error: 'Could not read the units' }, {}),
    ],
    summary: { total: 4, matched: 3, unmatched: 1, duplicates: 1, errors: 1, note: 'Folio 12345678/0' },
  }) as unknown as ImportPreview;

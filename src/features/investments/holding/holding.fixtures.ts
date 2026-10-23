import type { HoldingDetail, PricePoint, SellEstimate } from '@/lib/investments.types';
import type { CorporateAction, Dividend, Instrument, InvestmentTransactionResponse } from '@/lib/types';

import type { HoldingPageData } from './holdingData';

export const holding: HoldingDetail = {
  instrumentId: 'i-infy',
  symbol: 'INFY',
  name: 'Infosys',
  assetType: 'stock',
  quantity: 60,
  avgCost: 710,
  ltp: 1512.7,
  priceAsOf: '2026-10-13',
  manualPrice: false,
  noPrice: false,
  currentValue: 90762,
  invested: 42600,
  unrealised: 48162,
  unrealisedPct: 113.06,
  dayChange: 1860,
  dayChangePct: 2.1,
  mergedIntoName: null,
  mergedIntoDate: null,
  realisedPnl: 0,
  totalCharges: 51.2,
  dividends: 1320,
  xirr: 31.4,
  firstBuyDate: '2024-03-11',
  term: 'long',
  brokers: [
    { brokerAccountId: 'b1', accountName: 'Zerodha · ZQ4471', quantity: 40, avgCost: 710, currentValue: 60508 },
    { brokerAccountId: 'b2', accountName: 'Groww · GR88213', quantity: 20, avgCost: 710, currentValue: 30254 },
  ],
};

export const instrument = {
  id: 'i-infy',
  type: 'stock',
  name: 'Infosys',
  symbol: 'INFY',
  exchange: 'NSE',
  isin: 'INE009A01021',
  yahooSymbol: 'INFY.NS',
  currency: 'INR',
  lastPriceSource: 'YAHOO',
  overridden: false,
  overriddenFields: [],
} as unknown as Instrument;

export const estimate: SellEstimate = {
  instrumentId: 'i-infy',
  quantity: 60,
  price: 1512.7,
  noPrice: false,
  proceeds: 90762,
  cost: 42600,
  gain: 48162,
  longTermGain: 48162,
  shortTermGain: 0,
  equity: true,
  fy: 2026,
  stcgRate: 20,
  ltcgRate: 12.5,
  stcgTax: 0,
  ltcgTax: 0,
  tax: 0,
  exemptionLeftBefore: 125000,
  exemptionLeftAfter: 106521,
  lots: [
    { buyDate: '2024-03-11', quantity: 20, costPerUnit: 1420, cost: 28400, proceeds: 30254, gain: 1854, term: 'long' },
    { buyDate: '2024-04-02', quantity: 10, costPerUnit: 1420, cost: 14200, proceeds: 15127, gain: 927, term: 'long' },
    { buyDate: '2025-06-10', quantity: 30, costPerUnit: 0, cost: 0, proceeds: 45381, gain: 45381, term: 'long' },
  ],
};

export const buy = (over: Partial<InvestmentTransactionResponse> = {}): InvestmentTransactionResponse =>
  ({
    id: 't1',
    brokerAccountId: 'b1',
    brokerName: 'Zerodha',
    instrumentId: 'i-infy',
    type: 'buy',
    quantity: 20,
    price: 1420,
    tradeDate: '2024-03-11',
    totalCharges: 25,
    ...over,
  }) as InvestmentTransactionResponse;

export const dividend = {
  id: 'd1',
  type: 'dividend',
  amount: 1320,
  perUnit: 22,
  tds: 132,
  exDate: '2025-05-30',
  payDate: '2025-06-18',
  brokerAccountId: 'b1',
  instrumentId: 'i-infy',
} as unknown as Dividend;

export const bonus = {
  id: 'ca1',
  instrumentId: 'i-infy',
  type: 'bonus',
  ratioFrom: 1,
  ratioTo: 1,
  exDate: '2025-06-10',
} as unknown as CorporateAction;

export const manualPrice: PricePoint = { id: 'p3', asOf: '2026-10-10', close: 1470, source: 'MANUAL', editable: true };

export const prices: PricePoint[] = [
  { id: null, asOf: '2026-10-13', close: 1512.7, source: 'YAHOO', editable: false },
  { id: null, asOf: '2026-10-12', close: 1481.55, source: 'YAHOO', editable: false },
  manualPrice,
  { id: null, asOf: '2026-10-09', close: 1466.2, source: 'YAHOO', editable: false },
];

export function pageData(over: Partial<HoldingPageData> = {}): HoldingPageData {
  const trades = [buy(), buy({ id: 't2', brokerName: 'Groww', quantity: 10, tradeDate: '2024-04-02' })];
  return {
    holding,
    instrument,
    estimate,
    trades: { content: trades, number: 0, size: 10, totalElements: 2, totalPages: 1, first: true, last: true, empty: false },
    dividends: { content: [dividend], number: 0, size: 5, totalElements: 1, totalPages: 1, first: true, last: true, empty: false },
    corporateActions: [bonus],
    prices: { items: prices, page: 0, size: 10, totalElements: 4, totalPages: 1 },
    history: [
      { asOf: '2026-08-01', close: 1400, source: 'YAHOO' },
      { asOf: '2026-09-20', close: 1450, source: 'YAHOO' },
      { asOf: '2026-10-13', close: 1512.7, source: 'YAHOO' },
    ],
    ...over,
  };
}

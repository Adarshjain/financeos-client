import type { JobResponse } from '@/lib/jobs.types';
import type { InvestmentTransactionResponse, PagedInvestmentTransactionResponse } from '@/lib/types';

export function trade(over: Partial<InvestmentTransactionResponse> = {}): InvestmentTransactionResponse {
  return {
    id: 't-1',
    brokerAccountId: 'b-zerodha',
    brokerName: 'Zerodha',
    provider: 'Zerodha',
    instrumentId: 'i-tata',
    instrument: { id: 'i-tata', type: 'stock', name: 'Tata Motors', symbol: 'TATAMOTORS' },
    type: 'sell',
    settlementType: 'delivery',
    quantity: '50',
    price: '710.00',
    tradeDate: '2026-10-01',
    brokerage: '0.00',
    stt: '35.50',
    exchangeTxnCharges: '1.06',
    sebiCharges: '0.04',
    stampDuty: '0.00',
    gst: '0.20',
    dpCharges: '5.30',
    otherCharges: '0.00',
    totalCharges: '42.10',
    notes: 'Sold before the demerger',
    realisedPnl: -13500,
    settlement: 'delivery',
    ...over,
  };
}

export const fundBuy = trade({
  id: 't-2',
  brokerAccountId: 'b-groww',
  brokerName: 'Groww',
  provider: 'Groww',
  instrumentId: 'i-ppfas',
  instrument: { id: 'i-ppfas', type: 'mutual_fund', name: 'Parag Parikh Flexi Cap' },
  type: 'buy',
  settlementType: undefined,
  quantity: '55.98',
  price: '89.32',
  tradeDate: '2026-10-05',
  totalCharges: '0',
  notes: undefined,
  realisedPnl: null,
  settlement: null,
});

export const stockBuy = trade({
  id: 't-3',
  type: 'buy',
  instrumentId: 'i-gold',
  instrument: { id: 'i-gold', type: 'etf', name: 'Goldbees', symbol: 'GOLDBEES' },
  quantity: '200',
  price: '62.00',
  tradeDate: '2026-05-21',
  totalCharges: '14.80',
  realisedPnl: null,
  notes: undefined,
});

export function tradesPage(rows: InvestmentTransactionResponse[], over: Partial<PagedInvestmentTransactionResponse> = {}): PagedInvestmentTransactionResponse {
  return {
    content: rows,
    totalElements: rows.length,
    totalPages: 1,
    size: 25,
    number: 0,
    first: true,
    last: true,
    empty: rows.length === 0,
    ...over,
  } as PagedInvestmentTransactionResponse;
}

export function job(over: Partial<JobResponse> = {}): JobResponse {
  return {
    id: 'job-1',
    type: 'INVESTMENT_IMPORT_COMMIT',
    status: 'SUCCEEDED',
    triggerSource: 'USER',
    cancelRequested: false,
    attempt: 1,
    createdAt: '2026-10-13T05:31:00Z',
    finishedAt: '2026-10-13T05:32:10Z',
    result: { committed: 14, skipped: 24, failed: [], skippedItems: [] },
    ...over,
  };
}

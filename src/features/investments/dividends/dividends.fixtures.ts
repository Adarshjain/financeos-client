import type { DividendInstrumentTotal } from '@/lib/investments.types';
import type { Dividend, DividendReceiptSummary, DividendSuggestion, DividendSummary } from '@/lib/types';

import type { UnrecordedCredit } from './receiptTypes';

/** HDFCBANK, 40 shares at ₹22, ₹88 TDS, linked to an HDFC Savings credit. */
export function dividend(overrides: Partial<Dividend> = {}): Dividend {
  return {
    id: 'd1',
    holdingId: 'h1',
    brokerAccountId: 'b1',
    instrumentId: 'i1',
    brokerName: 'Zerodha',
    instrumentName: 'HDFC Bank Ltd',
    symbol: 'HDFCBANK',
    type: 'dividend',
    amount: 880,
    perUnit: 22,
    tds: 88,
    exDate: '2026-07-10',
    payDate: '2026-07-11',
    source: 'manual',
    notes: '',
    receiptStatus: 'received',
    transaction: {
      id: 't1',
      accountId: 'a1',
      accountName: 'HDFC Savings',
      date: '2026-07-11',
      description: 'ACH CR · HDFC BANK DIV',
      signedAmount: 792,
    },
    ...overrides,
  };
}

/** TCS: 10 shares at ₹11, nothing received yet. */
export const awaiting = (overrides: Partial<Dividend> = {}) =>
  dividend({
    id: 'd2',
    instrumentId: 'i2',
    symbol: 'TCS',
    instrumentName: 'Tata Consultancy Services',
    amount: 110,
    perUnit: 11,
    tds: 0,
    payDate: '2026-09-29',
    exDate: '2026-09-25',
    receiptStatus: 'awaiting',
    transaction: null,
    ...overrides,
  });

export function summary(overrides: Partial<DividendSummary> = {}): DividendSummary {
  return {
    buckets: [
      { label: 'FY 2026-27', fromDate: '2026-04-01', toDate: '2027-03-31', amount: 3975, tds: 370, net: 3605, count: 5 },
      { label: 'FY 2025-26', fromDate: '2025-04-01', toDate: '2026-03-31', amount: 1200, tds: 120, net: 1080, count: 2 },
    ],
    totalAmount: 5175,
    totalTds: 490,
    totalNet: 4685,
    totalCount: 7,
    ...overrides,
  };
}

export function receipts(overrides: Partial<DividendReceiptSummary> = {}): DividendReceiptSummary {
  return {
    buckets: [
      { status: 'received', count: 2, expectedNet: 1980, receivedAmount: 1980 },
      { status: 'awaiting', count: 1, expectedNet: 110, receivedAmount: 0 },
      { status: 'overdue', count: 1, expectedNet: 1350, receivedAmount: 0 },
      { status: 'unverifiable', count: 1, expectedNet: 165, receivedAmount: 0 },
    ],
    coverageEnd: '2026-10-13',
    totalCount: 5,
    ...overrides,
  };
}

export function suggestion(overrides: Partial<DividendSuggestion> = {}): DividendSuggestion {
  return {
    holdingId: 'h2',
    brokerAccountId: 'b1',
    brokerName: 'Zerodha',
    instrumentId: 'i2',
    instrumentName: 'Tata Consultancy Services',
    symbol: 'TCS',
    exDate: '2026-08-05',
    perUnit: 10,
    qtyHeld: 10,
    estimatedAmount: 100,
    ...overrides,
  };
}

export function instrumentTotal(overrides: Partial<DividendInstrumentTotal> = {}): DividendInstrumentTotal {
  return { instrumentId: 'i3', instrumentName: 'ITC Ltd', symbol: 'ITC', gross: 4500, tds: 250, net: 4250, payouts: 3, ...overrides };
}

export function unrecordedCredit(overrides: Partial<UnrecordedCredit['transaction']> = {}, hints: UnrecordedCredit['holdingHints'] = []): UnrecordedCredit {
  return {
    transaction: {
      id: 'tx1',
      accountId: 'a1',
      date: '2026-09-24',
      amount: 1020,
      description: 'ACH CR · COAL INDIA LTD',
      ...overrides,
    } as UnrecordedCredit['transaction'],
    holdingHints: hints,
  };
}

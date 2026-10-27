import type { Schemas } from '@/lib/api/types';
import type { Dividend } from '@/lib/types';

import type { DividendMatchCandidate } from '../types';

export type TransactionResponse = Schemas['TransactionResponse'];

export function makeTxn(overrides: Partial<TransactionResponse> = {}): TransactionResponse {
  return {
    id: 'tx-1',
    accountId: 'acc1',
    amount: 900,
    categories: [],
    createdAt: '2026-01-01T00:00:00Z',
    date: '2026-03-10',
    description: 'ACH CR INFOSYS DIVIDEND',
    isTransactionExcluded: false,
    isTransactionUnderMonitoring: false,
    links: [],
    obligationRefs: [],
    reviewReasons: [],
    source: 'manual',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as TransactionResponse;
}

export function makeDividend(overrides: Partial<Dividend> = {}): Dividend {
  return {
    id: 'd1',
    holdingId: 'h1',
    brokerAccountId: 'broker-1',
    instrumentId: 'inst-1',
    brokerName: 'Zerodha',
    instrumentName: 'Infosys Limited',
    symbol: 'INFY',
    type: 'dividend',
    amount: 1000,
    payDate: '2026-03-08',
    exDate: '2026-02-20',
    source: 'manual',
    receiptStatus: 'overdue',
    ...overrides,
  };
}

export function makeCandidate(overrides: Partial<DividendMatchCandidate> = {}): DividendMatchCandidate {
  return {
    transaction: makeTxn(),
    tier: 'EXACT',
    score: 90,
    reasons: ['EXACT_GROSS'],
    impliedTds: null,
    variance: 0,
    ...overrides,
  };
}

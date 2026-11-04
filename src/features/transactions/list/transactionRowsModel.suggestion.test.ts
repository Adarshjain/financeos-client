import { describe, expect, it } from 'vitest';

import type { Transaction } from '@/lib/transaction.types';

import { transactionRow } from './transactionRowsModel';

const ctx = { accounts: null, showSource: false };
const t = (over: Partial<Transaction> = {}) =>
  ({ id: 't1', accountId: 'a1', date: '2026-10-12', amount: -450, description: 'Swiggy', source: 'manual', createdAt: '2026-10-12T00:00:00Z', ...over }) as Transaction;

describe('transactionRow suggestion', () => {
  it('carries the server label', () => {
    const suggestion = { id: 's1', kind: 'REFUND' as const, label: 'Looks like a refund of Swiggy ₹450 · 2 Nov', candidates: [] };
    expect(transactionRow(t({ suggestion }), ctx).suggestion).toBe(suggestion.label);
  });

  it('has none when the transaction has no suggestion', () => {
    expect(transactionRow(t(), ctx).suggestion).toBeUndefined();
    expect(transactionRow(t({ suggestion: null }), ctx).suggestion).toBeUndefined();
  });
});

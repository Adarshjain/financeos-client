import { describe, expect, it } from 'vitest';

import type { MatchSuggestionsResponse } from '@/lib/loan.types';
import type { Transaction } from '@/lib/transaction.types';

import { ambiguousNote, confirmAllPlan, nothingFound, suggestionRows } from './matchModel';

const tx = (id: string, over: Partial<Transaction> = {}) =>
  ({ id, date: '2026-10-05', amount: -39052, description: 'SBI Home Loan EMI', accountId: 'b1', ...over }) as Transaction;

const response = (suggestions: MatchSuggestionsResponse['suggestions']): MatchSuggestionsResponse => ({ suggestions });

describe('suggestionRows', () => {
  it('has one row per suggested debit, with its installment', () => {
    const rows = suggestionRows(
      response([
        { installmentSeq: 14, dueDate: '2026-10-05', expectedAmount: 36603, candidates: [tx('t1'), tx('t2', { description: '' })] },
        { installmentSeq: 15, dueDate: '2026-11-05', expectedAmount: 36603, candidates: [] },
      ]),
    );
    expect(rows.map((r) => [r.key, r.seq])).toEqual([
      ['14:t1', 14],
      ['14:t2', 14],
    ]);
    expect(rows[0].text).toBe('#14 "SBI Home Loan EMI" 5 Oct · ₹39,052');
    expect(rows[1].text).toBe('#14 "DEBIT" 5 Oct · ₹39,052');
  });

  it('has none before the server was asked', () => {
    expect(suggestionRows(null)).toEqual([]);
  });
});

describe('nothingFound', () => {
  it('is true only once the server answered with no candidates at all', () => {
    expect(nothingFound(null)).toBe(false);
    expect(nothingFound(response([]))).toBe(true);
    expect(nothingFound(response([{ installmentSeq: 1, dueDate: '2026-10-05', expectedAmount: 1, candidates: [] }]))).toBe(true);
    expect(nothingFound(response([{ installmentSeq: 1, dueDate: '2026-10-05', expectedAmount: 1, candidates: [tx('t')] }]))).toBe(false);
  });
});

describe('confirmAllPlan', () => {
  const names = new Map([['b1', 'HDFC Savings']]);

  it('lists only installments with exactly one candidate, in full, and counts the ambiguous ones', () => {
    const plan = confirmAllPlan(
      response([
        { installmentSeq: 14, dueDate: '2026-10-05', expectedAmount: 36603, candidates: [tx('t1')] },
        { installmentSeq: 15, dueDate: '2026-11-05', expectedAmount: 36603, candidates: [tx('t2'), tx('t3')] },
        { installmentSeq: 16, dueDate: '2026-12-05', expectedAmount: 36603, candidates: [] },
        { installmentSeq: 17, dueDate: '2027-01-05', expectedAmount: 36603, candidates: [tx('t4', { amount: null })] },
      ]),
      names,
    );
    expect(plan.pairs.map((p) => [p.seq, p.tx.id])).toEqual([[14, 't1']]);
    expect(plan.pairs[0].text).toBe('EMI #14 due 5 Oct ₹36,603 ↔ 5 Oct ₹39,052 SBI Home Loan EMI (HDFC Savings)');
    expect(plan.ambiguous).toBe(1);
  });

  it('is empty before the server was asked', () => {
    expect(confirmAllPlan(null)).toEqual({ pairs: [], ambiguous: 0 });
  });
});

describe('ambiguousNote', () => {
  it('reads one and many', () => {
    expect(ambiguousNote(1)).toBe('1 EMI has more than one possible payment; pick it by hand.');
    expect(ambiguousNote(3)).toBe('3 EMIs have more than one possible payment; pick those by hand.');
  });
});

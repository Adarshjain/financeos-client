import { describe, expect, it } from 'vitest';

import type { Transaction } from '@/lib/transaction.types';

import { installment } from './loanDetail.fixtures';
import { differenceWords, foundDebit, foundDebitLine, payDescription, payProblems } from './payModel';

const debit = (over: Partial<Transaction> = {}) =>
  ({ id: 't1', date: '2026-10-05', amount: -39052, description: 'SBI Home Loan EMI', accountId: 'b1', ...over }) as Transaction;

describe('differenceWords', () => {
  it('says how much more was paid than the EMI', () => {
    expect(differenceWords(39052, 36603)).toBe('₹2,449 more than EMI');
  });

  it('says how much less', () => {
    expect(differenceWords(35000, 36603)).toBe('₹1,603 less than EMI');
  });

  it('keeps paise when there are some', () => {
    expect(differenceWords(36603.5, 36603)).toBe('₹0.50 more than EMI');
  });

  it('says nothing when what was paid is the EMI, or is not a number yet', () => {
    expect(differenceWords(36603, 36603)).toBeNull();
    expect(differenceWords(Number.NaN, 36603)).toBeNull();
    expect(differenceWords(0, 36603)).toBeNull();
    expect(differenceWords(-5, 36603)).toBeNull();
  });
});

describe('found debit', () => {
  it('is the first candidate of the installment, if any', () => {
    const suggestions = [
      { installmentSeq: 14, dueDate: '2026-10-05', expectedAmount: 36603, candidates: [debit(), debit({ id: 't2' })] },
      { installmentSeq: 15, dueDate: '2026-11-05', expectedAmount: 36603, candidates: [] },
    ];
    expect(foundDebit(suggestions, 14)?.id).toBe('t1');
    expect(foundDebit(suggestions, 15)).toBeNull();
    expect(foundDebit(suggestions, 99)).toBeNull();
    expect(foundDebit(undefined, 14)).toBeNull();
  });

  it('reads as the board does', () => {
    expect(foundDebitLine(debit(), 'HDFC Bank Savings')).toBe('"SBI Home Loan EMI" · HDFC Bank Savings · 5 Oct · ₹39,052');
  });

  it('describes the EMI under the title', () => {
    expect(payDescription(installment(14, '2026-10-05'), 'Home Loan · SBI MaxGain')).toBe(
      '₹36,603 due 5 Oct · Home Loan · SBI MaxGain',
    );
  });
});

describe('payProblems', () => {
  const ok = { choice: 'none' as const, amount: '36603', date: '2026-10-05' };

  it('passes a dated amount with no transaction when none was asked for', () => {
    expect(payProblems(ok)).toEqual([]);
  });

  it('needs an amount above zero and a date', () => {
    expect(payProblems({ ...ok, amount: '' }).map((p) => p.field)).toEqual(['amount']);
    expect(payProblems({ ...ok, amount: '0' }).map((p) => p.field)).toEqual(['amount']);
    expect(payProblems({ ...ok, amount: '-5' }).map((p) => p.field)).toEqual(['amount']);
    expect(payProblems({ ...ok, date: '' }).map((p) => p.field)).toEqual(['date']);
  });

  it('needs the debit when the choice is to link one', () => {
    expect(payProblems({ ...ok, choice: 'pick' }).map((p) => p.field)).toEqual(['transaction']);
    expect(payProblems({ ...ok, choice: 'pick', transactionId: 't9' })).toEqual([]);
    expect(payProblems({ ...ok, choice: 'found', transactionId: 't1' })).toEqual([]);
  });
});

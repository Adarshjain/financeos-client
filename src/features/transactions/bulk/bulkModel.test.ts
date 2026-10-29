import { describe, expect, it } from 'vitest';

import type { Transaction } from '@/lib/transaction.types';

import {
  approveHint,
  deleteCopy,
  deletedMessage,
  isApprovable,
  mergedMessage,
  mergeHint,
  selectionSummary,
} from './bulkModel';

const txn = (over: Partial<Transaction>): Transaction =>
  ({ id: 'a', accountId: 'a1', date: '2026-10-11', amount: -100, source: 'manual', reviewType: 'MANUALLY_REVIEWED', ...over }) as Transaction;
const flagged = (reasons: Transaction['reviewReasons'], over: Partial<Transaction> = {}) =>
  txn({ reviewType: 'NEEDS_REVIEW', reviewReasons: reasons, ...over });

describe('isApprovable', () => {
  it('needs Needs review and a reason that can be cleared', () => {
    expect(isApprovable(flagged(['DUPLICATE_SUSPECT']))).toBe(true);
    expect(isApprovable(flagged([]))).toBe(false);
    expect(isApprovable(txn({ reviewReasons: ['DUPLICATE_SUSPECT'] }))).toBe(false);
  });
});

describe('selectionSummary', () => {
  it('adds up the amounts and counts the rows that need review', () => {
    const rows = [txn({ amount: -3600 }), txn({ amount: 1800 }), flagged(['UNRECONCILED'], { amount: -1249 })];
    expect(selectionSummary(rows)).toBe('₹6,649 · 1 need review');
  });

  it('leaves the review part out when nothing needs it', () => {
    expect(selectionSummary([txn({ amount: -1234567 })])).toBe('₹12,34,567');
  });
});

describe('hints', () => {
  it('Merge says pick 2 until exactly two are selected', () => {
    expect(mergeHint(1)).toBe('pick 2');
    expect(mergeHint(3)).toBe('pick 2');
    expect(mergeHint(2)).toBe('the pair');
  });

  it('Approve names the one reason when every flagged row shares it, else counts the flagged', () => {
    expect(approveHint([flagged(['DUPLICATE_SUSPECT']), flagged(['DUPLICATE_SUSPECT']), txn({})])).toBe('clear Duplicate');
    expect(approveHint([flagged(['DUPLICATE_SUSPECT']), flagged(['UNRECONCILED'])])).toBe('2 flagged');
    expect(approveHint([flagged(['DUPLICATE_SUSPECT', 'UNRECONCILED'])])).toBe('1 flagged');
    expect(approveHint([txn({}), flagged([])])).toBe('none flagged');
  });
});

describe('messages', () => {
  it('mergedMessage says resolved, or what still needs review', () => {
    expect(mergedMessage([])).toBe('Transactions merged and resolved');
    expect(mergedMessage(['Unreconciled', 'Date corrected'])).toBe(
      'Transactions merged. The kept transaction still needs review: Unreconciled, Date corrected',
    );
  });

  it('deletedMessage is singular for one', () => {
    expect(deletedMessage(1)).toBe('Transaction deleted');
    expect(deletedMessage(3)).toBe('3 transactions deleted');
  });
});

describe('deleteCopy', () => {
  it('one transaction: names it and uses the detail impact', () => {
    const copy = deleteCopy([txn({ description: 'Swiggy', amount: -1249 })]);
    expect(copy.title).toBe('Delete Swiggy · ₹1,249.00?');
    expect(copy.confirmLabel).toBe('Delete');
    expect(copy.impact[0]).toBe('The transaction is deleted.');
  });

  it('several: counts them, the records that stay and the imported ones', () => {
    const copy = deleteCopy([
      txn({ obligationRefs: [{ kind: 'lending', id: 'l1', label: 'Meera' }] as never }),
      txn({ source: 'gmail_statement' }),
      txn({ source: 'file_upload' }),
    ]);
    expect(copy.title).toBe('Delete 3 transactions?');
    expect(copy.confirmLabel).toBe('Delete 3 transactions');
    expect(copy.impact).toEqual([
      '3 transactions are deleted.',
      '1 linked record stays but loses the link.',
      '2 are not manually created. It is discouraged to delete these.',
    ]);
  });
});

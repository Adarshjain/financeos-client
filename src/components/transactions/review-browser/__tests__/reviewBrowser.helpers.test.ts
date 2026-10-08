import { describe, expect, it } from 'vitest';

import { getObligationLinkedCount } from '@/components/transactions/review-browser/reviewBrowser.helpers';
import type { PagedTransaction, Transaction } from '@/lib/transaction.types';

function makeTxn(overrides: Partial<Transaction> & { id: string }): Transaction {
  return {
    accountId: 'acc1',
    date: '2026-07-25',
    amount: -100,
    source: 'manual',
    createdAt: '2026-07-25T00:00:00Z',
    ...overrides,
  };
}

function pageOf(content: Transaction[]): PagedTransaction {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    size: content.length,
    number: 0,
    first: true,
    last: true,
    empty: content.length === 0,
  };
}

describe('getObligationLinkedCount', () => {
  it('counts only selected transactions that carry at least one obligationRef', () => {
    const withRef = makeTxn({
      id: 't-ref',
      obligationRefs: [{ kind: 'LENDING', id: 'r1', label: 'Rahul Sharma' }],
    });
    const withoutRef = makeTxn({ id: 't-plain' });
    const pagedData = pageOf([withRef, withoutRef]);

    expect(getObligationLinkedCount(pagedData, ['t-ref', 't-plain'])).toBe(1);
  });

  it('ignores obligation-linked transactions that are not selected', () => {
    const withRef = makeTxn({
      id: 't-ref',
      obligationRefs: [{ kind: 'LOAN_PAYMENT', id: 'r1', label: 'EMI #2' }],
    });
    const otherWithRef = makeTxn({
      id: 't-ref-2',
      obligationRefs: [{ kind: 'LENDING', id: 'r2', label: 'Priya Singh' }],
    });
    const pagedData = pageOf([withRef, otherWithRef]);

    // Only t-ref is selected; t-ref-2 carries a ref too but must not be counted.
    expect(getObligationLinkedCount(pagedData, ['t-ref'])).toBe(1);
  });

  it('returns zero when no selected transaction carries an obligationRef', () => {
    const pagedData = pageOf([makeTxn({ id: 't1' }), makeTxn({ id: 't2' })]);

    expect(getObligationLinkedCount(pagedData, ['t1', 't2'])).toBe(0);
  });

  it('returns zero when there is no paged data', () => {
    expect(getObligationLinkedCount(null, ['t1'])).toBe(0);
  });

  it('returns zero when no ids are selected', () => {
    const pagedData = pageOf([
      makeTxn({ id: 't1', obligationRefs: [{ kind: 'LENDING', id: 'r1', label: 'X' }] }),
    ]);

    expect(getObligationLinkedCount(pagedData, [])).toBe(0);
  });
});

describe('buildReviewFilters date range', () => {
  it('adds a between clause for a deep-linked period and nothing without one', async () => {
    const { buildReviewFilters } = await import('@/components/transactions/review-browser/reviewBrowser.helpers');
    const base = { activeReasonFilter: 'ALL', appliedAccountIds: ['acc1'], selectableAccountsCount: 1, appliedOnlyUpToLastStatement: false };
    expect(buildReviewFilters(base).some((f) => f.field === 'date')).toBe(false);
    expect(buildReviewFilters({ ...base, dateRange: { from: '2026-09-01', to: '2026-09-30' } })).toContainEqual({
      field: 'date',
      operator: 'between',
      value: { from: '2026-09-01', to: '2026-09-30' },
    });
    expect(buildReviewFilters({ ...base, dateRange: null }).some((f) => f.field === 'date')).toBe(false);
  });
});

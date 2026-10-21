import { describe, expect, it } from 'vitest';

import { buildFilters, buildSearchBody, NEEDS_REVIEW_BODY, searchPaging } from './transactionsRequest';
import { ALL_TIME, DEFAULT_QUERY, type TransactionsQuery } from './transactionsUrl';

const q = (over: Partial<TransactionsQuery>): TransactionsQuery => ({ ...DEFAULT_QUERY, period: ALL_TIME, ...over });

describe('buildFilters', () => {
  it('sends nothing for all time and no filters', () => {
    expect(buildFilters(q({}))).toEqual([]);
  });

  it('maps Last 14 days to last_x_days with 14', () => {
    expect(buildFilters(DEFAULT_QUERY)).toEqual([{ field: 'date', operator: 'last_x_days', value: { amount: 14 } }]);
  });

  it('maps the other periods', () => {
    expect(buildFilters(q({ period: { kind: 'preset', id: 'this_month' } }))).toEqual([{ field: 'date', operator: 'this_month' }]);
    expect(buildFilters(q({ period: { kind: 'date', date: '2026-10-05' } }))).toEqual([{ field: 'date', operator: 'is', value: '2026-10-05' }]);
    expect(buildFilters(q({ period: { kind: 'range', from: '2026-10-01', to: '2026-10-09' } }))).toEqual([
      { field: 'date', operator: 'between', value: { from: '2026-10-01', to: '2026-10-09' } },
    ]);
  });

  it('uses is for one account or category and in for several', () => {
    expect(buildFilters(q({ accounts: ['a1'], categories: ['Rent'] }))).toEqual([
      { field: 'accountId', operator: 'is', value: 'a1' },
      { field: 'category', operator: 'is', value: 'Rent' },
    ]);
    expect(buildFilters(q({ accounts: ['a1', 'a2'], categories: ['Rent', 'Food'] }))).toEqual([
      { field: 'accountId', operator: 'in', value: ['a1', 'a2'] },
      { field: 'category', operator: 'in', value: ['Rent', 'Food'] },
    ]);
  });

  it('maps type, review, reason and the boolean filters including Up to statement', () => {
    expect(
      buildFilters(
        q({ type: 'credit', review: 'NEEDS_REVIEW', reason: 'DATE_CORRECTED', monitoring: true, excluded: true, upToStatement: true, source: 'manual' }),
      ),
    ).toEqual([
      { field: 'type', operator: 'is', value: 'CREDIT' },
      { field: 'reviewType', operator: 'is', value: 'NEEDS_REVIEW' },
      { field: 'reviewReason', operator: 'is', value: 'DATE_CORRECTED' },
      { field: 'isUnderMonitoring', operator: 'is', value: true },
      { field: 'isExcluded', operator: 'is', value: true },
      { field: 'coveredByStatement', operator: 'is', value: true },
      { field: 'source', operator: 'is', value: 'manual' },
    ]);
  });

  it('maps every amount condition', () => {
    expect(buildFilters(q({ amount: { op: 'greater_than', from: 500, to: null } }))).toEqual([{ field: 'amount', operator: 'greater_than', value: 500 }]);
    expect(buildFilters(q({ amount: { op: 'less_than', from: null, to: 90 } }))).toEqual([{ field: 'amount', operator: 'less_than', value: 90 }]);
    expect(buildFilters(q({ amount: { op: 'between', from: 1, to: 2 } }))).toEqual([
      { field: 'amount', operator: 'between', value: { from: 1, to: 2 } },
    ]);
  });
});

describe('search body and paging', () => {
  it('carries the search text, trimmed away when empty', () => {
    expect(buildSearchBody(q({ q: 'swiggy' })).search).toBe('swiggy');
    expect(buildSearchBody(q({})).search).toBeUndefined();
  });

  it('maps sort, page and size', () => {
    expect(searchPaging(q({ sort: 'lowest', page: 2, size: 25 }))).toEqual({ page: 2, size: 25, sort: ['amount,asc'] });
    expect(searchPaging(q({}))).toEqual({ page: 0, size: 50, sort: ['date,desc'] });
  });

  it('counts needs review with only that filter', () => {
    expect(NEEDS_REVIEW_BODY.filters).toEqual([{ field: 'reviewType', operator: 'is', value: 'NEEDS_REVIEW' }]);
  });
});

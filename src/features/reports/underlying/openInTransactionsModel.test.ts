import { describe, expect, it } from 'vitest';

import { DEFAULT_QUERY, transactionsUrl } from '@/features/transactions/list/transactionsUrl';
import { CATEGORY_LIST_FIXTURE as LIST } from '@/lib/categoryList.fixtures';
import type { FilterClause } from '@/lib/reports.types';

import { transactionsQueryFor } from './openInTransactionsModel';

const TODAY = '2026-11-19';
const run = (filters: FilterClause[], today = TODAY) => transactionsQueryFor(filters, LIST, today);
const clause = (field: string, operator: string, value?: FilterClause['value']): FilterClause => ({ field, operator, value });

describe('transactionsQueryFor: no filters', () => {
  it('is the unfiltered default query', () => {
    expect(run([])).toEqual(DEFAULT_QUERY);
  });
});

describe('transactionsQueryFor: date', () => {
  const period = (f: FilterClause) => run([f])?.period;

  it.each([
    'today', 'yesterday', 'this_week', 'previous_week', 'this_month', 'previous_month', 'this_year', 'current_fy', 'prev_fy', 'all_time',
  ])('maps %s to the preset of the same name', (op) => {
    expect(period(clause('date', op))).toEqual({ kind: 'preset', id: op });
  });

  it('maps the last 14 days to its preset', () => {
    expect(period(clause('date', 'last_x_days', { amount: 14 }))).toEqual({ kind: 'preset', id: 'last_14_days' });
  });

  it('maps other last-N-days to a range ending today', () => {
    expect(period(clause('date', 'last_x_days', { amount: 30 }))).toEqual({ kind: 'range', from: '2026-10-21', to: TODAY });
    expect(period(clause('date', 'last_x_days', { amount: 1 }))).toEqual({ kind: 'range', from: TODAY, to: TODAY });
  });

  it('maps last N months like the report does: the day after N months back, to today', () => {
    expect(period(clause('date', 'last_x_months', { amount: 6 }))).toEqual({ kind: 'range', from: '2026-05-20', to: TODAY });
    expect(period(clause('date', 'last_x_months', { amount: 12 }))).toEqual({ kind: 'range', from: '2025-11-20', to: TODAY });
  });

  it('clamps the month end when counting months back', () => {
    expect(period(clause('date', 'last_x_months', { amount: 1 }))).toEqual({ kind: 'range', from: '2026-10-20', to: TODAY });
    expect(run([clause('date', 'last_x_months', { amount: 1 })], '2026-03-31')?.period).toEqual({ kind: 'range', from: '2026-03-01', to: '2026-03-31' });
  });

  it('maps last N years', () => {
    expect(period(clause('date', 'last_x_years', { amount: 2 }))).toEqual({ kind: 'range', from: '2024-11-20', to: TODAY });
  });

  it('maps next N days to a range starting today', () => {
    expect(period(clause('date', 'next_x_days', { amount: 7 }))).toEqual({ kind: 'range', from: TODAY, to: '2026-11-25' });
  });

  it('maps the previous calendar year to its range', () => {
    expect(period(clause('date', 'previous_year'))).toEqual({ kind: 'range', from: '2025-01-01', to: '2025-12-31' });
  });

  it('maps a single date and a from/to range', () => {
    expect(period(clause('date', 'is', '2026-10-05'))).toEqual({ kind: 'date', date: '2026-10-05' });
    expect(period(clause('date', 'between', { from: '2026-10-01', to: '2026-10-31' }))).toEqual({ kind: 'range', from: '2026-10-01', to: '2026-10-31' });
  });

  it.each([
    clause('date', 'last_x_days'),
    clause('date', 'last_x_days', { amount: 0 }),
    clause('date', 'last_x_days', { amount: 1.5 }),
    clause('date', 'last_x_months', { amount: -2 }),
    clause('date', 'is', 'not a date'),
    clause('date', 'is', '2026-02-30'),
    clause('date', 'between', { from: '2026-11-01', to: '2026-10-01' }),
    clause('date', 'between', { from: '2026-10-01', to: 'x' }),
    clause('date', 'between', '2026-10-01'),
    clause('date', 'after', '2026-10-01'),
    clause('date', 'before', '2026-10-01'),
    clause('date', 'this_billing_cycle'),
    clause('settlementDate', 'this_month'),
  ])('has no query for %j', (f) => {
    expect(run([f])).toBeNull();
  });

  it('has no query for two date clauses', () => {
    expect(run([clause('date', 'this_month'), clause('date', 'is', '2026-10-05')])).toBeNull();
  });
});

describe('transactionsQueryFor: account and type', () => {
  it('maps account ids from is and in, once each', () => {
    expect(run([clause('account', 'is', '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b')])?.accounts).toEqual(['3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b']);
    expect(run([clause('account', 'in', ['3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b', '9a8b7c6d-1e2f-4a3b-8c9d-0e1f2a3b4c5d', '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b'])])?.accounts).toEqual(['3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b', '9a8b7c6d-1e2f-4a3b-8c9d-0e1f2a3b4c5d']);
  });

  it('maps type to debit or credit', () => {
    expect(run([clause('type', 'is', 'DEBIT')])?.type).toBe('debit');
    expect(run([clause('type', 'is', 'CREDIT')])?.type).toBe('credit');
    expect(run([clause('type', 'in', ['CREDIT'])])?.type).toBe('credit');
    expect(run([clause('type', 'in', ['DEBIT', 'CREDIT'])])?.type).toBe('all');
  });

  it('has no query for an unknown type value or a negated operator', () => {
    expect(run([clause('type', 'is', 'TRANSFER')])).toBeNull();
    expect(run([clause('type', 'is_not', 'DEBIT')])).toBeNull();
    expect(run([clause('account', 'is_not', '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b')])).toBeNull();
    expect(run([clause('account', 'not_in', ['3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b'])])).toBeNull();
  });

  it('has no query for an account or type clause without a usable value', () => {
    expect(run([clause('account', 'is', 5)])).toBeNull();
    expect(run([clause('account', 'in', [])])).toBeNull();
    expect(run([clause('account', 'in', 'a1')])).toBeNull();
  });

  it('has no query for an account name, or a name among ids', () => {
    expect(run([clause('account', 'is', 'HDFC Savings')])).toBeNull();
    expect(run([clause('account', 'in', ['HDFC Savings'])])).toBeNull();
    expect(run([clause('account', 'in', ['3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b', 'HDFC Savings'])])).toBeNull();
  });

  it('has no query for two clauses on one field', () => {
    expect(run([clause('account', 'is', '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b'), clause('account', 'is', '9a8b7c6d-1e2f-4a3b-8c9d-0e1f2a3b4c5d')])).toBeNull();
    expect(run([clause('type', 'is', 'DEBIT'), clause('type', 'is', 'CREDIT')])).toBeNull();
  });
});

describe('transactionsQueryFor: category', () => {
  it('maps a key, a name and a list of both', () => {
    expect(run([clause('category', 'is', 'food')])?.categories).toEqual(['food']);
    expect(run([clause('category', 'is', 'Food')])?.categories).toEqual(['food']);
    expect(run([clause('category', 'in', ['food', 'Transport', 'Food'])])?.categories).toEqual(['food', 'transport']);
  });

  it('maps Uncategorized to the uncategorized flag, alone or beside categories', () => {
    expect(run([clause('category', 'is', 'Uncategorized')])).toMatchObject({ uncategorized: true, categories: [] });
    expect(run([clause('category', 'in', ['Uncategorized', 'food'])])).toMatchObject({ uncategorized: true, categories: ['food'] });
  });

  it('has no query for an unknown category or a negated operator', () => {
    expect(run([clause('category', 'is', 'Nope')])).toBeNull();
    expect(run([clause('category', 'is_not', 'food')])).toBeNull();
    expect(run([clause('category', 'not_in', ['food'])])).toBeNull();
  });

  it('has no query for a category before the list has loaded', () => {
    expect(transactionsQueryFor([clause('category', 'is', 'food')], [])).toBeNull();
  });
});

describe('transactionsQueryFor: sub-category', () => {
  it('maps a key and a "Category · Sub" label', () => {
    expect(run([clause('subcategory', 'is', 'food.delivery')])?.subcategories).toEqual(['food.delivery']);
    expect(run([clause('subcategory', 'is', 'Food · Delivery')])?.subcategories).toEqual(['food.delivery']);
    expect(run([clause('subcategory', 'in', ['Food · Delivery', 'transport.cabs', 'food.delivery'])])?.subcategories).toEqual(['food.delivery', 'transport.cabs']);
  });

  it('maps Uncategorized in a sub-category clause to the uncategorized flag', () => {
    expect(run([clause('subcategory', 'is', 'Uncategorized')])).toMatchObject({ uncategorized: true, subcategories: [] });
  });

  it('has no query for "Category · Others", on its own or in a list', () => {
    expect(run([clause('subcategory', 'is', 'Food · Others')])).toBeNull();
    expect(run([clause('subcategory', 'in', ['Food · Delivery', 'Food · Others'])])).toBeNull();
  });

  it('has no query for an unknown sub-category, a bare sub name or a negated operator', () => {
    expect(run([clause('subcategory', 'is', 'Food · Nope')])).toBeNull();
    expect(run([clause('subcategory', 'is', 'Delivery')])).toBeNull();
    expect(run([clause('subcategory', 'is_not', 'food.delivery')])).toBeNull();
  });
});

describe('transactionsQueryFor: category with sub-category', () => {
  it('keeps both when the sub-category narrows the category', () => {
    expect(run([clause('category', 'is', 'food'), clause('subcategory', 'is', 'Food · Delivery')])).toMatchObject({
      categories: ['food'],
      subcategories: ['food.delivery'],
    });
  });

  it('keeps both when every category is narrowed by one of its sub-categories', () => {
    expect(run([clause('category', 'in', ['food', 'transport']), clause('subcategory', 'in', ['food.dining', 'transport.cabs'])])).toMatchObject({
      categories: ['food', 'transport'],
      subcategories: ['food.dining', 'transport.cabs'],
    });
  });

  it('has no query when a category would stay whole next to a narrowed one', () => {
    expect(run([clause('category', 'in', ['food', 'transport']), clause('subcategory', 'is', 'food.dining')])).toBeNull();
  });

  it('has no query when a sub-category belongs to a category the report did not pick', () => {
    expect(run([clause('category', 'is', 'food'), clause('subcategory', 'is', 'transport.cabs')])).toBeNull();
  });

  it('has no query when Uncategorized is combined with the other', () => {
    expect(run([clause('category', 'is', 'Uncategorized'), clause('subcategory', 'is', 'food.delivery')])).toBeNull();
    expect(run([clause('category', 'is', 'food'), clause('subcategory', 'is', 'Uncategorized')])).toBeNull();
  });

  it('has no query when the pinned bucket is "Category · Others" under a category filter', () => {
    expect(run([clause('category', 'is', 'food'), clause('subcategory', 'is', 'Food · Others')])).toBeNull();
  });
});

describe('transactionsQueryFor: flags and other fields', () => {
  it.each([
    ['countsInTotals', true],
    ['isExcluded', false],
    ['isTransferLeg', false],
  ])('leaves out %s when it only hides left-out rows', (field, value) => {
    expect(run([clause(field, 'is', value)])).toEqual(DEFAULT_QUERY);
    expect(run([clause(field, 'is', value), clause('type', 'is', 'DEBIT')])).toMatchObject({ type: 'debit' });
  });

  it('leaves out all three together', () => {
    expect(run([clause('countsInTotals', 'is', true), clause('isExcluded', 'is', false), clause('isTransferLeg', 'is', false)])).toEqual(DEFAULT_QUERY);
  });

  it.each([
    ['countsInTotals', 'is', false],
    ['isExcluded', 'is', true],
    ['isTransferLeg', 'is', true],
    ['countsInTotals', 'is_not', true],
    ['isExcluded', 'is_not', false],
    ['isTransferLeg', 'is_not', false],
  ])('has no query for %s %s %s', (field, operator, value) => {
    expect(run([clause(field, operator, value)])).toBeNull();
    expect(run([clause('type', 'is', 'DEBIT'), clause(field, operator, value)])).toBeNull();
  });

  it('has no query for a tag filter', () => {
    expect(run([clause('tag', 'is', 'Trip')])).toBeNull();
    expect(run([clause('tag', 'in', ['Trip'])])).toBeNull();
  });

  it('has no query for any other field, even beside mappable ones', () => {
    expect(run([clause('description', 'contains', 'rent')])).toBeNull();
    expect(run([clause('isRefundLeg', 'is', false)])).toBeNull();
    expect(run([clause('date', 'this_month'), clause('amount', 'greater_than', 100)])).toBeNull();
  });
});

describe('transactionsQueryFor: the link', () => {
  it('builds the URL a category bar of a monthly report opens', () => {
    const query = run([clause('date', 'this_month'), clause('countsInTotals', 'is', true), clause('category', 'is', 'Food')]);
    expect(query && transactionsUrl(query)).toBe('/transactions?period=this_month&category=food');
  });

  it('builds the URL of a sub-category bar with a custom range', () => {
    const query = run([clause('date', 'between', { from: '2026-10-01', to: '2026-10-31' }), clause('subcategory', 'is', 'Food · Delivery'), clause('type', 'is', 'DEBIT')]);
    expect(query && transactionsUrl(query)).toBe('/transactions?from=2026-10-01&to=2026-10-31&subcategory=food.delivery&type=debit');
  });
});

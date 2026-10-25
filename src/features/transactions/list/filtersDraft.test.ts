import { describe, expect, it } from 'vitest';

import type { Account } from '@/lib/account.types';

import { activeFilterCount, activeFilterWords, amountLabel, filterAccounts, periodLabel, REASON_OPTIONS } from './filterOptions';
import { amountFromDraft, draftFromQuery, queryFromDraft } from './filtersDraft';
import { ALL_TIME, DEFAULT_QUERY } from './transactionsUrl';

describe('draft', () => {
  it('opens on the query and writes it back unchanged', () => {
    const q = { ...DEFAULT_QUERY, page: 3, review: 'NEEDS_REVIEW' as const, source: 'manual' as const, excluded: true, sort: 'oldest' as const };
    expect(queryFromDraft(q, draftFromQuery(q))).toEqual({ ...q, page: 0 });
  });

  it('applies a range, a single date, and falls back to the preset when they are empty', () => {
    const d = draftFromQuery(DEFAULT_QUERY);
    expect(queryFromDraft(DEFAULT_QUERY, { ...d, periodMode: 'range', from: '2026-10-09', to: '2026-10-01' }).period).toEqual({
      kind: 'range',
      from: '2026-10-01',
      to: '2026-10-09',
    });
    expect(queryFromDraft(DEFAULT_QUERY, { ...d, periodMode: 'date', date: '2026-10-05' }).period).toEqual({ kind: 'date', date: '2026-10-05' });
    expect(queryFromDraft(DEFAULT_QUERY, { ...d, periodMode: 'date', date: '', preset: 'this_year' }).period).toEqual({ kind: 'preset', id: 'this_year' });
    expect(queryFromDraft(DEFAULT_QUERY, { ...d, preset: 'all_time' }).period).toEqual(ALL_TIME);
  });

  it('builds amount conditions from the typed fields', () => {
    expect(amountFromDraft({ amountOp: 'greater_than', amountFrom: '1,500', amountTo: '' })).toEqual({ op: 'greater_than', from: 1500, to: null });
    expect(amountFromDraft({ amountOp: 'less_than', amountFrom: '9', amountTo: '20' })).toEqual({ op: 'less_than', from: null, to: 20 });
    expect(amountFromDraft({ amountOp: 'between', amountFrom: '50', amountTo: '10' })).toEqual({ op: 'between', from: 10, to: 50 });
    expect(amountFromDraft({ amountOp: 'between', amountFrom: '50', amountTo: '' })).toBeNull();
    expect(amountFromDraft({ amountOp: 'greater_than', amountFrom: '', amountTo: '' })).toBeNull();
  });
});

describe('labels', () => {
  it('writes periods and amounts', () => {
    expect(periodLabel({ kind: 'range', from: '2026-10-01', to: '2026-10-09' })).toBe('01/10/2026 – 09/10/2026');
    expect(periodLabel({ kind: 'date', date: '2026-10-05' })).toBe('05/10/2026');
    expect(periodLabel({ kind: 'preset', id: 'last_14_days' })).toBe('Last 14 days');
    expect(amountLabel({ op: 'between', from: 500, to: 5000 })).toBe('₹500 – ₹5,000');
    expect(amountLabel({ op: 'greater_than', from: 99.5, to: null })).toBe('Over ₹99.50');
  });

  it('lists the four server reasons, Date corrected included, and no Other', () => {
    expect(REASON_OPTIONS.map((o) => o.label)).toEqual(['All reasons', 'Unreconciled', 'Category unverified', 'Possible duplicate', 'Date corrected']);
  });

  it('describes the active filters for the no-match state', () => {
    expect(activeFilterWords({ ...DEFAULT_QUERY, period: { kind: 'preset', id: 'last_14_days' }, source: 'manual', excluded: true })).toBe('Last 14 days · excluded only · manual');
    expect(activeFilterWords({ ...DEFAULT_QUERY, period: ALL_TIME, q: 'zz', accounts: ['a', 'b'] })).toBe('“zz” · 2 accounts');
  });
});

describe('filterAccounts', () => {
  const accounts = [
    { id: 'b1', name: 'HDFC Savings', type: 'bank_account' },
    { id: 'k1', name: 'Zerodha', type: 'broker' },
    { id: 'k2', name: 'Groww', type: 'broker' },
  ] as unknown as Account[];

  it('lists no broker when none is picked', () => {
    expect(filterAccounts([], accounts).map((a) => a.id)).toEqual(['b1']);
  });

  it('lists only the picked brokers', () => {
    expect(filterAccounts(['k1'], accounts).map((a) => a.id)).toEqual(['b1', 'k1']);
  });
});

describe('every chip-row filter lives in the draft', () => {
  const full = {
    ...DEFAULT_QUERY,
    accounts: ['a1', 'a2'],
    categories: ['Groceries'],
    type: 'debit' as const,
    reason: 'UNRECONCILED' as const,
    monitoring: true,
    upToStatement: true,
  };

  it('round-trips accounts, categories, type, reason, monitoring and up to statement', () => {
    expect(queryFromDraft(DEFAULT_QUERY, draftFromQuery(full))).toEqual(full);
  });

  it('counts the active filters, not the search', () => {
    expect(activeFilterCount(DEFAULT_QUERY)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_QUERY, q: 'zz' })).toBe(0);
    expect(activeFilterCount({ ...full, period: { kind: 'preset', id: 'last_14_days' }, source: 'manual' })).toBe(8);
  });
});

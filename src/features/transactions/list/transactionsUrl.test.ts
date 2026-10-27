import { describe, expect, it } from 'vitest';

import {
  ALL_TIME,
  clearedQuery,
  DEFAULT_QUERY,
  isUnfiltered,
  parseTransactionsUrl,
  type TransactionsQuery,
  transactionsSearch,
  transactionsUrl,
} from './transactionsUrl';

const roundTrip = (q: TransactionsQuery) => parseTransactionsUrl(Object.fromEntries(groupParams(transactionsSearch(q))));

function groupParams(search: string): [string, string | string[]][] {
  const out = new Map<string, string[]>();
  for (const [k, v] of new URLSearchParams(search)) out.set(k, [...(out.get(k) ?? []), v]);
  return [...out].map(([k, v]) => [k, v.length === 1 ? v[0] : v]);
}

describe('parseTransactionsUrl', () => {
  it('defaults to all time, newest, page one of 25', () => {
    expect(parseTransactionsUrl({})).toEqual(DEFAULT_QUERY);
    expect(DEFAULT_QUERY.period).toEqual(ALL_TIME);
    expect(DEFAULT_QUERY.size).toBe(25);
  });

  it('reads the account param an account page links with', () => {
    expect(parseTransactionsUrl({ account: 'a1' }).accounts).toEqual(['a1']);
    expect(parseTransactionsUrl({ account: ['a1', 'a2', 'a1'] }).accounts).toEqual(['a1', 'a2']);
  });

  it('reads periods: preset, all time, single date, range (swapped if reversed)', () => {
    expect(parseTransactionsUrl({ period: 'this_year' }).period).toEqual({ kind: 'preset', id: 'this_year' });
    expect(parseTransactionsUrl({ period: 'all_time' }).period).toEqual(ALL_TIME);
    expect(parseTransactionsUrl({ date: '2026-10-05' }).period).toEqual({ kind: 'date', date: '2026-10-05' });
    expect(parseTransactionsUrl({ from: '2026-10-09', to: '2026-10-01' }).period).toEqual({
      kind: 'range',
      from: '2026-10-01',
      to: '2026-10-09',
    });
  });

  it('drops invalid values back to their defaults', () => {
    const q = parseTransactionsUrl({
      period: 'last_90_days',
      date: '2026-02-31',
      from: '2026-10-01',
      type: 'x',
      review: 'nope',
      source: 'telepathy',
      sort: 'random',
      page: '-3',
      size: '7',
      amount: 'gt',
      amountFrom: 'abc',
    });
    expect(q).toEqual(DEFAULT_QUERY);
  });

  it('drops a reason the server does not know, such as other', () => {
    expect(parseTransactionsUrl({ reason: 'other' }).reason).toBeNull();
    expect(parseTransactionsUrl({ reason: 'date_corrected' }).reason).toBe('DATE_CORRECTED');
  });

  it('reads amount conditions and orders Between', () => {
    expect(parseTransactionsUrl({ amount: 'gt', amountFrom: '500' }).amount).toEqual({ op: 'greater_than', from: 500, to: null });
    expect(parseTransactionsUrl({ amount: 'lt', amountTo: '99.5' }).amount).toEqual({ op: 'less_than', from: null, to: 99.5 });
    expect(parseTransactionsUrl({ amount: 'between', amountFrom: '5000', amountTo: '500' }).amount).toEqual({
      op: 'between',
      from: 500,
      to: 5000,
    });
    expect(parseTransactionsUrl({ amount: 'between', amountFrom: '5' }).amount).toBeNull();
  });
});

describe('transactionsUrl', () => {
  it('leaves defaults out', () => {
    expect(transactionsSearch(DEFAULT_QUERY)).toBe('');
    expect(transactionsUrl(DEFAULT_QUERY)).toBe('/transactions');
  });

  it('leaves all time out and writes Last 14 days explicitly', () => {
    expect(transactionsSearch({ ...DEFAULT_QUERY, period: ALL_TIME })).toBe('');
    expect(transactionsSearch({ ...DEFAULT_QUERY, period: { kind: 'preset', id: 'last_14_days' } })).toBe('period=last_14_days');
  });

  it('round-trips every field', () => {
    const q: TransactionsQuery = {
      q: 'swiggy & co',
      period: { kind: 'range', from: '2026-10-01', to: '2026-10-09' },
      accounts: ['a1', 'a2'],
      categories: ['Food & dining', 'Rent'],
      uncategorized: false,
      type: 'debit',
      amount: { op: 'between', from: 500, to: 5000 },
      review: 'NEEDS_REVIEW',
      reason: 'UNRECONCILED',
      monitoring: true,
      upToStatement: true,
      excluded: true,
      source: 'gmail_statement',
      txn: null,
      sort: 'highest',
      page: 2,
      size: 100,
    };
    expect(roundTrip(q)).toEqual(q);
    expect(roundTrip({ ...q, period: { kind: 'date', date: '2026-10-05' }, amount: { op: 'less_than', from: null, to: 9 } })).toEqual({
      ...q,
      period: { kind: 'date', date: '2026-10-05' },
      amount: { op: 'less_than', from: null, to: 9 },
    });
  });

  it('keeps a stable param order', () => {
    const a = transactionsSearch({ ...DEFAULT_QUERY, page: 1, type: 'credit', q: 'x' });
    expect(a).toBe('q=x&type=credit&page=1');
  });
});

describe('clearedQuery and isUnfiltered', () => {
  it('clears search and filters to all time, keeping sort and size', () => {
    const q = { ...DEFAULT_QUERY, q: 'x', accounts: ['a'], sort: 'oldest' as const, size: 25, page: 3 };
    expect(clearedQuery(q)).toEqual({ ...DEFAULT_QUERY, period: ALL_TIME, sort: 'oldest', size: 25 });
  });

  it('is unfiltered only for all time with nothing else', () => {
    expect(isUnfiltered(DEFAULT_QUERY)).toBe(true);
    expect(isUnfiltered({ ...DEFAULT_QUERY, period: { kind: 'preset', id: 'last_14_days' } })).toBe(false);
    expect(isUnfiltered({ ...DEFAULT_QUERY, period: ALL_TIME })).toBe(true);
    expect(isUnfiltered({ ...DEFAULT_QUERY, period: ALL_TIME, page: 4, sort: 'lowest' })).toBe(true);
    expect(isUnfiltered({ ...DEFAULT_QUERY, period: ALL_TIME, q: 'a' })).toBe(false);
  });
});

describe('txn deep link', () => {
  const ID = '11111111-2222-3333-4444-555555555555';

  it('parses a transaction id and drops anything that is not one', () => {
    expect(parseTransactionsUrl({ txn: ID }).txn).toBe(ID);
    expect(parseTransactionsUrl({ txn: ` ${ID} ` }).txn).toBe(ID);
    expect(parseTransactionsUrl({ txn: 'a b/c' }).txn).toBeNull();
    expect(parseTransactionsUrl({ txn: 'x'.repeat(65) }).txn).toBeNull();
    expect(parseTransactionsUrl({}).txn).toBeNull();
  });

  it('builds the link, and writes nothing without one', () => {
    expect(transactionsUrl({ ...DEFAULT_QUERY, txn: ID })).toBe(`/transactions?txn=${ID}`);
    expect(transactionsUrl({ ...DEFAULT_QUERY, txn: null })).toBe('/transactions');
  });
});

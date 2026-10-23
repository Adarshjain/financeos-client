import { describe, expect, it } from 'vitest';

import type { Account } from '@/lib/account.types';
import type { Transaction } from '@/lib/transaction.types';

import { dayHeader, linkWords, monthBand, monthLabel, reviewWords, transactionRow, transactionRows, weekdayOf } from './transactionRows';

const t = (over: Partial<Transaction> = {}): Transaction =>
  ({
    id: 't1',
    accountId: 'a1',
    date: '2026-10-12',
    amount: -3600,
    description: 'BigBasket',
    source: 'manual',
    createdAt: '',
    balance: 295030,
    categories: [{ id: 'c1', name: 'Groceries' }],
    ...over,
  }) as Transaction;

const accounts = [{ id: 'a1', name: 'HDFC Bank Savings' }] as Account[];
const ctx = { accounts, showSource: false };

describe('transactionRow', () => {
  it('formats a debit and a credit with Indian grouping', () => {
    const debit = transactionRow(t(), ctx);
    expect(debit).toMatchObject({ formattedAmount: '3,600.00', isCredit: false, date: '12 Oct', weekday: 'Mon', balance: '₹2,95,030', account: 'HDFC Bank Savings', category: 'Groceries' });
    expect(transactionRow(t({ amount: 215000 }), ctx)).toMatchObject({ formattedAmount: '+2,15,000.00', isCredit: true });
  });

  it('puts the minus before the rupee sign on a negative balance', () => {
    expect(transactionRow(t({ balance: -210150 }), ctx).balance).toBe('-₹2,10,150');
  });

  it('falls back to the bank text, then a dash', () => {
    expect(transactionRow(t({ description: null, sourcedDescription: 'UPI/SWIGGY' }), ctx).description).toBe('UPI/SWIGGY');
    expect(transactionRow(t({ description: null }), ctx).description).toBe('—');
  });

  it('keeps an excluded row free of categories and balance, with the Excluded word', () => {
    const row = transactionRow(t({ isTransactionExcluded: true }), ctx);
    expect(row).toMatchObject({ excluded: true, categories: [], balance: undefined, provenance: 'Excluded' });
  });

  it('shows no category chip list entry when none is set, and +n sources from all categories', () => {
    expect(transactionRow(t({ categories: [] }), ctx).categories).toEqual([]);
    const two = transactionRow(t({ categories: [{ id: 'a', name: 'Shopping' }, { id: 'b', name: 'Subs' }] as Transaction['categories'] }), ctx);
    expect(two.categories).toEqual(['Shopping', 'Subs']);
  });

  it('shows where it came from only when asked; uploads show nothing', () => {
    expect(transactionRow(t({ source: 'gmail_statement' }), { accounts, showSource: true }).provenance).toBe('Statement');
    expect(transactionRow(t({ source: 'gmail_transaction_alert' }), { accounts, showSource: true }).provenance).toBe('Gmail');
    expect(transactionRow(t({ source: 'file_upload' }), { accounts, showSource: true }).provenance).toBeUndefined();
    expect(transactionRow(t({ source: 'manual' }), ctx).provenance).toBeUndefined();
  });

  it('names an unknown account, and leaves it out when accounts did not load', () => {
    expect(transactionRow(t({ accountId: 'zz' }), ctx).account).toBe('Unknown');
    expect(transactionRow(t(), { accounts: null, showSource: false }).account).toBeUndefined();
  });

  it('carries the account bank id, and none for an account with no bank or when accounts did not load', () => {
    const withBank = [{ id: 'a1', name: 'HDFC Savings', type: 'bank_account', bank: 'hdfc' }] as unknown as typeof accounts;
    expect(transactionRow(t(), { accounts: withBank, showSource: false }).bankId).toBe('hdfc');
    const noBank = [{ id: 'a1', name: 'Cash', type: 'generic' }] as unknown as typeof accounts;
    expect(transactionRow(t(), { accounts: noBank, showSource: false }).bankId).toBeUndefined();
    expect(transactionRow(t({ accountId: 'zz' }), ctx).bankId).toBeUndefined();
    expect(transactionRow(t(), { accounts: null, showSource: false }).bankId).toBeUndefined();
  });

  it('shows the plastic unless it is the holder own card', () => {
    expect(transactionRow(t({ cardLast4: '7742', cardLabel: 'Meera' }), ctx).plastic).toBe('Meera · ••7742');
    expect(transactionRow(t({ cardLast4: '3356' }), ctx).plastic).toBe('••3356');
    expect(transactionRow(t({ cardLast4: '3356', cardLabel: 'You' }), ctx).plastic).toBeUndefined();
  });

  it('maps a list', () => {
    expect(transactionRows([t(), t({ id: 't2' })], ctx).map((r) => r.id)).toEqual(['t1', 't2']);
  });
});

describe('reviewWords', () => {
  it('has none when nothing needs review', () => {
    expect(reviewWords(t({ reviewType: 'AUTO_REVIEWED', reviewReasons: ['UNRECONCILED'] }))).toBeUndefined();
  });
  it('writes one word per reason, or Needs review with none', () => {
    expect(reviewWords(t({ reviewType: 'NEEDS_REVIEW', reviewReasons: ['UNRECONCILED', 'DUPLICATE_SUSPECT'] }))).toBe('Unreconciled · Duplicate');
    expect(reviewWords(t({ reviewType: 'NEEDS_REVIEW', reviewReasons: ['DATE_CORRECTED', 'CATEGORY_UNVERIFIED'] }))).toBe('Date corrected · Category unverified');
    expect(reviewWords(t({ reviewType: 'NEEDS_REVIEW', reviewReasons: [] }))).toBe('Needs review');
  });
  it('adds Watching with its reason', () => {
    expect(reviewWords(t({ isTransactionUnderMonitoring: true }))).toBe('Watching');
    expect(reviewWords(t({ isTransactionUnderMonitoring: true, monitoringReason: 'Dispute' }))).toBe('Watching: Dispute');
    expect(transactionRow(t({ isTransactionUnderMonitoring: true }), ctx).watching).toBe(true);
  });
});

describe('linkWords', () => {
  it('says the role, with the group size above two, and the chain glyph for links', () => {
    expect(linkWords(t({ links: [{ linkId: 'l', type: 'TRANSFER', roleLabel: 'Transfer out', memberCount: 2 }] }))).toEqual({ label: 'Transfer out', isRecord: false });
    expect(linkWords(t({ links: [{ linkId: 'l', type: 'EMI', roleLabel: 'Purchase (EMI)', memberCount: 4 }] }))?.label).toBe('Purchase (EMI) (4)');
  });
  it('writes a record as a record, without the glyph', () => {
    expect(linkWords(t({ obligationRefs: [{ kind: 'LOAN_PAYMENT', id: 'x', label: 'EMI #8 · HDFC car loan' }] }))).toEqual({
      label: 'EMI #8 · HDFC car loan',
      isRecord: true,
    });
  });
  it('is empty with none', () => {
    expect(linkWords(t())).toBeUndefined();
  });
});

describe('grouping', () => {
  const row = transactionRow(t(), ctx);
  it('weekday and month names', () => {
    expect(weekdayOf('2026-10-12')).toBe('Mon');
    expect(monthLabel('2026-10-12')).toBe('October 2026');
  });
  it('bands by month and heads by day only in date order', () => {
    expect(monthBand(row, true)).toEqual({ key: '2026-10', label: 'October 2026' });
    expect(dayHeader(row, true)).toEqual({ key: '2026-10-12', label: '12 Oct', sublabel: 'Mon' });
    expect(monthBand(row, false)).toBeNull();
    expect(dayHeader(row, false)).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';

import type { DuplicateReviewItem, DuplicateReviewTransaction } from '@/lib/api/types';
import { formatDate, formatMoney } from '@/lib/format';

import { allPairsFound, duplicatesHeading, duplicateSideDetail, duplicateSideLine, pairsForSelection } from './duplicatesModel';

const tx = (over: Partial<DuplicateReviewTransaction> = {}): DuplicateReviewTransaction => ({
  id: 't1',
  date: '2026-10-10',
  amount: 450,
  description: 'UPI/Test Cafe/Lunch with the whole team',
  accountName: 'Test Savings',
  source: 'gmail_transaction_alert',
  ...over,
});

describe('duplicateSideLine', () => {
  it('gives date, amount, full description, account and source', () => {
    expect(duplicateSideLine(tx())).toEqual({
      date: formatDate('2026-10-10', 'list'),
      amount: formatMoney(450, { decimals: 'auto' }),
      description: 'UPI/Test Cafe/Lunch with the whole team',
      account: 'Test Savings',
      source: 'Gmail alert',
    });
  });
  it('words every null', () => {
    expect(duplicateSideLine(tx({ amount: null, description: null, accountName: null, source: null }))).toMatchObject({
      amount: '—',
      description: '(no description)',
      account: 'No account',
      source: 'Unknown source',
    });
    expect(duplicateSideLine(tx({ description: '  ', accountName: ' ' }))).toMatchObject({ description: '(no description)', account: 'No account' });
  });
  it('joins the detail line', () => {
    expect(duplicateSideDetail(tx())).toBe(`${formatDate('2026-10-10', 'list')} · ${formatMoney(450, { decimals: 'auto' })} · Test Savings · Gmail alert`);
  });
});

describe('pairsForSelection', () => {
  const items: DuplicateReviewItem[] = [{ transaction: tx({ id: 'a' }), twin: tx({ id: 'b' }) }, { transaction: tx({ id: 'c' }) }];
  it('keeps only the approved transactions, twin or not', () => {
    expect(pairsForSelection(items, new Set(['c']))).toEqual([items[1]]);
    expect(pairsForSelection(items, new Set())).toEqual([]);
    expect(pairsForSelection([], new Set(['a']))).toEqual([]);
  });
});

describe('small helpers', () => {
  it('knows when every pair was found', () => {
    expect(allPairsFound(2, 2)).toBe(true);
    expect(allPairsFound(1, 2)).toBe(false);
  });
  it('heads the list', () => {
    expect(duplicatesHeading(1)).toBe('Possible duplicate');
    expect(duplicatesHeading(3)).toBe('3 possible duplicates');
  });
});

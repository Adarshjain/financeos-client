import { describe, expect, it } from 'vitest';

import { pickerEmptyHint, pickerListItem, sharedNote, summaryAmount } from './pickerModel';

describe('summaryAmount', () => {
  it('prefers the signed amount', () => {
    expect(summaryAmount({ id: 't', date: '2026-09-13', accountId: 'a', signedAmount: 500, amount: -1 })).toBe(500);
  });
});

describe('pickerListItem', () => {
  const base = { id: 't', date: '2026-09-13', accountId: 'a' };
  it('titles with the description and reads date · account ••last4', () => {
    expect(pickerListItem({ ...base, description: 'IMPS from X', amount: -2300 }, { name: 'HDFC Savings', last4: '1234' })).toEqual({
      id: 't',
      title: 'IMPS from X',
      subtitle: '13 Sep · HDFC Savings ••1234',
      amount: '₹2,300',
      isCredit: false,
    });
  });
  it('leaves out the last4 when there is none and joins the note', () => {
    expect(pickerListItem({ ...base, description: 'X', amount: -1 }, { name: 'Axis' }, 'also linked to 2 ledger entries').subtitle).toBe(
      '13 Sep · Axis · also linked to 2 ledger entries',
    );
  });
  it('marks money in as credit and keeps paise', () => {
    const item = pickerListItem({ ...base, description: 'Salary', signedAmount: 50000.5 }, { name: 'HDFC' });
    expect(item.isCredit).toBe(true);
    expect(item.amount).toBe('₹50,000.50');
  });
  it('falls back to the sourced description, then to Transaction', () => {
    expect(pickerListItem({ ...base, sourcedDescription: 'UPI-ABC' }, { name: 'A' }).title).toBe('UPI-ABC');
    expect(pickerListItem(base, { name: 'A' }).title).toBe('Transaction');
  });
});

describe('sharedNote', () => {
  it('says how many ledger entries or dividends already share the row', () => {
    expect(sharedNote(2, 'LENDING', false)).toBe('also linked to 2 ledger entries');
    expect(sharedNote(1, 'LENDING', false)).toBe('also linked to 1 ledger entry');
    expect(sharedNote(1, 'DIVIDEND', false)).toBe('also linked to 1 dividend');
    expect(sharedNote(3, 'DIVIDEND', false)).toBe('also linked to 3 dividends');
  });

  it('says nothing for an exclusive link or an unshared row', () => {
    expect(sharedNote(2, 'LENDING', true)).toBeNull();
    expect(sharedNote(0, 'LENDING', false)).toBeNull();
  });
});

describe('pickerEmptyHint', () => {
  it('prefers the caller, then the direction', () => {
    expect(pickerEmptyHint('Only debits', 'lent')).toBe('Only debits');
    expect(pickerEmptyHint(undefined, 'lent')).toContain('money-out');
    expect(pickerEmptyHint(undefined, 'borrowed')).toContain('money-in');
    expect(pickerEmptyHint(undefined)).toBe('');
  });
});

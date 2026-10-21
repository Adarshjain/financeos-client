import { describe, expect, it } from 'vitest';

import { pickerEmptyHint, pickerRowLabel, sharedNote, summaryAmount } from './pickerModel';

describe('pickerRowLabel', () => {
  it('reads date · account · description · amount', () => {
    expect(
      pickerRowLabel({ id: 't', date: '2026-09-13', accountId: 'a', description: 'IMPS from X', amount: -2300 }, 'HDFC Savings'),
    ).toBe('13 Sep · HDFC Savings · IMPS from X · ₹2,300');
  });

  it('falls back to the sourced description, then to Transaction, and keeps paise', () => {
    expect(
      pickerRowLabel({ id: 't', date: '2026-09-13', accountId: 'a', sourcedDescription: 'UPI-ABC', signedAmount: -12.5 }, 'HDFC Savings'),
    ).toBe('13 Sep · HDFC Savings · UPI-ABC · ₹12.50');
    expect(pickerRowLabel({ id: 't', date: '2026-09-13', accountId: 'a' }, 'Axis')).toBe('13 Sep · Axis · Transaction · ₹0');
  });

  it('shows the amount without a sign for money in and out', () => {
    expect(summaryAmount({ id: 't', date: '2026-09-13', accountId: 'a', signedAmount: 500, amount: -1 })).toBe(500);
    expect(pickerRowLabel({ id: 't', date: '2026-09-13', accountId: 'a', description: 'Salary', amount: 50000 }, 'HDFC')).toContain('₹50,000');
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

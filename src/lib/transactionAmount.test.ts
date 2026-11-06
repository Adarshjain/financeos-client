import { describe, expect, it } from 'vitest';

import { absAmount, absAmountText, directionAmount, foreignAmountText, foreignChargedText, rowAmount, sumAmounts } from './transactionAmount';

describe('foreignAmountText', () => {
  it('writes the code, a space and two decimals', () => {
    expect(foreignAmountText({ amount: null, originalAmount: 20, originalCurrency: 'USD' })).toBe('USD 20.00');
    expect(foreignAmountText({ originalAmount: -1234.5, originalCurrency: 'EUR' })).toBe('EUR 1,234.50');
  });
  it('is null without an original amount or currency', () => {
    expect(foreignAmountText({ amount: -10 })).toBeNull();
    expect(foreignAmountText({ originalAmount: 20 })).toBeNull();
  });
});

describe('foreignChargedText', () => {
  it('joins the original and the rupee charge', () => {
    expect(foreignChargedText({ amount: -1712.4, originalAmount: -20, originalCurrency: 'USD' })).toBe(
      'USD 20.00 · charged ₹1,712.40',
    );
  });
  it('is null while the rupee amount is unknown', () => {
    expect(foreignChargedText({ amount: null, originalAmount: -20, originalCurrency: 'USD' })).toBeNull();
  });
});

describe('rowAmount', () => {
  it('shows the rupee amount with its direction', () => {
    expect(rowAmount({ amount: -3600 })).toEqual({ credit: false, text: '3,600.00' });
    expect(rowAmount({ amount: 45 })).toEqual({ credit: true, text: '45.00' });
  });
  it('shows the foreign amount when the rupee amount is null', () => {
    expect(rowAmount({ amount: null, originalAmount: -20, originalCurrency: 'USD' })).toEqual({
      credit: false,
      text: 'USD 20.00',
    });
  });
  it('is null when nothing is known', () => {
    expect(rowAmount({ amount: null })).toBeNull();
  });
});

describe('null-safe helpers', () => {
  it('sums only the known amounts', () => {
    expect(sumAmounts([{ amount: -100 }, { amount: null }, { amount: 50 }], Math.abs)).toBe(150);
    expect(sumAmounts([{ amount: null }])).toBe(0);
  });
  it('never turns a missing amount into 0', () => {
    expect(absAmount(null)).toBeNull();
    expect(absAmount(-5)).toBe(5);
    expect(absAmountText(null)).toBe('');
    expect(absAmountText(-5)).toBe('5');
  });
});

describe('directionAmount', () => {
  it('takes the rupee amount, else the signed original', () => {
    expect(directionAmount({ amount: -5, originalAmount: 20 })).toBe(-5);
    expect(directionAmount({ amount: null, originalAmount: 20, originalCurrency: 'USD' })).toBe(20);
    expect(directionAmount({ amount: null })).toBeNull();
  });
  it('reads a foreign credit as money in', () => {
    expect(rowAmount({ amount: null, originalAmount: 20, originalCurrency: 'USD' })?.credit).toBe(true);
  });
});

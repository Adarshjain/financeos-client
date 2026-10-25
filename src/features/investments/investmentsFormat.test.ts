import { describe, expect, it } from 'vitest';

import { fyLabel, moveTone, plainPct, quantity, rupees, shortDate, signedPct, signedRupees, unitPrice } from './investmentsFormat';

describe('investments formatting', () => {
  it('writes whole rupees with Indian grouping, and a minus for a loss', () => {
    expect(rupees(638208)).toBe('₹6,38,208');
    expect(rupees(-13500)).toBe('−₹13,500');
  });

  it('always signs a move, and writes a zero move as plain ₹0', () => {
    expect(signedRupees(3566.4)).toBe('+₹3,566');
    expect(signedRupees(-1398)).toBe('−₹1,398');
    expect(signedRupees(0.2)).toBe('₹0');
  });

  it('writes unit prices with two decimals', () => {
    expect(unitPrice(1742.6)).toBe('₹1,742.60');
  });

  it('writes percents with one decimal, none when whole, and 0% for nothing', () => {
    expect(signedPct(10)).toBe('+10%');
    expect(signedPct(1.2387, 2)).toBe('+1.24%');
    expect(signedPct(-0.004, 2)).toBe('0%');
    expect(signedPct(-0.3)).toBe('−0.3%');
    expect(signedPct(113.04)).toBe('+113%');
    expect(signedPct(0.01)).toBe('0%');
    expect(plainPct(31.44)).toBe('31.4%');
  });

  it('writes quantities up to four decimals', () => {
    expect(quantity(40)).toBe('40');
    expect(quantity(325.11)).toBe('325.11');
    expect(quantity(1234567.12345)).toBe('12,34,567.1235');
  });

  it('writes a short date with the two-digit year', () => {
    expect(shortDate('2023-07-13')).toBe('13 Jul 23');
  });

  it('colours a move green or red, and leaves nothing and zero plain', () => {
    expect(moveTone(5)).toBe('positive');
    expect(moveTone(-5)).toBe('danger');
    expect(moveTone(0)).toBeUndefined();
    expect(moveTone(null)).toBeUndefined();
  });

  it('labels a financial year from its start year', () => {
    expect(fyLabel(2026)).toBe('FY 26-27');
  });
});

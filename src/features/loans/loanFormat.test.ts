import { describe, expect, it } from 'vitest';

import { daysBetween, fyRangeLabel, monthYearShort, ordinal, plainAmount, plural } from './loanFormat';

describe('loanFormat', () => {
  it('plural picks one or many', () => {
    expect(plural(1, 'person', 'people')).toBe('1 person');
    expect(plural(0, 'person', 'people')).toBe('0 people');
    expect(plural(2, 'EMI', 'EMIs')).toBe('2 EMIs');
  });

  it('plainAmount uses Indian grouping, with paise only when there are some', () => {
    expect(plainAmount(36603)).toBe('36,603');
    expect(plainAmount(4192327)).toBe('41,92,327');
    expect(plainAmount(1250.5)).toBe('1,250.50');
    expect(plainAmount(0)).toBe('0');
  });

  it('daysBetween counts calendar days in both directions', () => {
    expect(daysBetween('2026-10-13', '2026-10-28')).toBe(15);
    expect(daysBetween('2026-10-13', '2026-10-13')).toBe(0);
    expect(daysBetween('2026-10-13', '2026-10-10')).toBe(-3);
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3);
    expect(daysBetween('nope', '2026-10-13')).toBeNull();
  });

  it('monthYearShort reads "Jan 45"', () => {
    expect(monthYearShort('2045-01-05')).toBe('Jan 45');
    expect(monthYearShort('')).toBe('');
  });

  it('ordinal handles the teens and the 1st/2nd/3rd', () => {
    expect([1, 2, 3, 4, 5, 7, 10, 11, 12, 13, 21, 22, 23, 30].map(ordinal)).toEqual([
      '1st', '2nd', '3rd', '4th', '5th', '7th', '10th', '11th', '12th', '13th', '21st', '22nd', '23rd', '30th',
    ]);
  });

  it('fyRangeLabel runs from the FY start month to this month', () => {
    expect(fyRangeLabel('2026-04-01', '2026-10-21')).toBe('Apr – Oct 2026');
    expect(fyRangeLabel('2026-04-01', '2026-04-03')).toBe('Apr 2026');
    expect(fyRangeLabel('2026-04-01', '2027-01-15')).toBe('Apr 2026 – Jan 2027');
    expect(fyRangeLabel('', '2026-10-21')).toBe('');
  });
});

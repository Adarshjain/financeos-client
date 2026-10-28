import { describe, expect, it } from 'vitest';

import { daysBetween, fyRangeLabel, ordinal } from './loanFormat';

describe('loanFormat', () => {
  it('daysBetween counts calendar days in both directions', () => {
    expect(daysBetween('2026-10-13', '2026-10-28')).toBe(15);
    expect(daysBetween('2026-10-13', '2026-10-13')).toBe(0);
    expect(daysBetween('2026-10-13', '2026-10-10')).toBe(-3);
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3);
    expect(daysBetween('nope', '2026-10-13')).toBeNull();
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

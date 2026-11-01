import { describe, expect, it } from 'vitest';

import {
  formatDate,
  formatMoney,
  getAccountName,
  parseCalendarDate,
  toCalendarDate,
} from '../utils';

// These cover the calendar-date corruption that shipped for a long time:
// `toISOString().split('T')[0]` on the write path and `new Date('YYYY-MM-DD')`
// on the read path both route a timezone-free calendar date through UTC.
//
// The assertions below are deliberately timezone-INDEPENDENT: a correct
// implementation produces these results in every zone, which is exactly the
// property that was broken. Run the suite under any TZ and it should hold.
describe('toCalendarDate', () => {
  it('serialises from local components, not UTC', () => {
    // 01:30 local. Under the old toISOString() approach this yielded the
    // previous day for every zone east of Greenwich (IST included).
    expect(toCalendarDate(new Date(2026, 6, 25, 1, 30))).toBe('2026-07-25');
  });

  it('is stable late in the day too', () => {
    // Mirror image: under a naive UTC conversion this rolled forward a day for
    // zones west of Greenwich.
    expect(toCalendarDate(new Date(2026, 6, 25, 23, 30))).toBe('2026-07-25');
  });

  it('zero-pads month and day', () => {
    expect(toCalendarDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('handles a leap day', () => {
    expect(toCalendarDate(new Date(2024, 1, 29))).toBe('2024-02-29');
  });
});

describe('parseCalendarDate', () => {
  it('parses to local midnight, so the day survives', () => {
    const d = parseCalendarDate('2026-07-25');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(25);
    expect(d.getHours()).toBe(0);
  });

  it('round-trips losslessly with toCalendarDate', () => {
    for (const value of ['2026-01-01', '2026-07-25', '2024-02-29', '2026-12-31']) {
      expect(toCalendarDate(parseCalendarDate(value))).toBe(value);
    }
  });
});

describe('formatDate', () => {
  it('renders a plain calendar date without shifting the day', () => {
    expect(formatDate('2026-07-25')).toBe('25 Jul 26');
  });

  it('treats a full timestamp as an instant', () => {
    // Distinct from the calendar-date path: an instant legitimately renders in
    // local time, so this one IS timezone-dependent by design. Asserted under
    // the suite's pinned Asia/Kolkata (UTC+5:30): 20:00Z is the next day local.
    expect(formatDate('2026-07-25T20:00:00Z')).toBe('26 Jul 26');
  });

  it('returns an em dash for empty input', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
  });

  it('returns an em dash rather than "Invalid Date" for garbage', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });

  it('accepts a Date instance', () => {
    expect(formatDate(new Date(2026, 6, 25))).toBe('25 Jul 26');
  });
});

describe('formatMoney', () => {
  it('formats with the INR symbol and two decimals', () => {
    expect(formatMoney(1234.5)).toBe('₹1,234.50');
  });

  it('groups in the Indian system (lakh/crore), not thousands', () => {
    expect(formatMoney(1234567)).toBe('₹12,34,567.00');
  });

  it('preserves paise — the money bug truncated these', () => {
    expect(formatMoney(12345.67)).toBe('₹12,345.67');
  });

  it('accepts numeric strings, since the API types disagree on this', () => {
    expect(formatMoney('12345.67')).toBe('₹12,345.67');
  });

  it('falls back to zero for null, undefined and NaN', () => {
    expect(formatMoney(null)).toBe('₹0.00');
    expect(formatMoney(undefined)).toBe('₹0.00');
    expect(formatMoney('abc')).toBe('₹0.00');
  });

  it('formats negatives', () => {
    expect(formatMoney(-500)).toBe('-₹500.00');
  });
});

describe('getAccountName', () => {
  const accounts = [
    { id: 'a1', name: 'HDFC Savings' },
    { id: 'a2', name: 'Amex Platinum' },
  ];

  it('resolves a known id', () => {
    expect(getAccountName(accounts, 'a2')).toBe('Amex Platinum');
  });

  it('returns an em dash when there is no id at all', () => {
    expect(getAccountName(accounts, undefined)).toBe('—');
  });

  it('returns Unknown when the id does not resolve', () => {
    expect(getAccountName(accounts, 'missing')).toBe('Unknown');
  });
});

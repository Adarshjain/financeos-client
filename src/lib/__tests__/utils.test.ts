import { describe, expect, it } from 'vitest';

import {
  formatDate,
  formatMoney,
  formatMonthYear,
  formatNullableMoney,
  formatRelativeTime,
  getAccountName,
  getAccountTypeLabel,
  getDayShortName,
  getMonthShortName,
  getPositionLabel,
  isSameDay,
  isWithinLastNDays,
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

describe('formatNullableMoney', () => {
  it('distinguishes absent from zero', () => {
    expect(formatNullableMoney(null)).toBe('—');
    expect(formatNullableMoney(undefined)).toBe('—');
    expect(formatNullableMoney(0)).toBe('₹0.00');
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

describe('getAccountTypeLabel', () => {
  it('maps known types', () => {
    expect(getAccountTypeLabel('bank_account')).toBe('Bank Account');
    expect(getAccountTypeLabel('credit_card')).toBe('Credit Card');
  });

  it('is case-insensitive', () => {
    expect(getAccountTypeLabel('CREDIT_CARD')).toBe('Credit Card');
  });

  it('falls back to the raw value for unknown types', () => {
    expect(getAccountTypeLabel('crypto_wallet')).toBe('crypto_wallet');
  });

  it('handles undefined', () => {
    expect(getAccountTypeLabel(undefined)).toBe('Unknown');
  });
});

describe('isWithinLastNDays', () => {
  it('counts today as within range', () => {
    expect(isWithinLastNDays(new Date(), 4)).toBe(true);
  });

  it('excludes a date older than the window', () => {
    const old = new Date();
    old.setDate(old.getDate() - 10);
    expect(isWithinLastNDays(old, 4)).toBe(false);
  });

  it('excludes future dates', () => {
    const future = new Date();
    future.setDate(future.getDate() + 1);
    expect(isWithinLastNDays(future, 4)).toBe(false);
  });
});

// Replaces the app's single date-fns call. Times are built relative to now so the
// assertions don't depend on a frozen clock.
describe('formatRelativeTime', () => {
  const ago = (ms: number) => new Date(Date.now() - ms);
  const MIN = 60 * 1000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  it('reports "never" for absent or unparseable input', () => {
    expect(formatRelativeTime(null)).toBe('never');
    expect(formatRelativeTime(undefined)).toBe('never');
    expect(formatRelativeTime('')).toBe('never');
    expect(formatRelativeTime('not-a-date')).toBe('never');
  });

  it('uses seconds under a minute', () => {
    expect(formatRelativeTime(ago(5 * 1000))).toMatch(/second/);
  });

  it('uses minutes, hours and days at the right thresholds', () => {
    expect(formatRelativeTime(ago(5 * MIN))).toBe('5 minutes ago');
    expect(formatRelativeTime(ago(3 * HOUR))).toBe('3 hours ago');
    expect(formatRelativeTime(ago(5 * DAY))).toBe('5 days ago');
  });

  it("says 'yesterday' rather than '1 day ago'", () => {
    // This is why numeric:'auto' is used.
    expect(formatRelativeTime(ago(DAY))).toBe('yesterday');
  });

  it('escalates to months and years', () => {
    expect(formatRelativeTime(ago(60 * DAY))).toMatch(/month/);
    expect(formatRelativeTime(ago(800 * DAY))).toMatch(/year/);
  });

  it('handles future timestamps', () => {
    expect(formatRelativeTime(new Date(Date.now() + 3 * HOUR))).toBe('in 3 hours');
  });

  it('accepts an ISO string as well as a Date', () => {
    expect(formatRelativeTime(ago(5 * MIN).toISOString())).toBe('5 minutes ago');
  });
});

describe('getPositionLabel (CD-15)', () => {
  it('defaults to Asset for undefined/empty', () => {
    expect(getPositionLabel(undefined)).toBe('Asset');
    expect(getPositionLabel('')).toBe('Asset');
  });

  it('maps liability and asset', () => {
    expect(getPositionLabel('liability')).toBe('Liability');
    expect(getPositionLabel('asset')).toBe('Asset');
  });
});

describe('getMonthShortName (CD-15)', () => {
  it('returns short name for Date instance', () => {
    expect(getMonthShortName(new Date(2026, 0, 15))).toBe('Jan');
    expect(getMonthShortName(new Date(2026, 11, 25))).toBe('Dec');
  });

  it('returns short name for integer month indices (0–11)', () => {
    expect(getMonthShortName(0)).toBe('Jan');
    expect(getMonthShortName(6)).toBe('Jul');
    expect(getMonthShortName(11)).toBe('Dec');
  });

  it('returns invalid fallback "-" for out-of-range or bad inputs', () => {
    expect(getMonthShortName(-1)).toBe('-');
    expect(getMonthShortName(12)).toBe('-');
    expect(getMonthShortName(1.5)).toBe('-');
    expect(getMonthShortName('invalid' as any)).toBe('-');
  });
});

describe('getDayShortName (CD-15)', () => {
  it('returns short weekday for Date instance', () => {
    // 2026-07-25 is a Saturday (day index 6)
    const sat = new Date(2026, 6, 25);
    expect(getDayShortName(sat)).toBe('Sat');
  });

  it('returns short weekday for integer day indices (0–6)', () => {
    expect(getDayShortName(0)).toBe('Sun');
    expect(getDayShortName(6)).toBe('Sat');
  });

  it('returns null for invalid inputs', () => {
    expect(getDayShortName(-1)).toBeNull();
    expect(getDayShortName(7)).toBeNull();
    expect(getDayShortName('invalid' as any)).toBeNull();
  });
});

describe('formatMonthYear (CD-15)', () => {
  it('formats month and 2-digit year correctly in Asia/Kolkata timezone', () => {
    const d = new Date(2026, 6, 25); // July 2026
    expect(formatMonthYear(d)).toBe('Jul 26');
  });
});

describe('isSameDay (CD-15)', () => {
  it('returns true for same calendar date', () => {
    const d1 = new Date(2026, 6, 25, 10, 0);
    const d2 = new Date(2026, 6, 25, 22, 30);
    expect(isSameDay(d1, d2)).toBe(true);
  });

  it('returns false for different calendar dates', () => {
    const d1 = new Date(2026, 6, 25);
    const d2 = new Date(2026, 6, 26);
    expect(isSameDay(d1, d2)).toBe(false);
  });
});


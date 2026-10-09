import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatDateRangeForFilename } from '../date-range';

// The system clock is pinned to 9 Oct 2026 (IST) so every case that WOULD get a
// today-relative label from formatDateRange() proves the filename variant
// ignores today.
const name = (from: string | Date | null, to: string | Date | null) => formatDateRangeForFilename(from, to);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-09T06:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('formatDateRangeForFilename — open ends', () => {
  it('reads "All time" with neither end', () => {
    expect(name(null, null)).toBe('All time');
  });

  it('reads "since …" with the year, even for the current year', () => {
    expect(name('2026-10-01', null)).toBe('since 1 Oct 26');
  });

  it('reads "until …" with the year, even for the current year', () => {
    expect(name(null, '2026-10-09')).toBe('until 9 Oct 26');
  });

  it('treats an unparseable date as missing', () => {
    expect(name('not-a-date', '2026-10-09')).toBe('until 9 Oct 26');
  });
});

describe('formatDateRangeForFilename — single day', () => {
  it('prints today as a date, never "Today"', () => {
    expect(name('2026-10-09', '2026-10-09')).toBe('9 Oct 26');
  });

  it('prints yesterday as a date, never "Yesterday"', () => {
    expect(name('2026-10-08', '2026-10-08')).toBe('8 Oct 26');
  });

  it('prints a day in another year with that year', () => {
    expect(name('2025-08-15', '2025-08-15')).toBe('15 Aug 25');
  });

  it('accepts Date inputs', () => {
    expect(name(new Date(2026, 9, 9), new Date(2026, 9, 9))).toBe('9 Oct 26');
  });
});

describe('formatDateRangeForFilename — named periods keep their names', () => {
  it('names a whole calendar year', () => {
    expect(name('2026-01-01', '2026-12-31')).toBe('2026');
  });

  it('names a whole fiscal year', () => {
    expect(name('2026-04-01', '2027-03-31')).toBe('FY27');
  });

  it('names a fiscal quarter', () => {
    expect(name('2026-07-01', '2026-09-30')).toBe('Q2 FY27');
  });

  it('names a single month of the current year with its year', () => {
    expect(name('2026-09-01', '2026-09-30')).toBe('Sep 26');
  });

  it('names a month span in one year with the year once', () => {
    expect(name('2026-07-01', '2026-08-31')).toBe('Jul – Aug 26');
  });

  it('names a month span across years with both years', () => {
    expect(name('2025-12-01', '2026-02-28')).toBe('Dec 25 – Feb 26');
  });
});

describe('formatDateRangeForFilename — no "ends today" labels', () => {
  it('month to date is a plain range, not "Oct MTD"', () => {
    expect(name('2026-10-01', '2026-10-09')).toBe('1–9 Oct 26');
  });

  it('fiscal year to date is a plain range, not "FYTD"', () => {
    expect(name('2026-04-01', '2026-10-09')).toBe('1 Apr – 9 Oct 26');
  });

  it('year to date is a plain range, not "YTD"', () => {
    expect(name('2026-01-01', '2026-10-09')).toBe('1 Jan – 9 Oct 26');
  });

  it('last N months is a plain range, not "Last 3m"', () => {
    expect(name('2026-07-10', '2026-10-09')).toBe('10 Jul – 9 Oct 26');
  });

  it('last N days is a plain range, not "Last 30d"', () => {
    expect(name('2026-09-10', '2026-10-09')).toBe('10 Sep – 9 Oct 26');
  });
});

describe('formatDateRangeForFilename — no "→ today" label', () => {
  it('a range still running prints both ends', () => {
    expect(name('2026-09-18', '2026-10-17')).toBe('18 Sep – 17 Oct 26');
  });
});

describe('formatDateRangeForFilename — shared parts once, year always', () => {
  it('within one month', () => {
    expect(name('2026-08-01', '2026-08-15')).toBe('1–15 Aug 26');
  });

  it('across months of one year', () => {
    expect(name('2026-08-12', '2026-09-03')).toBe('12 Aug – 3 Sep 26');
  });

  it('across years', () => {
    expect(name('2025-12-12', '2026-01-03')).toBe('12 Dec 25 – 3 Jan 26');
  });
});

describe('formatDateRangeForFilename — endExclusive', () => {
  it('ends the range the day before `to`', () => {
    expect(formatDateRangeForFilename('2026-04-01', '2027-04-01', { endExclusive: true })).toBe('FY27');
    expect(formatDateRangeForFilename(null, '2026-10-10', { endExclusive: true })).toBe('until 9 Oct 26');
  });
});

describe('formatDateRangeForFilename — independent of today', () => {
  it('gives the same name on any day', () => {
    const before = name('2026-10-01', '2026-10-09');
    vi.setSystemTime(new Date('2030-01-01T06:00:00Z'));
    expect(name('2026-10-01', '2026-10-09')).toBe(before);
    expect(name('2026-09-01', '2026-09-30')).toBe('Sep 26');
  });
});

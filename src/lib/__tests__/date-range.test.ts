import { describe, expect, it } from 'vitest';

import {
  formatComparedRange,
  formatDateRange,
  formatDateRangeFull,
  todayInAppZone,
} from '../date-range';
import { formatDate } from '../utils';

// Every case pins "today" so the suite does not depend on the run date.
const today = '2026-10-03';
const range = (from: string | null, to: string | null) => formatDateRange(from, to, { today });

describe('todayInAppZone', () => {
  it('rolls over at IST midnight, not UTC midnight', () => {
    // 19:00 UTC on 2 Oct is 00:30 IST on 3 Oct.
    expect(todayInAppZone(new Date('2026-10-02T19:00:00Z'))).toBe('2026-10-03');
  });

  it('stays on the IST date late in the IST day', () => {
    // 18:00 UTC on 3 Oct is 23:30 IST on 3 Oct.
    expect(todayInAppZone(new Date('2026-10-03T18:00:00Z'))).toBe('2026-10-03');
  });
});

describe('formatDateRange — open ends', () => {
  it('reads "All time" with neither end', () => {
    expect(range(null, null)).toBe('All time');
  });

  it('reads "since …" without an end', () => {
    expect(range('2026-08-01', null)).toBe('since 1 Aug');
  });

  it('reads "until …" without a start', () => {
    expect(range(null, '2027-03-31')).toBe('until 31 Mar 27');
  });

  it('treats an unparseable date as missing', () => {
    expect(range('not-a-date', '2026-08-01')).toBe('until 1 Aug');
  });
});

describe('formatDateRange — single day', () => {
  it('names today', () => {
    expect(range('2026-10-03', '2026-10-03')).toBe('Today');
  });

  it('names yesterday', () => {
    expect(range('2026-10-02', '2026-10-02')).toBe('Yesterday');
  });

  it('prints any other day once', () => {
    expect(range('2026-08-15', '2026-08-15')).toBe('15 Aug');
  });

  it('keeps the year for a day in another year', () => {
    expect(range('2025-08-15', '2025-08-15')).toBe('15 Aug 25');
  });
});

describe('formatDateRange — rule 1: named periods', () => {
  it('names a whole calendar year', () => {
    expect(range('2025-01-01', '2025-12-31')).toBe('2025');
  });

  it('names a whole fiscal year by its end year', () => {
    expect(range('2026-04-01', '2027-03-31')).toBe('FY27');
    expect(range('2025-04-01', '2026-03-31')).toBe('FY26');
  });

  it('names each fiscal quarter', () => {
    expect(range('2026-04-01', '2026-06-30')).toBe('Q1 FY27');
    expect(range('2026-07-01', '2026-09-30')).toBe('Q2 FY27');
    expect(range('2026-10-01', '2026-12-31')).toBe('Q3 FY27');
    expect(range('2027-01-01', '2027-03-31')).toBe('Q4 FY27');
  });

  it('does not call a three-month span off the quarter grid a quarter', () => {
    expect(range('2026-05-01', '2026-07-31')).toBe('May – Jul');
  });

  it('names a whole month', () => {
    expect(range('2026-09-01', '2026-09-30')).toBe('Sep');
  });

  it('names the current month even though it is still running', () => {
    // The server's this_month resolves to the full month.
    expect(range('2026-10-01', '2026-10-31')).toBe('Oct');
  });

  it('keeps the year for a month in another year', () => {
    expect(range('2025-09-01', '2025-09-30')).toBe('Sep 25');
  });

  it('recognises a leap-year February as a whole month', () => {
    expect(range('2028-02-01', '2028-02-29')).toBe('Feb 28');
  });

  it('names a span of whole months within a year', () => {
    expect(range('2026-07-01', '2026-08-31')).toBe('Jul – Aug');
    expect(range('2025-07-01', '2025-08-31')).toBe('Jul – Aug 25');
  });

  it('names a span of whole months across years', () => {
    expect(range('2025-11-01', '2026-02-28')).toBe('Nov 25 – Feb 26');
  });

  it('does not name a month missing its first day', () => {
    expect(range('2026-09-02', '2026-09-30')).toBe('2–30 Sep');
  });
});

describe('formatDateRange — rule 2: ends today', () => {
  it('reads month-to-date', () => {
    expect(range('2026-10-01', today)).toBe('Oct MTD');
  });

  it('reads fiscal-year-to-date', () => {
    expect(range('2026-04-01', today)).toBe('FYTD');
  });

  it('reads calendar-year-to-date', () => {
    expect(range('2026-01-01', today)).toBe('YTD');
  });

  it('reads the server\'s last_x_months window in months', () => {
    expect(range('2026-07-04', today)).toBe('Last 3m');
  });

  it('reads whole years of months in years', () => {
    expect(range('2025-10-04', today)).toBe('Last 1y');
    expect(range('2024-10-04', today)).toBe('Last 2y');
  });

  it('prefers months when a day window lines up with them', () => {
    // last_x_days(30) on 3 Oct starts 4 Sep — exactly one month back.
    expect(range('2026-09-04', today)).toBe('Last 1m');
  });

  it('reads any other window ending today in days', () => {
    expect(range('2026-09-14', today)).toBe('Last 20d');
    expect(range('2026-09-27', today)).toBe('Last 7d');
  });
});

describe('formatDateRange — rule 3: still running', () => {
  it('shows the start, today and the days left', () => {
    // An open billing cycle.
    expect(range('2026-09-18', '2026-10-17')).toBe('18 Sep → today · 14d left');
  });

  it('keeps the start\'s year when it began in another year', () => {
    expect(range('2025-12-20', '2026-10-10')).toBe('20 Dec 25 → today · 7d left');
  });
});

describe('formatDateRange — rule 4: shared parts once', () => {
  it('prints month and year once within a month', () => {
    expect(range('2026-09-01', '2026-09-15')).toBe('1–15 Sep');
    expect(range('2025-09-01', '2025-09-15')).toBe('1–15 Sep 25');
  });

  it('prints the year once within a year', () => {
    expect(range('2026-08-12', '2026-09-03')).toBe('12 Aug – 3 Sep');
    expect(range('2025-08-12', '2025-09-03')).toBe('12 Aug – 3 Sep 25');
  });

  it('keeps the year on a future-year range', () => {
    expect(range('2027-01-05', '2027-01-09')).toBe('5–9 Jan 27');
  });

  it('prints both years across a year boundary', () => {
    expect(range('2025-12-12', '2026-01-03')).toBe('12 Dec 25 – 3 Jan 26');
  });
});

describe('endExclusive (reward rule activeTo)', () => {
  const exclusive = (from: string | null, to: string | null) =>
    formatDateRange(from, to, { today, endExclusive: true });

  it('ends the range the day before `to`', () => {
    expect(exclusive('2024-04-01', '2025-04-01')).toBe('FY25');
    expect(exclusive('2026-08-12', '2026-09-04')).toBe('12 Aug – 3 Sep');
  });

  it('applies to an open start too', () => {
    expect(exclusive(null, '2025-04-01')).toBe('until 31 Mar 25');
  });

  it('leaves an open end alone', () => {
    expect(exclusive('2024-04-05', null)).toBe('since 5 Apr 24');
  });

  it('shifts the full-dates hover the same way', () => {
    expect(formatDateRangeFull('2024-04-01', '2025-04-01', { endExclusive: true })).toBe(
      `${formatDate('2024-04-01')} – ${formatDate('2025-03-31')}`,
    );
    expect(formatDateRangeFull(null, '2025-04-01', { endExclusive: true })).toBe(
      `until ${formatDate('2025-03-31')}`,
    );
  });
});

describe('formatDateRangeFull', () => {
  it('writes both ends out in full', () => {
    expect(formatDateRangeFull('2026-09-01', '2026-09-30')).toBe(
      `${formatDate('2026-09-01')} – ${formatDate('2026-09-30')}`,
    );
  });

  it('writes a single day once', () => {
    expect(formatDateRangeFull('2026-09-01', '2026-09-01')).toBe(formatDate('2026-09-01'));
  });

  it('handles open ends', () => {
    expect(formatDateRangeFull('2026-08-01', null)).toBe(`since ${formatDate('2026-08-01')}`);
    expect(formatDateRangeFull(null, '2026-08-01')).toBe(`until ${formatDate('2026-08-01')}`);
    expect(formatDateRangeFull(null, null)).toBe('All time');
  });
});

describe('formatComparedRange', () => {
  const compared = (
    previous: { from: string; to: string } | null,
    current: { from: string; to: string } | null,
  ) => formatComparedRange(previous, current, { today });

  it('falls back to the generic phrase without a previous window', () => {
    expect(compared(null, { from: '2026-09-01', to: '2026-09-30' })).toBe('vs previous period');
  });

  it('names a previous month', () => {
    expect(
      compared({ from: '2026-08-01', to: '2026-08-31' }, { from: '2026-09-01', to: '2026-09-30' }),
    ).toBe('vs Aug');
  });

  it('keeps the year on a previous month in another year', () => {
    expect(
      compared({ from: '2025-12-01', to: '2025-12-31' }, { from: '2026-01-01', to: '2026-01-31' }),
    ).toBe('vs Dec 25');
  });

  it('names a previous quarter, fiscal year and calendar year', () => {
    expect(
      compared({ from: '2026-04-01', to: '2026-06-30' }, { from: '2026-07-01', to: '2026-09-30' }),
    ).toBe('vs Q1 FY27');
    expect(
      compared({ from: '2025-04-01', to: '2026-03-31' }, { from: '2026-04-01', to: '2027-03-31' }),
    ).toBe('vs FY26');
    expect(
      compared({ from: '2025-01-01', to: '2025-12-31' }, { from: '2026-01-01', to: '2026-12-31' }),
    ).toBe('vs 2025');
  });

  it('reads yesterday in lower case', () => {
    expect(compared({ from: '2026-10-02', to: '2026-10-02' }, { from: today, to: today })).toBe(
      'vs yesterday',
    );
  });

  it('describes an equal-length window right before as "prev Nd"', () => {
    expect(
      compared({ from: '2026-08-05', to: '2026-09-03' }, { from: '2026-09-04', to: today }),
    ).toBe('vs prev 30d');
  });

  it('prints a previous single day rather than "prev 1d"', () => {
    expect(
      compared({ from: '2026-09-19', to: '2026-09-19' }, { from: '2026-09-20', to: '2026-09-20' }),
    ).toBe('vs 19 Sep');
  });

  it('prints the previous window when the lengths differ', () => {
    // Billing cycles: 31 days before, 30 now.
    expect(
      compared({ from: '2026-08-18', to: '2026-09-17' }, { from: '2026-09-18', to: '2026-10-17' }),
    ).toBe('vs 18 Aug – 17 Sep');
  });

  it('prints the previous window when it is not right before', () => {
    expect(
      compared({ from: '2026-08-01', to: '2026-08-10' }, { from: '2026-09-01', to: '2026-09-10' }),
    ).toBe('vs 1–10 Aug');
  });

  it('prints the previous window when the current one is unknown', () => {
    expect(compared({ from: '2026-08-05', to: '2026-09-03' }, null)).toBe('vs 5 Aug – 3 Sep');
  });
});

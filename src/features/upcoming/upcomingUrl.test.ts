import { describe, expect, it } from 'vitest';

import { parseUpcomingCalendarUrl, parseUpcomingUrl } from './upcomingUrl';

describe('parseUpcomingUrl', () => {
  it('reads a listed number of months', () => {
    expect(parseUpcomingUrl({ months: '6' }).months).toBe(6);
  });

  it('falls back to the default for an unlisted or missing value', () => {
    const fallback = parseUpcomingUrl({}).months;
    expect(parseUpcomingUrl({ months: '7' }).months).toBe(fallback);
    expect(parseUpcomingUrl({ months: ['6', '3'] }).months).toBe(6);
  });
});

describe('parseUpcomingCalendarUrl', () => {
  const today = '2026-10-29';

  it('shows the current month by default and fetches enough to cover it', () => {
    const { month, months } = parseUpcomingCalendarUrl({}, today);
    expect(month).toBe('2026-10');
    expect(months).toBeGreaterThanOrEqual(1);
  });

  it('shows a month ahead and fetches through it', () => {
    const { month, months } = parseUpcomingCalendarUrl({ month: '2026-12' }, today);
    expect(month).toBe('2026-12');
    expect(months).toBeGreaterThanOrEqual(3);
  });

  it('ignores a malformed or past month', () => {
    expect(parseUpcomingCalendarUrl({ month: 'soon' }, today).month).toBe('2026-10');
    expect(parseUpcomingCalendarUrl({ month: '2026-01' }, today).month).toBe('2026-10');
  });
});

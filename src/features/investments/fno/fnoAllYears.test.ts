import { describe, expect, it, vi } from 'vitest';

import { summary } from './fno.fixtures';
import { FNO_ALL_YEARS, FNO_HREF, fnoFyLabel, fnoQuery, fnoSummaryQuery, fnoUrl, monthRows, parseFnoUrl } from './fnoModel';

vi.mock('@/lib/date-range', async (orig) => ({
  ...(await orig<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-13',
}));

describe('F&O All years', () => {
  it('reads fy=all as every year and anything else as the current year or the named one', () => {
    expect(parseFnoUrl({ fy: 'all' }).fy).toBeNull();
    expect(parseFnoUrl({ fy: 'junk' }).fy).toBe(2026);
    expect(parseFnoUrl({}).fy).toBe(2026);
    expect(parseFnoUrl({ fy: '2024' }).fy).toBe(2024);
  });

  it('writes fy=all, leaves the current year out and keeps any other year', () => {
    expect(fnoUrl(parseFnoUrl({ fy: 'all' }))).toBe(`${FNO_HREF}?fy=all`);
    expect(fnoUrl(parseFnoUrl({ fy: '2026' }))).toBe(FNO_HREF);
    expect(fnoUrl(parseFnoUrl({ fy: '2024' }))).toBe(`${FNO_HREF}?fy=2024`);
  });

  it('asks the page without fy and the summary with allYears', () => {
    const all = parseFnoUrl({ fy: 'all', broker: 'b1' });
    expect(fnoQuery(all).fy).toBeUndefined();
    expect(fnoSummaryQuery(all)).toEqual({ allYears: true, brokerAccountId: 'b1' });
    const year = parseFnoUrl({ fy: '2025' });
    expect(fnoQuery(year).fy).toBe(2025);
    expect(fnoSummaryQuery(year)).toEqual({ fy: 2025, brokerAccountId: undefined });
  });

  it('labels the filter, and has no month rows from an empty byMonth', () => {
    expect(fnoFyLabel(null)).toBe('All years');
    expect(fnoFyLabel(2025)).toBe('FY 25-26');
    expect(FNO_ALL_YEARS.value).toBe('');
    expect(monthRows({ ...summary, byMonth: [] })).toEqual([]);
  });
});

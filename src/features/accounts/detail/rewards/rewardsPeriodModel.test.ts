import { describe, expect, it } from 'vitest';

import { DEFAULT_PERIOD, isIsoDate, periodWords, resolvePeriod } from './rewardsPeriodModel';

const base = { from: '2026-03-15', to: '2027-03-14', calendarYear: false };
const today = '2026-10-13';
const anniversary = '2024-03-15';

describe('resolvePeriod', () => {
  it('opens on the current reward year, exactly as the server reports it', () => {
    expect(DEFAULT_PERIOD).toBe('THIS_ANNIVERSARY_YEAR');
    expect(resolvePeriod({}, base, today, anniversary)).toBe(base);
    expect(resolvePeriod({ period: 'THIS_ANNIVERSARY_YEAR' }, base, today, anniversary)).toBe(base);
  });

  it('puts the previous anniversary year right before the current one', () => {
    expect(resolvePeriod({ period: 'LAST_ANNIVERSARY_YEAR' }, base, today, anniversary)).toEqual({
      from: '2025-03-15',
      to: '2026-03-14',
      calendarYear: false,
    });
  });

  it('puts the previous calendar year before a calendar-year fallback', () => {
    const calendar = { from: '2026-01-01', to: '2026-12-31', calendarYear: true };
    expect(resolvePeriod({ period: 'LAST_ANNIVERSARY_YEAR' }, calendar, today, null)).toEqual({
      from: '2025-01-01',
      to: '2025-12-31',
      calendarYear: true,
    });
  });

  it('computes the month presets from the business date', () => {
    expect(resolvePeriod({ period: 'THIS_MONTH' }, base, today, anniversary)).toMatchObject({ from: '2026-10-01', to: '2026-10-13' });
    expect(resolvePeriod({ period: 'LAST_MONTH' }, base, today, anniversary)).toMatchObject({ from: '2026-09-01', to: '2026-09-30' });
    expect(resolvePeriod({ period: 'LAST_3_MONTHS' }, base, today, anniversary)).toMatchObject({ from: '2026-08-01', to: '2026-10-13' });
  });

  it('crosses the year boundary for last month and last 3 months', () => {
    expect(resolvePeriod({ period: 'LAST_MONTH' }, base, '2026-01-20', anniversary)).toMatchObject({ from: '2025-12-01', to: '2025-12-31' });
    expect(resolvePeriod({ period: 'LAST_3_MONTHS' }, base, '2026-02-10', anniversary)).toMatchObject({ from: '2025-12-01', to: '2026-02-10' });
  });

  it('starts the financial year on 1 April', () => {
    expect(resolvePeriod({ period: 'THIS_FY' }, base, '2026-10-13', anniversary)).toMatchObject({ from: '2026-04-01', to: '2026-10-13' });
    expect(resolvePeriod({ period: 'THIS_FY' }, base, '2026-02-13', anniversary)).toMatchObject({ from: '2025-04-01', to: '2026-02-13' });
  });

  it('uses a custom range as given, swaps one written backwards, and fills a missing or invalid end from the year', () => {
    expect(resolvePeriod({ period: 'CUSTOM', from: '2026-05-01', to: '2026-06-30' }, base, today, anniversary)).toEqual({
      from: '2026-05-01',
      to: '2026-06-30',
      calendarYear: false,
    });
    expect(resolvePeriod({ period: 'CUSTOM', from: '2026-06-30', to: '2026-05-01' }, base, today, anniversary)).toMatchObject({
      from: '2026-05-01',
      to: '2026-06-30',
    });
    expect(resolvePeriod({ period: 'CUSTOM', from: '2026-05-01' }, base, today, anniversary)).toMatchObject({ from: '2026-05-01', to: '2027-03-14' });
    expect(resolvePeriod({ period: 'CUSTOM', from: '2026-02-31', to: 'x' }, base, today, anniversary)).toMatchObject({
      from: '2026-03-15',
      to: '2027-03-14',
    });
  });
});

describe('isIsoDate', () => {
  it('accepts only real calendar dates', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('13/10/26')).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
  });
});

describe('periodWords', () => {
  it('names the period in a sentence', () => {
    expect(periodWords(undefined, base)).toBe('this anniversary year');
    expect(periodWords('LAST_ANNIVERSARY_YEAR', { ...base, calendarYear: true })).toBe('previous calendar year');
    expect(periodWords('LAST_3_MONTHS', base)).toBe('last 3 months');
    expect(periodWords('CUSTOM', base)).toBe('custom range');
  });
});

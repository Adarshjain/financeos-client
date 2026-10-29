import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatDateTime, formatTime } from './time';

describe('formatTime', () => {
  it('formats 12-hour IST', () => {
    expect(formatTime('2026-10-13T10:00:00Z')).toBe('3:30 pm');
    expect(formatTime(new Date('2026-10-13T10:00:00Z'))).toBe('3:30 pm');
    expect(formatTime('2026-10-12T18:35:00Z')).toBe('12:05 am');
    expect(formatTime('2026-10-13T06:30:00Z')).toBe('12:00 pm');
  });
  it('can show seconds', () => {
    expect(formatTime('2026-10-13T10:00:12Z', { seconds: true })).toBe('3:30:12 pm');
    expect(formatTime('2026-10-13T10:00:05Z', { seconds: true })).toBe('3:30:05 pm');
  });
  it('reads a zone-less datetime as IST, whatever the machine zone', () => {
    expect(formatTime('2026-10-13T15:30:00')).toBe('3:30 pm');
    expect(formatTime('2026-10-13T15:30:12.5', { seconds: true })).toBe('3:30:12 pm');
    expect(formatTime('2026-10-13T15:30:00+00:00')).toBe('9:00 pm');
  });
  it('returns empty for missing or invalid input', () => {
    expect(formatTime(null)).toBe('');
    expect(formatTime(undefined)).toBe('');
    expect(formatTime('')).toBe('');
    expect(formatTime('nope')).toBe('');
    expect(formatTime(new Date(NaN))).toBe('');
  });
});

describe('formatDateTime', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-29T06:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());
  it('joins the list date and the time', () => {
    const thisYear = 2026;
    expect(formatDateTime(`${thisYear}-10-13T10:00:00Z`)).toBe('13 Oct, 3:30 pm');
  });
  it('uses the IST date of the instant', () => {
    const thisYear = 2026;
    expect(formatDateTime(`${thisYear}-10-12T20:00:00Z`)).toBe('13 Oct, 1:30 am');
  });
  it('reads a zone-less datetime as IST, so the date and the time agree', () => {
    expect(formatDateTime('2001-10-13T00:30:00')).toBe('13 Oct 01, 12:30 am');
  });
  it('adds the year for another year', () => {
    expect(formatDateTime('2001-10-13T10:00:00Z')).toBe('13 Oct 01, 3:30 pm');
  });
  it('returns empty for missing or invalid input', () => {
    expect(formatDateTime(null)).toBe('');
    expect(formatDateTime('nope')).toBe('');
  });
});

import { describe, expect, it } from 'vitest';

import { formatDate } from './date';

const T = { today: '2026-10-13' };

describe('formatDate', () => {
  it('returns empty for missing or invalid input', () => {
    expect(formatDate(null, 'full')).toBe('');
    expect(formatDate(undefined, 'full')).toBe('');
    expect(formatDate('', 'full')).toBe('');
    expect(formatDate('invalid', 'list')).toBe('');
    expect(formatDate('2026-13-40', 'full')).toBe('');
    expect(formatDate('2026-02-30', 'full')).toBe('');
    expect(formatDate(new Date(NaN), 'full')).toBe('');
  });

  it('formats full, input and month', () => {
    expect(formatDate('2026-10-13', 'full')).toBe('13 Oct 2026');
    expect(formatDate('2026-01-05', 'input')).toBe('05/01/2026');
    expect(formatDate('2026-10-13', 'month')).toBe('October 2026');
    expect(formatDate('2026-09-01', 'full')).toBe('1 Sep 2026');
  });

  it('list omits the current year and adds any other', () => {
    expect(formatDate('2026-10-13', 'list', T)).toBe('13 Oct');
    expect(formatDate('2025-10-13', 'list', T)).toBe('13 Oct 2025');
    expect(formatDate('2027-01-01', 'list', T)).toBe('1 Jan 2027');
    expect(formatDate('2026-12-31', 'list', { today: '2027-01-01' })).toBe('31 Dec 2026');
  });

  it('uses a calendar date as-is, with or without a time and no offset', () => {
    expect(formatDate('2026-10-13T23:30:00', 'full')).toBe('13 Oct 2026');
    expect(formatDate('2026-10-13T00:00:00.000', 'input')).toBe('13/10/2026');
  });

  it('converts an instant to its IST date', () => {
    expect(formatDate('2026-10-12T20:00:00Z', 'full')).toBe('13 Oct 2026');
    expect(formatDate('2026-10-12T20:00:00.000+00:00', 'input')).toBe('13/10/2026');
    expect(formatDate('2026-10-13T01:00:00-05:00', 'full')).toBe('13 Oct 2026');
    expect(formatDate('2026-10-12T18:29:59Z', 'full')).toBe('12 Oct 2026');
    expect(formatDate(new Date('2026-10-12T20:00:00Z'), 'full')).toBe('13 Oct 2026');
  });

  describe('weekday', () => {
    it('adds the weekday, and the year when not current', () => {
      expect(formatDate('2026-10-14', 'weekday', T)).toBe('Wed 14 Oct');
      expect(formatDate('2027-01-03', 'weekday', T)).toBe('Sun 3 Jan 2027');
    });
    it('reads an instant in IST', () => {
      expect(formatDate('2026-10-13T20:00:00Z', 'weekday', T)).toBe('Wed 14 Oct');
    });
  });

  describe('relative', () => {
    it('says Today and Yesterday', () => {
      expect(formatDate('2026-10-13', 'relative', T)).toBe('Today');
      expect(formatDate('2026-10-12', 'relative', T)).toBe('Yesterday');
      expect(formatDate('2026-10-11', 'relative', T)).toBe('11 Oct');
      expect(formatDate('2026-10-14', 'relative', T)).toBe('14 Oct');
    });
    it('is lower case when inline', () => {
      expect(formatDate('2026-10-13', 'relative', { ...T, inline: true })).toBe('today');
      expect(formatDate('2026-10-12', 'relative', { ...T, inline: true })).toBe('yesterday');
      expect(formatDate('2026-10-11', 'relative', { ...T, inline: true })).toBe('11 Oct');
    });
    it('works across a month and a year boundary', () => {
      expect(formatDate('2026-09-30', 'relative', { today: '2026-10-01' })).toBe('Yesterday');
      expect(formatDate('2026-02-28', 'relative', { today: '2026-03-01' })).toBe('Yesterday');
      expect(formatDate('2025-12-31', 'relative', { today: '2026-01-01' })).toBe('Yesterday');
      expect(formatDate('2025-12-30', 'relative', { today: '2026-01-01' })).toBe('30 Dec 2025');
    });
    it('reads an instant in IST', () => {
      expect(formatDate('2026-10-12T20:00:00Z', 'relative', T)).toBe('Today');
    });
  });
});

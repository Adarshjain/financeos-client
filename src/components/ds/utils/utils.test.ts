import { describe, expect, it } from 'vitest';

import {
  capCount,
  formatMonth,
  monthNames,
  monthNamesShort,
  parseDateInput,
  todayISO,
  weekdayLetters,
  weekdayNamesShort,
} from './index';

describe('Dinero utils', () => {
  describe('capCount', () => {
    it('formats counts under the max as strings', () => {
      expect(capCount(0)).toBe('0');
      expect(capCount(5)).toBe('5');
      expect(capCount(99)).toBe('99');
    });

    it('formats counts above default max (99) with a plus suffix', () => {
      expect(capCount(100)).toBe('99+');
      expect(capCount(150)).toBe('99+');
    });

    it('respects a custom max threshold', () => {
      expect(capCount(10, 9)).toBe('9+');
      expect(capCount(5, 10)).toBe('5');
      expect(capCount(10, 10)).toBe('10');
      expect(capCount(11, 10)).toBe('10+');
    });

    it('handles numeric string counts', () => {
      expect(capCount('5')).toBe('5');
      expect(capCount('120')).toBe('99+');
    });
  });

  describe('parseDateInput', () => {
    it('parses valid dd/mm/yyyy input into ISO yyyy-mm-dd', () => {
      expect(parseDateInput('13/10/2026')).toBe('2026-10-13');
      expect(parseDateInput('05/01/2026')).toBe('2026-01-05');
      expect(parseDateInput('5/1/2026')).toBe('2026-01-05');
      expect(parseDateInput('29/02/2024')).toBe('2024-02-29'); // Leap year
    });

    it('reads a two-digit year as 20yy', () => {
      expect(parseDateInput('13/10/26')).toBe('2026-10-13');
      expect(parseDateInput('5/1/07')).toBe('2007-01-05');
      expect(parseDateInput('29/02/24')).toBe('2024-02-29');
      expect(parseDateInput('29/02/26')).toBeNull();
      expect(parseDateInput('13/10/202')).toBeNull();
    });

    it('returns null for invalid dates', () => {
      expect(parseDateInput('')).toBeNull();
      expect(parseDateInput('32/01/2026')).toBeNull();
      expect(parseDateInput('00/01/2026')).toBeNull();
      expect(parseDateInput('15/13/2026')).toBeNull();
      expect(parseDateInput('29/02/2026')).toBeNull(); // Non-leap year
      expect(parseDateInput('31/04/2026')).toBeNull(); // April has 30 days
      expect(parseDateInput('2026-10-13')).toBeNull();
      expect(parseDateInput('abc')).toBeNull();
    });
  });

  describe('todayISO', () => {
    it('returns an ISO date string in yyyy-mm-dd format for the specified timeZone', () => {
      const today = todayISO('Asia/Kolkata');
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('formatMonth', () => {
    it('formats year and month as English month name and year', () => {
      expect(formatMonth('2026-10-01')).toBe('October 2026');
      expect(formatMonth('2026-10')).toBe('October 2026');
      expect(formatMonth('2024-02-15')).toBe('February 2024');
    });

    it('returns empty string for invalid inputs', () => {
      expect(formatMonth('')).toBe('');
      expect(formatMonth('invalid')).toBe('');
    });
  });

  describe('weekdayLetters', () => {
    it('returns 7 weekday letters starting with Monday', () => {
      expect(weekdayLetters()).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    });
  });

  describe('weekdayNamesShort', () => {
    it('returns 7 short weekday names starting with Monday', () => {
      expect(weekdayNamesShort()).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    });
  });

  describe('monthNames', () => {
    it('returns 12 names starting with January', () => {
      const names = monthNames();
      expect(names).toHaveLength(12);
      expect(names[0]).toBe('January');
      expect(names[11]).toBe('December');
    });
  });

  describe('monthNamesShort', () => {
    it('returns 12 names starting with Jan', () => {
      const names = monthNamesShort();
      expect(names).toHaveLength(12);
      expect(names[0]).toBe('Jan');
      expect(names[11]).toBe('Dec');
    });
  });
});

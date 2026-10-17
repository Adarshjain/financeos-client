import { describe, expect, it } from 'vitest';

import {
  formatCount,
  formatDate,
  formatMonth,
  monthNames,
  monthNamesShort,
  parseDateInput,
  todayISO,
  weekdayLetters,
} from '../index';

describe('Dinero utils', () => {
  describe('formatCount', () => {
    it('formats counts under the max as strings', () => {
      expect(formatCount(0)).toBe('0');
      expect(formatCount(5)).toBe('5');
      expect(formatCount(99)).toBe('99');
    });

    it('formats counts above default max (99) with a plus suffix', () => {
      expect(formatCount(100)).toBe('99+');
      expect(formatCount(150)).toBe('99+');
    });

    it('respects a custom max threshold', () => {
      expect(formatCount(10, 9)).toBe('9+');
      expect(formatCount(5, 10)).toBe('5');
      expect(formatCount(10, 10)).toBe('10');
      expect(formatCount(11, 10)).toBe('10+');
    });

    it('handles numeric string counts', () => {
      expect(formatCount('5')).toBe('5');
      expect(formatCount('120')).toBe('99+');
    });
  });

  describe('formatDate', () => {
    it('formats input style as dd/mm/yyyy', () => {
      expect(formatDate('2026-10-13', 'input')).toBe('13/10/2026');
      expect(formatDate('2026-01-05', 'input')).toBe('05/01/2026');
    });

    it('formats list style as day + short month without leading zero', () => {
      expect(formatDate('2026-10-13', 'list')).toBe('13 Oct');
      expect(formatDate('2026-05-04', 'list')).toBe('4 May');
      expect(formatDate('2026-01-01', 'list')).toBe('1 Jan');
    });

    it('handles ISO timestamps with time component', () => {
      expect(formatDate('2026-10-13T14:30:00Z', 'input')).toBe('13/10/2026');
      expect(formatDate('2026-10-13T14:30:00Z', 'list')).toBe('13 Oct');
    });

    it('returns empty string for invalid or missing inputs', () => {
      expect(formatDate('', 'input')).toBe('');
      expect(formatDate('invalid', 'list')).toBe('');
    });
  });

  describe('parseDateInput', () => {
    it('parses valid dd/mm/yyyy input into ISO yyyy-mm-dd', () => {
      expect(parseDateInput('13/10/2026')).toBe('2026-10-13');
      expect(parseDateInput('05/01/2026')).toBe('2026-01-05');
      expect(parseDateInput('5/1/2026')).toBe('2026-01-05');
      expect(parseDateInput('29/02/2024')).toBe('2024-02-29'); // Leap year
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

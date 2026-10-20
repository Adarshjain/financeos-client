import { describe, expect, it } from 'vitest';

import {
  calendarSearch,
  chipLabel,
  chipTone,
  daySubtitle,
  dayTitle,
  defaultSelectedDay,
  groupByDate,
  monthOffset,
  monthsToCover,
  monthSummary,
  parseCalendarMonth,
  shiftMonth,
  shortAmount,
} from './calendarModel';
import type { ObligationItem } from './obligations';

const item = (o: Partial<ObligationItem>): ObligationItem =>
  ({ type: 'emi', status: 'upcoming', date: '2026-10-25', amount: 100, title: 'row', ...o }) as ObligationItem;

describe('month params', () => {
  it('keeps a month inside the shown range, else the current month', () => {
    expect(parseCalendarMonth('2026-11', '2026-10-13')).toBe('2026-11');
    expect(parseCalendarMonth('2027-09', '2026-10-13')).toBe('2027-09');
    expect(parseCalendarMonth('2027-10', '2026-10-13')).toBe('2026-10');
    expect(parseCalendarMonth('2026-09', '2026-10-13')).toBe('2026-10');
    expect(parseCalendarMonth('nope', '2026-10-13')).toBe('2026-10');
    expect(parseCalendarMonth(null, '2026-10-13')).toBe('2026-10');
  });

  it('shifts across a year and counts the offset', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2027-01', -1)).toBe('2026-12');
    expect(monthOffset('2026-10-13', '2027-02')).toBe(4);
  });

  it('fetches at least 3 months and enough to cover the shown month', () => {
    expect(monthsToCover('2026-10-13', '2026-10')).toBe(3);
    expect(monthsToCover('2026-10-13', '2026-12')).toBe(3);
    expect(monthsToCover('2026-10-13', '2027-03')).toBe(6);
    expect(monthsToCover('2026-10-13', '2027-09')).toBe(12);
  });

  it('leaves the month out of the query for the current month and keeps other params', () => {
    expect(calendarSearch('?bill=S1&month=2026-12', '2026-10', '2026-10-13')).toBe('?bill=S1');
    expect(calendarSearch('', '2026-11', '2026-10-13')).toBe('?month=2026-11');
    expect(calendarSearch('?month=2026-11', '2026-10', '2026-10-13')).toBe('');
  });
});

describe('days', () => {
  it('groups dated items by day and skips undated ones', () => {
    const a = item({ date: '2026-10-05' });
    const b = item({ date: '2026-10-05' });
    const c = item({ date: null });
    const map = groupByDate([a, b, c]);
    expect(map.get('2026-10-05')).toEqual([a, b]);
    expect(map.size).toBe(1);
  });

  it('selects today, else the first day with items, else the 1st', () => {
    const byDay = groupByDate([item({ date: '2026-11-20' }), item({ date: '2026-11-05' })]);
    expect(defaultSelectedDay('2026-10', '2026-10-13', byDay)).toBe('2026-10-13');
    expect(defaultSelectedDay('2026-11', '2026-10-13', byDay)).toBe('2026-11-05');
    expect(defaultSelectedDay('2026-12', '2026-10-13', byDay)).toBe('2026-12-01');
  });

  it('titles a day with its weekday and totals its items', () => {
    expect(dayTitle('2026-10-13')).toBe('Tue 13 Oct');
    expect(daySubtitle([item({ amount: 33900 }), item({ amount: 17540 })])).toBe('2 items · ₹51,440');
    expect(daySubtitle([item({ amount: null })])).toBe('1 item');
  });
});

describe('month summary', () => {
  it('sums amounts and counts overdue', () => {
    expect(monthSummary([item({ amount: 100 }), item({ amount: 50, status: 'overdue' })])).toBe('₹150 due · 1 overdue');
  });
  it('leaves out the parts with nothing in them', () => {
    expect(monthSummary([item({ amount: null })])).toBe('');
    expect(monthSummary([item({ amount: 100 })])).toBe('₹100 due');
  });
});

describe('chips', () => {
  it('shortens amounts', () => {
    expect(shortAmount(36603)).toBe('₹36.6K');
    expect(shortAmount(12000)).toBe('₹12K');
    expect(shortAmount(950)).toBe('₹950');
    expect(shortAmount(105219)).toBe('₹1.05L');
  });

  it('cuts a long name and always keeps the amount; "+" for money in', () => {
    expect(chipLabel(item({ title: 'Amex Platinum Travel bill', amount: 33900 }))).toBe('Amex Platinu… ₹33.9K');
    expect(chipLabel(item({ title: 'SBI statement', amount: null }))).toBe('SBI statement');
    expect(chipLabel(item({ title: 'Rahul', type: 'lending_due', direction: 'lent', amount: 15000 }))).toBe('Rahul +₹15K');
  });

  it('tones by state', () => {
    expect(chipTone(item({ status: 'overdue' }))).toBe('danger');
    expect(chipTone(item({ type: 'lending_due', direction: 'lent' }))).toBe('positive');
    expect(chipTone(item({ type: 'lending_due', direction: 'borrowed', daysUntil: 2 }))).toBe('info');
    expect(chipTone(item({ daysUntil: 0 }))).toBe('warning');
    expect(chipTone(item({ daysUntil: 7 }))).toBe('warning');
    expect(chipTone(item({ daysUntil: 8 }))).toBe('neutral');
  });
});

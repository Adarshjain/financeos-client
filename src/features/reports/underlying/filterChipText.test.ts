import { describe, expect, it } from 'vitest';

import { type FilterChipParts,filterChipText } from './filterChipText';

const today = { today: '2026-10-20' };
const parts = (p: Partial<FilterChipParts> & Pick<FilterChipParts, 'operator'>): FilterChipParts => ({ text: 'ignored', ...p });
const chip = (p: Partial<FilterChipParts> & Pick<FilterChipParts, 'operator'>) => filterChipText(parts(p), today);
const date = (operator: string, values: NonNullable<FilterChipParts['values']> = [], datePreset: string | null = null) =>
  chip({ operator, valueType: 'date', values, datePreset: datePreset as never });

describe('filterChipText from the server parts', () => {
  it('writes a between range compressed', () => {
    expect(date('between', ['2026-09-01', '2026-09-30'])).toBe('between 1–30 Sep');
    expect(date('between', ['2026-03-15', '2026-04-14'])).toBe('between 15 Mar – 14 Apr');
    expect(date('between', ['2026-03-15', '2027-03-14'])).toBe('between 15 Mar 26 – 14 Mar 27');
  });

  it('writes a single date as a day label after on, before and after', () => {
    expect(date('is', ['2026-10-13'])).toBe('on 13 Oct');
    expect(date('before', ['2026-10-13'])).toBe('before 13 Oct');
    expect(date('after', ['2026-01-05'])).toBe('after 5 Jan');
  });

  it('writes presets by the app\'s preset labels', () => {
    expect(date('this_month', [], 'this_month')).toBe('this month');
    expect(date('previous_month', [], 'previous_month')).toBe('last month');
    expect(date('current_fy', [], 'current_fy')).toBe('current FY');
    expect(date('all_time', [], 'all_time')).toBe('all time');
  });

  it('writes relative counts and billing cycles', () => {
    expect(date('last_x_days', [30])).toBe('last 30 days');
    expect(date('last_x_months', [1])).toBe('last 1 month');
    expect(date('next_x_days', [7])).toBe('next 7 days');
    expect(date('billing_cycles_ago', [2], 'billing_cycles_ago')).toBe('2 billing cycles ago');
    expect(date('this_billing_cycle', [], 'this_billing_cycle')).toBe('this billing cycle');
    expect(date('previous_billing_cycle', [], 'previous_billing_cycle')).toBe('previous billing cycle');
  });

  it('writes text, list and boolean filters', () => {
    expect(chip({ operator: 'is', valueType: 'text', values: ['Picker Bank'] })).toBe('is Picker Bank');
    expect(chip({ operator: 'is_not', valueType: 'text', values: ['Food'] })).toBe('is not Food');
    expect(chip({ operator: 'in', valueType: 'text', values: ['Food', 'Fuel'] })).toBe('in Food, Fuel');
    expect(chip({ operator: 'not_in', valueType: 'text', values: ['Food', 'Fuel'] })).toBe('not in Food, Fuel');
    expect(chip({ operator: 'contains', valueType: 'text', values: ['HDFC'] })).toBe('contains HDFC');
    expect(chip({ operator: 'is', valueType: 'boolean', values: [false] })).toBe('is No');
    expect(chip({ operator: 'is', valueType: 'boolean', values: [true] })).toBe('is Yes');
  });

  it('writes amounts as money, and other numbers and percents plainly', () => {
    expect(chip({ operator: 'between', valueType: 'number', valueFormat: 'currency', values: [100, 1500.5] })).toBe(
      'between ₹100 and ₹1,500.50',
    );
    expect(chip({ operator: 'greater_than', valueType: 'number', valueFormat: 'currency', values: [500] })).toBe(
      'greater than ₹500',
    );
    expect(chip({ operator: 'less_than', valueType: 'number', valueFormat: 'number', values: [3] })).toBe('less than 3');
    expect(chip({ operator: 'equals', valueType: 'number', valueFormat: 'percent', values: [12] })).toBe('equals 12%');
  });
});

describe('filterChipText fallback to the server text', () => {
  const old = (text: string) => filterChipText({ operator: 'x', text }, today);

  it('reads the server wording when parts are missing', () => {
    expect(old('Between 01/09/2026 and 30/09/2026')).toBe('between 1–30 Sep');
    expect(old('After 05/01/2026')).toBe('after 5 Jan');
    expect(old('Last 30 days')).toBe('last 30 days');
    expect(old('is Picker Bank')).toBe('is Picker Bank');
  });
});

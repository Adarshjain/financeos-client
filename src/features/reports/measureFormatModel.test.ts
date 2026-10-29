import { describe, expect, it } from 'vitest';

import { formatMeasure } from './measureFormatModel';

describe('formatMeasure', () => {
  it('null and undefined are a dash', () => {
    expect(formatMeasure(null, {})).toBe('—');
    expect(formatMeasure(undefined, { format: 'currency' })).toBe('—');
  });
  it('count is a grouped integer', () => {
    expect(formatMeasure(1234567, { aggregation: 'count' })).toBe('12,34,567');
  });
  it('money by hint, by explicit flag and by field name', () => {
    expect(formatMeasure(184320.45, { format: 'currency' })).toBe('₹1,84,320.45');
    expect(formatMeasure(1500, { money: true })).toBe('₹1,500');
    expect(formatMeasure(1500, { field: 'amount' })).toBe('₹1,500');
    expect(formatMeasure(1500, { field: 'amount', format: 'number' })).toBe('1,500');
    expect(formatMeasure(1500, { field: 'amount', money: false })).toBe('1,500');
  });
  it('wholeRupees rounds; otherwise paise only when non-zero', () => {
    expect(formatMeasure(184320.45, { money: true, wholeRupees: true })).toBe('₹1,84,320');
    expect(formatMeasure(100, { money: true })).toBe('₹100');
  });
  it('negative money uses U+2212', () => {
    expect(formatMeasure(-1250.5, { money: true })).toBe('−₹1,250.50');
    expect(formatMeasure(-1250, { money: true, wholeRupees: true })).toBe('−₹1,250');
  });
  it('percent to two decimals', () => {
    expect(formatMeasure(12.345, { format: 'percent' })).toBe('12.35%');
    expect(formatMeasure(12, { format: 'percent' })).toBe('12%');
  });
  it('other numbers to two decimals trimmed', () => {
    expect(formatMeasure(1234.5678, {})).toBe('1,234.57');
    expect(formatMeasure(3, { format: 'number' })).toBe('3');
  });
});

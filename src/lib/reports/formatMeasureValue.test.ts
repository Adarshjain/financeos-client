import { describe, expect, it } from 'vitest';

import { formatMeasureValue } from './formatMeasureValue';

describe('formatMeasureValue', () => {
  it('renders counts as plain integers, never as currency', () => {
    expect(formatMeasureValue(1234, { field: 'amount', aggregation: 'count' })).toBe('1,234');
  });

  it('renders money fields as currency', () => {
    expect(formatMeasureValue(12345.67, { field: 'amount', aggregation: 'sum' })).toBe('₹12,345.67');
  });

  it('renders other numerics to two decimals', () => {
    expect(formatMeasureValue(12.3456, { field: 'ratio', aggregation: 'avg' })).toBe('12.35');
  });

  it('formats the same field identically regardless of caller', () => {
    // The whole point of the shared helper: raw rows pass no aggregation.
    const asRawColumn = formatMeasureValue(500, { field: 'refundAmount' });
    const asMeasure = formatMeasureValue(500, { field: 'refundAmount', aggregation: 'sum' });
    expect(asRawColumn).toBe(asMeasure);
  });

  it('returns an em dash for absent values', () => {
    expect(formatMeasureValue(null, { field: 'amount' })).toBe('—');
    expect(formatMeasureValue(undefined, { field: 'amount' })).toBe('—');
  });

  it('preserves zero rather than treating it as absent', () => {
    expect(formatMeasureValue(0, { field: 'amount', aggregation: 'sum' })).toBe('₹0.00');
  });

  it('falls back to a plain number when no field is supplied', () => {
    expect(formatMeasureValue(42, {})).toBe('42');
  });
});

describe('formatMeasureValue: money override and whole rupees', () => {
  it('lets `money` win over the field name', () => {
    expect(formatMeasureValue(1234.5, { field: 'spend', money: true })).toBe('₹1,234.50');
    expect(formatMeasureValue(1234.5, { field: 'amount', money: false })).toBe('1,234.5');
  });

  it('infers money from the format hint or the name when `money` is omitted', () => {
    expect(formatMeasureValue(10, { field: 'spend', format: 'currency' })).toBe('₹10.00');
    expect(formatMeasureValue(10, { field: 'spend' })).toBe('10');
  });

  it('prints whole rupees with Indian grouping and a leading minus', () => {
    expect(formatMeasureValue(1198842.4, { money: true, wholeRupees: true })).toBe('₹11,98,842');
    expect(formatMeasureValue(-1500, { money: true, wholeRupees: true })).toBe('−₹1,500');
    expect(formatMeasureValue(-1500.5, { money: true })).toBe('−₹1,500.50');
  });

  it('leaves counts and percents alone', () => {
    expect(formatMeasureValue(1820, { money: true, aggregation: 'count', wholeRupees: true })).toBe('1,820');
    expect(formatMeasureValue(62.5, { format: 'percent' })).toBe('62.5%');
  });
});

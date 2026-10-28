import { describe, expect, it } from 'vitest';

import { formatCount, formatPercent, formatQuantity, pluralize } from './number';

describe('formatPercent', () => {
  it('returns empty for null and NaN', () => {
    expect(formatPercent(null)).toBe('');
    expect(formatPercent(undefined)).toBe('');
    expect(formatPercent(NaN)).toBe('');
  });
  it('defaults to one decimal with trailing zeros trimmed', () => {
    expect(formatPercent(34.25)).toBe('34.3%');
    expect(formatPercent(34)).toBe('34%');
    expect(formatPercent(34.04)).toBe('34%');
  });
  it('honours decimals', () => {
    expect(formatPercent(34.256, { decimals: 2 })).toBe('34.26%');
    expect(formatPercent(34.6, { decimals: 0 })).toBe('35%');
  });
  it('fixed keeps trailing zeros', () => {
    expect(formatPercent(1.2, { decimals: 2, fixed: true, sign: 'always' })).toBe('+1.20%');
    expect(formatPercent(34, { fixed: true })).toBe('34.0%');
  });
  it('signs', () => {
    expect(formatPercent(-5)).toBe('−5%');
    expect(formatPercent(10, { sign: 'always' })).toBe('+10%');
    expect(formatPercent(-0.3, { sign: 'always' })).toBe('−0.3%');
  });
  it('a value that rounds to zero is unsigned', () => {
    expect(formatPercent(-0.01)).toBe('0%');
    expect(formatPercent(0.01, { sign: 'always' })).toBe('0%');
    expect(formatPercent(-0.001, { decimals: 2, fixed: true, sign: 'always' })).toBe('0.00%');
  });
});

describe('formatCount', () => {
  it('groups the Indian way with no decimals', () => {
    expect(formatCount(1234567)).toBe('12,34,567');
    expect(formatCount(0)).toBe('0');
  });
  it('returns empty for null and NaN', () => {
    expect(formatCount(null)).toBe('');
    expect(formatCount(undefined)).toBe('');
    expect(formatCount(NaN)).toBe('');
  });
  it('appends a unit string', () => {
    expect(formatCount(12, 'pts')).toBe('12 pts');
  });
  it('picks the plural form from a tuple', () => {
    expect(formatCount(3, ['entry', 'entries'])).toBe('3 entries');
    expect(formatCount(1, ['entry', 'entries'])).toBe('1 entry');
    expect(formatCount(0, ['entry', 'entries'])).toBe('0 entries');
  });
});

describe('pluralize', () => {
  it('returns the word only', () => {
    expect(pluralize(1, 'bill', 'bills')).toBe('bill');
    expect(pluralize(2, 'bill', 'bills')).toBe('bills');
    expect(pluralize(0, 'bill', 'bills')).toBe('bills');
  });
});

describe('formatQuantity', () => {
  it('trims trailing zeros and groups', () => {
    expect(formatQuantity(325.11)).toBe('325.11');
    expect(formatQuantity(40)).toBe('40');
    expect(formatQuantity(1234.5678)).toBe('1,234.5678');
    expect(formatQuantity(1234.56789)).toBe('1,234.5679');
  });
  it('honours maxDecimals', () => {
    expect(formatQuantity(1.23456, 2)).toBe('1.23');
  });
  it('returns empty for null and NaN', () => {
    expect(formatQuantity(null)).toBe('');
    expect(formatQuantity(NaN)).toBe('');
  });
});

import { describe, expect, it } from 'vitest';

import { formatMoney } from './money';

describe('formatMoney', () => {
  it('returns empty for null, undefined, empty string and NaN', () => {
    expect(formatMoney(null)).toBe('');
    expect(formatMoney(undefined)).toBe('');
    expect(formatMoney('')).toBe('');
    expect(formatMoney(NaN)).toBe('');
    expect(formatMoney('abc')).toBe('');
  });

  it('parses strings and groups the Indian way', () => {
    expect(formatMoney('1198842')).toBe('₹11,98,842');
    expect(formatMoney(0)).toBe('₹0');
  });

  describe('decimals', () => {
    it('whole rounds to the rupee by default', () => {
      expect(formatMoney(1234.5)).toBe('₹1,235');
      expect(formatMoney(1234.4)).toBe('₹1,234');
    });
    it('auto shows paise only when non-zero', () => {
      expect(formatMoney(1234.5, { decimals: 'auto' })).toBe('₹1,234.50');
      expect(formatMoney(1234, { decimals: 'auto' })).toBe('₹1,234');
      expect(formatMoney(295030.5, { decimals: 'auto', symbol: false })).toBe('2,95,030.50');
    });
    it('auto is not fooled by float noise', () => {
      expect(formatMoney(0.1 + 0.2, { decimals: 'auto' })).toBe('₹0.30');
      expect(formatMoney(100.00000000001, { decimals: 'auto' })).toBe('₹100');
      expect(formatMoney(1000 + 0.1 + 0.2 - 0.3, { decimals: 'auto' })).toBe('₹1,000');
    });
    it('exact always shows two decimals', () => {
      expect(formatMoney(1234, { decimals: 'exact' })).toBe('₹1,234.00');
      expect(formatMoney(0.5, { decimals: 'exact' })).toBe('₹0.50');
    });
  });

  describe('sign', () => {
    it('auto signs negatives with U+2212 before the symbol', () => {
      expect(formatMoney(-1234)).toBe('−₹1,234');
      expect(formatMoney(1234)).toBe('₹1,234');
      expect(formatMoney(-1234)).not.toContain('-');
    });
    it('always signs both directions but not zero', () => {
      expect(formatMoney(1234, { sign: 'always' })).toBe('+₹1,234');
      expect(formatMoney(-1234, { sign: 'always' })).toBe('−₹1,234');
      expect(formatMoney(0, { sign: 'always' })).toBe('₹0');
    });
    it('none drops the sign', () => {
      expect(formatMoney(-1234, { sign: 'none' })).toBe('₹1,234');
    });
    it('never shows negative zero', () => {
      expect(formatMoney(-0)).toBe('₹0');
      expect(formatMoney(-0.4)).toBe('₹0');
      expect(formatMoney(-0.4, { sign: 'always' })).toBe('₹0');
      expect(formatMoney(0.4, { sign: 'always' })).toBe('₹0');
      expect(formatMoney(-0.004, { decimals: 'exact', sign: 'always' })).toBe('₹0.00');
      expect(formatMoney(-0.4, { decimals: 'exact', sign: 'always' })).toBe('−₹0.40');
    });
  });

  describe('compact', () => {
    it('keeps full figures below a lakh', () => {
      expect(formatMoney(99999, { compact: true })).toBe('₹99,999');
      expect(formatMoney(99999.4, { compact: true })).toBe('₹99,999');
      expect(formatMoney(99999.6, { compact: true })).toBe('₹1L');
      expect(formatMoney(999.6, { compact: 'k' })).toBe('₹1K');
      expect(formatMoney(999.4, { compact: 'k' })).toBe('₹999');
      expect(formatMoney(9999999.6, { compact: true })).toBe('₹1Cr');
      expect(formatMoney(1234.5, { compact: true, decimals: 'exact' })).toBe('₹1,234.50');
    });
    it('shortens lakhs and crores', () => {
      expect(formatMoney(100000, { compact: true })).toBe('₹1L');
      expect(formatMoney(299000, { compact: true })).toBe('₹2.99L');
      expect(formatMoney(300000, { compact: true })).toBe('₹3L');
      expect(formatMoney(9999999, { compact: true })).toBe('₹1Cr');
      expect(formatMoney(10000000, { compact: true })).toBe('₹1Cr');
      expect(formatMoney(12000000, { compact: true })).toBe('₹1.2Cr');
    });
    it('applies sign and symbol rules', () => {
      expect(formatMoney(-12000000, { compact: true })).toBe('−₹1.2Cr');
      expect(formatMoney(250000, { compact: true, sign: 'always' })).toBe('+₹2.5L');
      expect(formatMoney(250000, { compact: true, symbol: false })).toBe('2.5L');
    });
    it("'k' also shortens thousands", () => {
      expect(formatMoney(999, { compact: 'k' })).toBe('₹999');
      expect(formatMoney(1000, { compact: 'k' })).toBe('₹1K');
      expect(formatMoney(50000, { compact: 'k' })).toBe('₹50K');
      expect(formatMoney(1250, { compact: 'k' })).toBe('₹1.25K');
      expect(formatMoney(99999, { compact: 'k' })).toBe('₹1L');
      expect(formatMoney(100000, { compact: 'k' })).toBe('₹1L');
    });
  });

  it('symbol false drops the rupee sign', () => {
    expect(formatMoney(1234, { symbol: false })).toBe('1,234');
    expect(formatMoney(-1234, { symbol: false })).toBe('−1,234');
  });
});

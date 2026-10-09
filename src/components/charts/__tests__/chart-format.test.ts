import { describe, expect, it } from 'vitest';

import {
  formatCompact,
  niceTicks,
  seriesColor,
  truncateLabel,
  valueFormat,
} from '@/components/charts/chart-format';

describe('formatCompact', () => {
  it.each([
    [950, '950'],
    [12.345, '12.3'],
    [1.234, '1.23'],
    [1000, '1K'],
    [1500, '1.5K'],
    [45000, '45K'],
    [99999, '100K'],
    [100000, '1L'],
    [350000, '3.5L'],
    [12500000, '1.25Cr'],
    [2500000000, '250Cr'],
    [0, '0'],
  ])('uses Indian units for %d', (value, expected) => {
    expect(formatCompact(value)).toBe(expected);
  });

  it('prefixes ₹ for money and keeps the sign in front', () => {
    expect(formatCompact(150000, true)).toBe('₹1.5L');
    expect(formatCompact(-150000, true)).toBe('-₹1.5L');
    expect(formatCompact(-1200)).toBe('-1.2K');
  });

  it('returns an empty label for non-finite input', () => {
    expect(formatCompact(Number.NaN)).toBe('');
    expect(formatCompact(Number.POSITIVE_INFINITY, true)).toBe('');
  });
});

describe('valueFormat', () => {
  it('drops paise on whole rupees but keeps them when present', () => {
    const f = valueFormat(true);
    expect(f.full(25000)).toBe('₹25,000');
    expect(f.full(1234.5)).toBe('₹1,234.50');
    expect(f.compact(25000)).toBe('₹25K');
  });

  it('formats non-money values as plain grouped numbers', () => {
    const f = valueFormat(false);
    expect(f.full(123456.789)).toBe('1,23,456.79');
    expect(f.compact(123456)).toBe('1.23L');
  });
});

describe('truncateLabel', () => {
  it('keeps labels within the limit untouched', () => {
    expect(truncateLabel('Groceries', 12)).toBe('Groceries');
    expect(truncateLabel('Exactly12chr', 12)).toBe('Exactly12chr');
  });

  it('cuts longer labels to the limit including the ellipsis', () => {
    expect(truncateLabel('Entertainment & Movies', 8)).toBe('Enterta…');
    expect(truncateLabel('Entertainment & Movies', 8)).toHaveLength(8);
  });

  it('trims a trailing space before the ellipsis', () => {
    expect(truncateLabel('Food & Dining', 6)).toBe('Food…');
  });
});

describe('seriesColor', () => {
  it('maps slots 0–7 onto the --chart-1..8 tokens', () => {
    expect(seriesColor(0)).toBe('hsl(var(--chart-1))');
    expect(seriesColor(7)).toBe('hsl(var(--chart-8))');
  });

  it('wraps past the eighth slot (only reached by non-additive overflow)', () => {
    expect(seriesColor(8)).toBe('hsl(var(--chart-1))');
  });
});

describe('niceTicks', () => {
  it('fits the data without overshooting a whole step', () => {
    expect(niceTicks(0, 25000)).toEqual([0, 5000, 10000, 15000, 20000, 25000]);
    expect(niceTicks(0, 58500)).toEqual([0, 20000, 40000, 60000]);
    expect(niceTicks(0, 420000)).toEqual([
      0, 100000, 200000, 300000, 400000, 500000,
    ]);
  });

  it('uses 2.5× steps when they are the tightest fit', () => {
    expect(niceTicks(0, 12000)).toEqual([0, 2500, 5000, 7500, 10000, 12500]);
  });

  it('spans negative values across zero', () => {
    expect(niceTicks(-12000, 30000)).toEqual([
      -20000, -10000, 0, 10000, 20000, 30000,
    ]);
  });

  it('hugs a range that does not start at zero', () => {
    expect(niceTicks(1210, 1445, 4)).toEqual([1200, 1300, 1400, 1500]);
  });

  it('respects the interval cap', () => {
    expect(niceTicks(0, 156000, 4)).toHaveLength(5);
    expect(niceTicks(0, 156000).length - 1).toBeLessThanOrEqual(5);
  });

  it('accepts reversed bounds', () => {
    expect(niceTicks(25000, 0)).toEqual(niceTicks(0, 25000));
  });

  it('gives an all-zero series a unit axis', () => {
    expect(niceTicks(0, 0)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
  });

  it('pads a single non-zero value so it sits inside the axis', () => {
    const ticks = niceTicks(500, 500);
    expect(ticks[0]).toBeLessThan(500);
    expect(ticks[ticks.length - 1]).toBeGreaterThan(500);
  });

  it('returns no ticks for non-finite bounds', () => {
    expect(niceTicks(Number.NaN, 10)).toEqual([]);
  });
});

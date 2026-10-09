import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  aggregationLabel,
  asFormat,
  formatAmount,
  formatKpiValue,
  sanitizeFilename,
  saveBlob,
  sortParam,
  sourceKey,
  underlyingCsvFilename,
} from '../underlying.helpers';

describe('asFormat', () => {
  it('keeps the three known formats', () => {
    expect(asFormat('currency')).toBe('currency');
    expect(asFormat('number')).toBe('number');
    expect(asFormat('percent')).toBe('percent');
  });

  it('drops anything else', () => {
    expect(asFormat('date')).toBeUndefined();
    expect(asFormat(null)).toBeUndefined();
    expect(asFormat(undefined)).toBeUndefined();
  });
});

describe('sortParam', () => {
  it('writes key,dir', () => {
    expect(sortParam({ key: 'date', direction: 'desc' })).toBe('date,desc');
  });

  it('is undefined for the default order', () => {
    expect(sortParam(null)).toBeUndefined();
  });
});

describe('sourceKey', () => {
  it('keeps what identifies each source kind', () => {
    expect(sourceKey({ kind: 'saved', reportId: 'r1' })).toEqual({ kind: 'saved', reportId: 'r1' });
    const request = {
      type: 'KPI' as const,
      datasource: 'transactions',
      definition: { measure: 'amount', aggregation: 'sum' as const, filters: [] },
    };
    expect(sourceKey({ kind: 'adhoc', request })).toEqual({ kind: 'adhoc', request });
    expect(sourceKey({ kind: 'builtin', key: 'net_worth', params: { a: 1 } })).toEqual({
      kind: 'builtin',
      key: 'net_worth',
      params: { a: 1 },
    });
  });
});

describe('aggregationLabel', () => {
  it('names every aggregation', () => {
    expect(aggregationLabel('sum')).toBe('Sum');
    expect(aggregationLabel('avg')).toBe('Average');
    expect(aggregationLabel('count')).toBe('Count');
    expect(aggregationLabel('min')).toBe('Min');
    expect(aggregationLabel('max')).toBe('Max');
  });

  it('is case-insensitive', () => {
    expect(aggregationLabel('SUM')).toBe('Sum');
  });

  it('passes an unknown aggregation through', () => {
    expect(aggregationLabel('median')).toBe('median');
  });
});

describe('formatKpiValue', () => {
  it('formats like the KPI tile: currency, count as an integer, null as a dash', () => {
    expect(formatKpiValue(4500, { measure: 'amount', aggregation: 'sum', format: 'currency' })).toBe(
      formatAmount(4500, 'currency'),
    );
    expect(formatKpiValue(1234, { measure: 'amount', aggregation: 'count', format: 'currency' })).toBe('1,234');
    expect(formatKpiValue(null, { measure: 'amount', aggregation: 'sum', format: 'currency' })).toBe('—');
  });
});

describe('formatAmount', () => {
  it('honours the format hint', () => {
    expect(formatAmount(12.5, 'percent')).toBe('12.5%');
    expect(formatAmount(1234.5, 'number')).toBe('1,234.5');
    expect(formatAmount(1000, 'currency')).toMatch(/₹/);
  });

  it('prints a plain number without a known hint', () => {
    expect(formatAmount(1234, null)).toBe('1,234');
  });
});

describe('sanitizeFilename', () => {
  it('strips every reserved character', () => {
    expect(sanitizeFilename('a/b\\c:d*e?f"g<h>i|j')).toBe('abcdefghij');
  });

  it('strips control characters', () => {
    expect(sanitizeFilename('a\u0000b\u001fc\u007fd')).toBe('abcd');
  });

  it('turns tabs and newlines into single spaces', () => {
    expect(sanitizeFilename('Spend\tthis\nmonth')).toBe('Spend this month');
  });

  it('collapses whitespace, including gaps left by stripped characters, and trims', () => {
    expect(sanitizeFilename('  Food  /  Fuel  ')).toBe('Food Fuel');
  });

  it('never adds hyphens and keeps the en dash of a range', () => {
    expect(sanitizeFilename('Spend Jul – Aug 26')).toBe('Spend Jul – Aug 26');
  });
});

describe('underlyingCsvFilename', () => {
  it('is "<title> <range>.csv" with the year always present', () => {
    expect(underlyingCsvFilename('Card spend', { from: '2026-09-01', to: '2026-09-30' })).toBe(
      'Card spend Sep 26.csv',
    );
  });

  it('names an unbounded period for today', () => {
    expect(underlyingCsvFilename('Net worth', null, '2026-10-09')).toBe('Net worth 9 Oct 26.csv');
  });

  it('sanitises the title', () => {
    expect(underlyingCsvFilename('Food / Fuel: total?', { from: '2026-10-01', to: '2026-10-09' })).toBe(
      'Food Fuel total 1–9 Oct 26.csv',
    );
  });
});

describe('saveBlob', () => {
  const createObjectURL = vi.fn(() => 'blob:x');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('clicks a temporary download link, removes it, then revokes the URL', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('Card spend Sep 26.csv');
      expect(this.href).toBe('blob:x');
      expect(document.body.contains(this)).toBe(true);
    });
    const blob = new Blob(['a,b']);
    saveBlob(blob, 'Card spend Sep 26.csv');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:x');
  });
});

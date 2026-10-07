import { describe, expect, it } from 'vitest';

import {
  type DividendRow,
  expectedNet,
  filterDividends,
  impliedTds,
  mergeDividends,
  pickBestDividend,
} from '../dividendLinkHelpers';

const div = (o: Partial<DividendRow> & { id: string }): DividendRow =>
  ({
    symbol: 'INFY',
    instrumentName: 'Infosys',
    brokerName: 'Zerodha',
    amount: 1000,
    payDate: '2026-07-01',
    receiptStatus: 'awaiting',
    ...o,
  }) as DividendRow;

describe('dividendLinkHelpers', () => {
  it('expectedNet subtracts TDS when present', () => {
    expect(expectedNet(div({ id: 'a', amount: 1000, tds: 100 }))).toBe(900);
    expect(expectedNet(div({ id: 'a', amount: 1000 }))).toBe(1000);
  });

  it('mergeDividends flattens and sorts by payDate desc', () => {
    const merged = mergeDividends([
      [div({ id: 'a', payDate: '2026-01-01' })],
      [div({ id: 'b', payDate: '2026-03-01' })],
      [div({ id: 'c', payDate: '2026-02-01' })],
    ]);
    expect(merged.map((d) => d.id)).toEqual(['b', 'c', 'a']);
  });

  it('filterDividends matches symbol, instrument name and broker, case-insensitively; blank keeps all', () => {
    const rows = [
      div({ id: 'a' }),
      div({ id: 'b', symbol: 'TCS', instrumentName: 'Tata Consultancy', brokerName: 'Groww' }),
    ];
    expect(filterDividends(rows, '  ')).toHaveLength(2);
    expect(filterDividends(rows, 'infy').map((d) => d.id)).toEqual(['a']);
    expect(filterDividends(rows, 'consult').map((d) => d.id)).toEqual(['b']);
    expect(filterDividends(rows, 'GROWW').map((d) => d.id)).toEqual(['b']);
    expect(filterDividends(rows, 'zzz')).toEqual([]);
  });

  describe('pickBestDividend', () => {
    it('returns undefined for no rows', () => {
      expect(pickBestDividend([], 100, '2026-07-01')).toBeUndefined();
    });

    it('prefers an exact gross match (±1) over everything', () => {
      const rows = [div({ id: 'ninety', amount: 1111 }), div({ id: 'exact', amount: 1000.8 })];
      expect(pickBestDividend(rows, 1000, '2026-07-01')?.id).toBe('exact');
    });

    it('falls back to the 90% (10% TDS) rule', () => {
      const rows = [div({ id: 'far', amount: 5000, payDate: '2026-07-01' }), div({ id: 'ninety', amount: 2000 })];
      expect(pickBestDividend(rows, 1800.5, '2026-07-01')?.id).toBe('ninety');
    });

    it('otherwise picks the nearest pay date', () => {
      const rows = [
        div({ id: 'old', amount: 5000, payDate: '2026-01-01' }),
        div({ id: 'near', amount: 7000, payDate: '2026-06-28' }),
      ];
      expect(pickBestDividend(rows, 100, '2026-07-01')?.id).toBe('near');
    });
  });

  describe('impliedTds', () => {
    it('returns the gap when no TDS, credit is lower and gap <= 25%', () => {
      expect(impliedTds(div({ id: 'a', amount: 1000 }), 900)).toBe(100);
      expect(impliedTds(div({ id: 'a', amount: 1000 }), 750)).toBe(250);
    });

    it('is null when TDS already recorded, credit >= gross, gap > 25%, or nothing selected', () => {
      expect(impliedTds(div({ id: 'a', amount: 1000, tds: 50 }), 900)).toBeNull();
      expect(impliedTds(div({ id: 'a', amount: 1000 }), 1000)).toBeNull();
      expect(impliedTds(div({ id: 'a', amount: 1000 }), 1100)).toBeNull();
      expect(impliedTds(div({ id: 'a', amount: 1000 }), 749)).toBeNull();
      expect(impliedTds(undefined, 900)).toBeNull();
    });
  });
});

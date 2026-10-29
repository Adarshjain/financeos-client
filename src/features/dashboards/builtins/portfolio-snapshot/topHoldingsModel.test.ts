import { describe, expect, it } from 'vitest';

import type { Position } from '@/lib/types';

import { topHoldings } from './topHoldingsModel';

const pos = (name: string, over: Partial<Position> = {}): Position =>
  ({
    holdingId: `h-${name}`,
    brokerAccountId: 'b',
    brokerName: 'Zerodha',
    provider: 'zerodha',
    instrument: { id: `i-${name}`, type: 'stock', name: `${name} Ltd`, symbol: name },
    quantity: 10,
    currentValue: 1000,
    dayChangePct: 1.5,
    ...over,
  }) as Position;

describe('topHoldings', () => {
  it('the three largest by current value, largest first, with symbol, quantity and day move', () => {
    const rows = topHoldings([
      pos('A', { currentValue: 500 }),
      pos('B', { currentValue: 9000, quantity: 60, dayChangePct: -0.8 }),
      pos('C', { currentValue: 3000 }),
      pos('D', { currentValue: 7000 }),
    ]);
    expect(rows.map((r) => r.label)).toEqual(['B', 'D', 'C']);
    expect(rows[0]).toEqual({ holdingId: 'h-B', instrumentId: 'i-B', label: 'B', quantity: 60, dayChangePct: -0.8 });
  });

  it('a fund without a symbol is named by its name; a holding without two prices has no day move', () => {
    const rows = topHoldings([pos('F', { instrument: { id: 'i-F', type: 'mutual_fund', name: 'Parag Parikh Flexi' }, dayChangePct: null })]);
    expect(rows[0]).toMatchObject({ label: 'Parag Parikh Flexi', dayChangePct: null });
  });

  it('closed or valueless holdings are left out; wire decimals are read as numbers', () => {
    const rows = topHoldings([
      pos('Closed', { quantity: 0 }),
      pos('Empty', { currentValue: null }),
      pos('Str', { currentValue: '2500.5', quantity: '12.5', dayChangePct: '2.1' }),
    ]);
    expect(rows).toEqual([{ holdingId: 'h-Str', instrumentId: 'i-Str', label: 'Str', quantity: 12.5, dayChangePct: 2.1 }]);
  });

  it('nothing open: no rows', () => {
    expect(topHoldings([])).toEqual([]);
  });
});

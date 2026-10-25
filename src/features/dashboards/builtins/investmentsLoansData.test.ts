import { describe, expect, it } from 'vitest';

import { bookedGainsRequest, num, positionsValueRequest } from './investmentsLoansData';

describe('num', () => {
  it('reads numbers and decimal strings; absent or not a number is null', () => {
    expect(num(12)).toBe(12);
    expect(num('12.5')).toBe(12.5);
    expect(num('')).toBeNull();
    expect(num(null)).toBeNull();
    expect(num(undefined)).toBeNull();
    expect(num('abc')).toBeNull();
    expect(num(Number.NaN)).toBeNull();
  });
});

describe('drill requests', () => {
  it('positionsValueRequest: open holdings only, plus any extra clause', () => {
    const extra = { field: 'assetClass', operator: 'is', value: 'GOLD' } as const;
    expect(positionsValueRequest().definition.filters).toEqual([{ field: 'isOpen', operator: 'is', value: true }]);
    expect(positionsValueRequest([extra]).definition.filters).toEqual([
      { field: 'isOpen', operator: 'is', value: true },
      extra,
    ]);
  });

  it('bookedGainsRequest: this FY, the term, equity-oriented', () => {
    expect(bookedGainsRequest('long').definition.filters).toEqual([
      { field: 'sellDate', operator: 'current_fy' },
      { field: 'term', operator: 'is', value: 'long' },
      { field: 'taxClass', operator: 'is', value: 'EQUITY_ORIENTED' },
    ]);
  });
});

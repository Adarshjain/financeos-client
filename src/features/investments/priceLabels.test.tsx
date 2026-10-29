import { describe, expect, it } from 'vitest';

import { holding } from './holding/holding.fixtures';
import { holdingFigures } from './holding/holdingModel';
import { header } from './holdings/holdings.fixtures';
import { heroModel } from './holdings/holdingsModel';

const OPEN = new Date('2026-10-13T06:15:00Z'); // 11:45 IST, Tuesday
const CLOSED = new Date('2026-10-13T12:00:00Z'); // 17:30 IST

describe('hero price line', () => {
  const line = (priceAt: string | null, now: Date) => heroModel({ ...header, priceAsOf: '2026-10-13', priceAt }, now).priceLine;
  it('says Live with the time during market hours for a price from today', () => {
    expect(line('2026-10-13T11:45:00+05:30', OPEN)).toBe('Live · 11:45 am');
  });
  it('says Closed with the day and time otherwise', () => {
    expect(line('2026-10-13T15:30:00+05:30', CLOSED)).toBe('Closed · 13 Oct, 3:30 pm');
    expect(line('2026-10-12T15:30:00+05:30', OPEN)).toBe('Closed · 13 Oct, 3:30 pm');
  });
  it('keeps the plain wording when the price has no time', () => {
    expect(line(null, OPEN)).toBe('Prices as of 13 Oct');
    expect(heroModel({ ...header, priceAsOf: null, priceAt: null }, OPEN).priceLine).toBeNull();
  });
});

describe('holding LTP line', () => {
  const ctx = (priceAt: string | null, now: Date, extra = {}) =>
    holdingFigures({ ...holding, priceAsOf: '2026-10-13', priceAt, ...extra }, null, now).find((f) => f.id === 'ltp')!.context;
  it('says Live / Closed in place of the source when the price has a time', () => {
    expect(ctx('2026-10-13T11:45:00+05:30', OPEN)).toBe('Live · 11:45 am');
    expect(ctx('2026-10-13T15:30:00+05:30', CLOSED)).toBe('Closed · 13 Oct, 3:30 pm');
  });
  it('keeps the current text without a time', () => {
    expect(ctx(null, OPEN)).toBe('13 Oct');
  });
  it('says neither Live nor Closed when the price has a time but no date', () => {
    expect(ctx('2026-10-13T11:45:00+05:30', OPEN, { priceAsOf: null })).toBeUndefined();
  });
});

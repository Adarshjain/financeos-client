import { describe, expect, it } from 'vitest';

import { holdingRow } from './holdings.fixtures';
import { holdingListRow, holdingPriceNote } from './holdingsModel';

describe('holdingPriceNote', () => {
  it('says Delisted before Not trading before the unpriced note', () => {
    expect(holdingPriceNote({ delisted: true, notTrading: true, noPrice: true })).toBe('Delisted');
    expect(holdingPriceNote({ delisted: false, notTrading: true, noPrice: true })).toBe('Not trading');
    expect(holdingPriceNote({ delisted: false, notTrading: false, noPrice: true })).toBe('at cost (no price)');
    expect(holdingPriceNote({ delisted: false, notTrading: false, noPrice: false })).toBeNull();
  });
});

describe('holdingListRow status', () => {
  it('a delisted row is a priced row worth zero, not No price', () => {
    const row = holdingListRow(holdingRow({ delisted: true, noPrice: true, ltp: 0, currentValue: 0, unrealised: -63200, unrealisedPct: -100 }));
    expect(row.priceNote).toBe('Delisted');
    expect(row.noPrice).toBe(false);
    expect(row.ltp).toBe('0.00');
    expect(row.current).toBe('₹0');
    expect(row.pnl).not.toBeNull();
  });

  it('a not-trading row says so and does not offer the no-price note', () => {
    const row = holdingListRow(holdingRow({ notTrading: true }));
    expect(row.priceNote).toBe('Not trading');
    expect(row.noPrice).toBe(false);
  });

  it('keeps the unpriced label when neither flag is set', () => {
    const row = holdingListRow(holdingRow({ noPrice: true, ltp: null }));
    expect(row.priceNote).toBe('at cost (no price)');
    expect(row.noPrice).toBe(true);
    expect(row.pnl).toBeNull();
  });
});

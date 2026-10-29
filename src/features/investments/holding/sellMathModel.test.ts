import { describe, expect, it } from 'vitest';

import type { SellEstimate, SellEstimateLot } from '@/lib/investments.types';

import { checkQuantity, quantityStep, sellFigures, taxFreeQuantity } from './sellMathModel';

const lot = (buyDate: string, quantity: number, costPerUnit: number, term: string, price = 1512.7): SellEstimateLot => ({
  buyDate,
  quantity,
  costPerUnit,
  cost: quantity * costPerUnit,
  proceeds: quantity * price,
  gain: quantity * (price - costPerUnit),
  term,
});

/** A sell-all answer the way the server shapes it (rates as fractions, equity unless said). */
function answer(lots: SellEstimateLot[], over: Partial<SellEstimate> = {}): SellEstimate {
  const quantity = lots.reduce((sum, l) => sum + l.quantity, 0);
  return {
    instrumentId: 'i-1',
    quantity,
    price: 1512.7,
    noPrice: false,
    proceeds: 0,
    cost: 0,
    gain: 0,
    longTermGain: 0,
    shortTermGain: 0,
    equity: true,
    fy: 2026,
    stcgRate: 0.2,
    ltcgRate: 0.125,
    stcgTax: 0,
    ltcgTax: 0,
    tax: 0,
    exemptionLeftBefore: 125000,
    exemptionLeftAfter: 125000,
    lots,
    ...over,
  };
}

// INFY as the seed holds it: 20 + 10 bought at 1420, a 30-share bonus lot at cost 0, price 1512.70.
const INFY_LOTS = [
  lot('2024-03-11', 20, 1420, 'long'),
  lot('2024-04-02', 10, 1420, 'long'),
  lot('2025-06-10', 30, 0, 'long'),
];

describe('sellFigures at the whole holding (what the server answers)', () => {
  it('long-term gain inside the exemption: no tax, exemption left shrinks', () => {
    // Server: gain 1854 + 927 + 45381 = 48162; ₹25,000 of the exemption already used -> 25,000 + 48,162 = 73,162 -> 51,838 left.
    const out = sellFigures(answer(INFY_LOTS, { exemptionLeftBefore: 100000 }), 60);
    expect(out).toMatchObject({
      quantity: 60,
      proceeds: 90762,
      cost: 42600,
      gain: 48162,
      longTermGain: 48162,
      shortTermGain: 0,
      stcgTax: 0,
      ltcgTax: 0,
      tax: 0,
      exemptionLeftBefore: 100000,
      exemptionLeftAfter: 51838,
    });
  });

  it('long-term gain over the exemption: 12.5% on the part above it', () => {
    // 105,000 booked + 48,162 = 153,162: 125,000 exempt, 28,162 taxed -> 3,520.25.
    const out = sellFigures(answer(INFY_LOTS, { exemptionLeftBefore: 20000 }), 60);
    expect(out).toMatchObject({ stcgTax: 0, ltcgTax: 3520.25, tax: 3520.25, exemptionLeftAfter: 0 });
  });

  it('exemption already exhausted: every rupee of long-term gain is taxed', () => {
    const out = sellFigures(answer(INFY_LOTS, { exemptionLeftBefore: 0 }), 20);
    expect(out).toMatchObject({ gain: 1854, ltcgTax: 231.75, tax: 231.75, exemptionLeftAfter: 0 });
  });

  it('short-term gain: 20% flat, the exemption untouched', () => {
    const est = answer([lot('2026-08-01', 10, 1400, 'short')]);
    const out = sellFigures(est, 10);
    expect(out).toMatchObject({ gain: 1127, shortTermGain: 1127, longTermGain: 0, stcgTax: 225.4, ltcgTax: 0, tax: 225.4, exemptionLeftAfter: 125000 });
  });

  it('a short-term loss offsets the long-term gain before the exemption', () => {
    // +500 long, -500 short; ₹125,000 booked already. Net long gain 0 -> nothing above the exemption.
    const est = answer([lot('2024-01-02', 10, 100, 'long', 150), lot('2026-07-01', 10, 200, 'short', 150)], {
      price: 150,
      exemptionLeftBefore: 0,
    });
    const out = sellFigures(est, 20);
    expect(out).toMatchObject({ gain: 0, longTermGain: 500, shortTermGain: -500, stcgTax: 0, ltcgTax: 0, tax: 0, exemptionLeftAfter: 0 });
  });

  it('a short-term loss left over after the short-term gains absorbs long-term gain', () => {
    const est = answer([lot('2024-01-02', 10, 100, 'long', 150), lot('2026-07-01', 10, 200, 'short', 150)], {
      price: 150,
      exemptionLeftBefore: 125000,
    });
    // 500 long gain - 500 short loss = 0 used of the exemption.
    expect(sellFigures(est, 20)).toMatchObject({ tax: 0, exemptionLeftAfter: 125000 });
    // Only the long lot: 500 gain, 500 of the exemption used.
    expect(sellFigures(est, 10)).toMatchObject({ gain: 500, exemptionLeftAfter: 124500 });
  });

  it('a long-term loss reduces the long-term gain of the year', () => {
    const est = answer([lot('2024-01-02', 10, 200, 'long', 150), lot('2024-02-02', 10, 100, 'long', 150)], {
      price: 150,
      exemptionLeftBefore: 125000,
    });
    // -500 then +500: net 0.
    expect(sellFigures(est, 20)).toMatchObject({ tax: 0, exemptionLeftAfter: 125000 });
  });

  it('uses the pre-FY2024 limit of ₹1,00,000 for an older year', () => {
    const out = sellFigures(answer(INFY_LOTS, { fy: 2023, exemptionLeftBefore: 100000 }), 60);
    expect(out.exemptionLeftAfter).toBe(51838);
  });

  it('non-equity: gains by term, no tax or exemption', () => {
    const est = answer([lot('2024-01-02', 10, 100, 'long', 150), lot('2026-07-01', 10, 100, 'short', 150)], {
      equity: false,
      price: 150,
      stcgRate: null,
      ltcgRate: null,
      stcgTax: null,
      ltcgTax: null,
      tax: null,
      exemptionLeftBefore: null,
      exemptionLeftAfter: null,
    });
    expect(sellFigures(est, 15)).toMatchObject({
      gain: 750,
      longTermGain: 500,
      shortTermGain: 250,
      stcgTax: null,
      ltcgTax: null,
      tax: null,
      exemptionLeftBefore: null,
      exemptionLeftAfter: null,
    });
  });

  it('slab lots count as short term gain, like the server', () => {
    const est = answer([lot('2024-01-02', 10, 100, 'slab', 150)], { equity: false, tax: null, exemptionLeftBefore: null, price: 150 });
    expect(sellFigures(est, 10)).toMatchObject({ shortTermGain: 500, longTermGain: 0, tax: null });
  });

  it('no price: proceeds at cost, nothing gained, nothing taxed', () => {
    const est = answer(INFY_LOTS, { price: null, noPrice: true });
    expect(sellFigures(est, 60)).toMatchObject({ proceeds: 42600, cost: 42600, gain: 0, longTermGain: 0, tax: 0 });
  });
});

describe('sellFigures with the year\'s booked figures from the server', () => {
  const booked = (over: Partial<SellEstimate>) =>
    answer(INFY_LOTS, {
      exemptionLeftBefore: 125000,
      exemptionLimit: 125000,
      bookedShortTermGain: 0,
      bookedEquityLongTermGain: 0,
      bookedOtherLongTermGain: 0,
      ...over,
    });

  it('a booked short-term loss offsets the sale\'s long-term gain', () => {
    // 48,162 - 2,000 = 46,162 of exemption used.
    expect(sellFigures(booked({ bookedShortTermGain: -2000 }), 60)).toMatchObject({ tax: 0, exemptionLeftBefore: 125000, exemptionLeftAfter: 78838 });
  });

  it('a booked short-term gain is not taxed again, only what the sale adds', () => {
    const est = booked({ bookedShortTermGain: 3000, lots: [lot('2026-08-01', 10, 1400, 'short')], quantity: 10 });
    // 3,000 + 1,127 booked/sale short gain: the sale adds 1,127 x 20%.
    expect(sellFigures(est, 10)).toMatchObject({ stcgTax: 225.4, tax: 225.4 });
  });

  it('booked equity long-term gain uses up the exemption: the sale is taxed above it', () => {
    // 100,000 + 48,162 = 148,162 -> 23,162 over -> 2,895.25.
    expect(sellFigures(booked({ bookedEquityLongTermGain: 100000, exemptionLeftBefore: 25000 }), 60)).toMatchObject({
      ltcgTax: 2895.25,
      tax: 2895.25,
      exemptionLeftBefore: 25000,
      exemptionLeftAfter: 0,
    });
  });

  it('a booked other-class long-term loss offsets the sale\'s equity gain', () => {
    expect(sellFigures(booked({ bookedOtherLongTermGain: -10000 }), 60)).toMatchObject({ tax: 0, exemptionLeftAfter: 86838 });
  });

  it('short-term losses left over offset other-class long-term gain before equity', () => {
    // -6,000 short loss: 5,000 against other gain, 1,000 against the equity gain 48,162 -> 47,162 used.
    expect(sellFigures(booked({ bookedShortTermGain: -6000, bookedOtherLongTermGain: 5000 }), 60)).toMatchObject({
      tax: 0,
      exemptionLeftAfter: 77838,
    });
  });

  it('other-class long-term gain the sale does not touch is not charged to it', () => {
    expect(sellFigures(booked({ bookedOtherLongTermGain: 5000 }), 60).tax).toBe(0);
  });

  it('falls back to the exemption left when an older server sends no booked figures', () => {
    const old = answer(INFY_LOTS, { exemptionLeftBefore: 20000 });
    expect(old.bookedShortTermGain).toBeUndefined();
    expect(sellFigures(old, 60)).toMatchObject({ tax: 3520.25, exemptionLeftAfter: 0 });
    expect(sellFigures({ ...old, bookedShortTermGain: null, bookedEquityLongTermGain: null, bookedOtherLongTermGain: null }, 60).tax).toBe(3520.25);
  });
});

describe('sellFigures at part of the holding', () => {
  const est = answer(INFY_LOTS, { exemptionLeftBefore: 100000 });

  it('takes the oldest lots first and splits the last one', () => {
    const out = sellFigures(est, 25);
    expect(out.lots.map((l) => [l.buyDate, l.quantity])).toEqual([
      ['2024-03-11', 20],
      ['2024-04-02', 5],
    ]);
    // 1,854 + 5 x 92.70
    expect(out).toMatchObject({ quantity: 25, cost: 35500, proceeds: 37817.5, gain: 2317.5, tax: 0, exemptionLeftAfter: 97682.5 });
  });

  it('a lot that is a bonus (cost 0) is all gain', () => {
    expect(sellFigures(est, 40)).toMatchObject({ cost: 42600, gain: 2781 + 15127 });
  });

  it('mixes long and short term in the split', () => {
    const mixed = answer([lot('2024-01-02', 10, 1400, 'long'), lot('2026-08-01', 10, 1400, 'short')]);
    const out = sellFigures(mixed, 15);
    expect(out.longTermGain).toBe(1127);
    expect(out.shortTermGain).toBe(563.5);
    expect(out.stcgTax).toBe(112.7);
  });
});

describe('taxFreeQuantity', () => {
  it('is the whole holding when every lot is long term inside the exemption', () => {
    expect(taxFreeQuantity(answer(INFY_LOTS, { exemptionLeftBefore: 100000 }), 1)).toBe(60);
  });

  it('stops where the exemption runs out, in whole shares', () => {
    // 20,000 left: 30 shares x 92.70 = 2,781, then 1,512.70 a bonus share: 11 more is 16,639.70 -> 19,420.70; the 12th crosses.
    const est = answer(INFY_LOTS, { exemptionLeftBefore: 20000 });
    const n = taxFreeQuantity(est, 1);
    expect(n).toBe(41);
    expect(sellFigures(est, 41).tax).toBe(0);
    expect(sellFigures(est, 42).tax).toBeGreaterThan(0);
  });

  it('is 0 when the oldest lot is a short-term gain', () => {
    expect(taxFreeQuantity(answer([lot('2026-08-01', 10, 1400, 'short')]), 1)).toBe(0);
  });

  it('is 0 when the exemption is used up', () => {
    expect(taxFreeQuantity(answer(INFY_LOTS, { exemptionLeftBefore: 0 }), 1)).toBe(0);
  });

  it('counts a short-term loss lot as free', () => {
    const est = answer([lot('2026-07-01', 10, 2000, 'short')]);
    expect(taxFreeQuantity(est, 1)).toBe(10);
  });

  it('does not stretch past a taxed quantity because a later lot is a loss', () => {
    // 500 of exemption left, a 100 gain per share on 10 shares, then 10 shares at a 100 loss each.
    const est = answer([lot('2023-01-02', 10, 100, 'long', 200), lot('2023-02-02', 10, 300, 'long', 200)], {
      price: 200,
      exemptionLeftBefore: 500,
    });
    expect(sellFigures(est, 20).tax).toBe(0);
    expect(taxFreeQuantity(est, 1)).toBe(5);
  });

  it('goes to thousandths for a fund', () => {
    // 7 a unit on 100.5 units with 500 of exemption left.
    const est = answer([lot('2023-01-02', 100.5, 10, 'long', 17)], { price: 17, exemptionLeftBefore: 500 });
    const n = taxFreeQuantity(est, 0.001);
    expect(n).toBeGreaterThan(71.4);
    expect(n).toBeLessThan(71.5);
    expect(sellFigures(est, n).tax).toBe(0);
    expect(sellFigures(est, Number((n + 0.001).toFixed(3))).tax).toBeGreaterThan(0);
  });

  it('a fund whole holding with a fractional quantity is free when all of it is', () => {
    const est = answer([lot('2023-01-02', 100.1234, 10, 'long', 17)], { price: 17 });
    expect(taxFreeQuantity(est, 0.001)).toBe(100.1234);
  });

  it('is 0 for non-equity and for no price', () => {
    expect(taxFreeQuantity(answer(INFY_LOTS, { equity: false, tax: null }), 1)).toBe(0);
    expect(taxFreeQuantity(answer(INFY_LOTS, { price: null, noPrice: true }), 1)).toBe(0);
  });
});

describe('quantityStep and checkQuantity', () => {
  it('whole units for stocks and ETFs, thousandths for funds', () => {
    expect(quantityStep('stock')).toBe(1);
    expect(quantityStep('etf')).toBe(1);
    expect(quantityStep('mutual_fund')).toBe(0.001);
  });

  it('accepts a positive quantity up to what is held', () => {
    expect(checkQuantity('12', 30)).toEqual({ ok: true, quantity: 12 });
    expect(checkQuantity(' 30 ', 30)).toEqual({ ok: true, quantity: 30 });
    expect(checkQuantity('2.5', 30)).toEqual({ ok: true, quantity: 2.5 });
  });

  it('rejects zero, negatives, words, too many decimals and more than held', () => {
    for (const text of ['0', '0.0', '-3', 'abc', '1e3', '1.23456', '31', '.', '']) {
      expect(checkQuantity(text, 30)).toEqual({ ok: false });
    }
  });
});

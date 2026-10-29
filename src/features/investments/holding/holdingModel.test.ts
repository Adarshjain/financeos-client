import { describe, expect, it } from 'vitest';

import type { HoldingDetail, SellEstimate } from '@/lib/investments.types';
import { pinClock } from '@/test/pinClock';

import { bonus, buy, dividend, estimate, holding, instrument, manualPrice } from './holding.fixtures';
import {
  corporateActionRow,
  dividendRow,
  HERO_FIGURE_IDS,
  holdingFigures,
  holdingHeader,
  holdingHero,
  instrumentRows,
  priceRow,
  sellLine,
  tradeRow,
} from './holdingModel';

pinClock();

describe('holdingHeader and holdingHero', () => {
  it('writes the title', () => {
    expect(holdingHeader(holding)).toEqual({ title: 'INFY · Infosys' });
  });

  it('titles a fund by its name', () => {
    const fund: HoldingDetail = { ...holding, symbol: null, name: 'Mirae Asset Large Cap', assetType: 'mutual_fund', brokers: holding.brokers.slice(0, 1), term: null };
    expect(holdingHeader(fund)).toEqual({ title: 'Mirae Asset Large Cap' });
  });

  it("writes the move line as today's change and its percent", () => {
    expect(holdingHero(holding)).toEqual({ value: '₹90,762', line: { text: '+₹1,860 today · +2.1%', tone: 'positive' } });
  });

  it('has no move line for a holding without a price, and no move for a manual price', () => {
    expect(holdingHero({ ...holding, noPrice: true }).line).toBeNull();
    expect(holdingHero({ ...holding, manualPrice: true }).line).toBeNull();
  });
});

describe('holdingFigures', () => {
  const figures = (h: HoldingDetail = holding, trades = 3) => Object.fromEntries(holdingFigures(h, instrument, trades).map((f) => [f.id, f]));

  it('writes the eight figures with their context lines', () => {
    const f = figures();
    expect(Object.keys(f)).toEqual(['quantity', 'avgCost', 'ltp', 'xirr', 'invested', 'return', 'realised', 'charges']);
    expect(f.quantity.value).toBe('60');
    expect(f.avgCost.value).toBe('₹710.00');
    expect(f.ltp).toMatchObject({ value: '₹1,512.70', context: 'Yahoo · 13 Oct', override: true });
    expect(f.xirr).toMatchObject({ value: '31.4%', tone: 'positive', context: 'since 11 Mar 24' });
    expect(f.invested).toMatchObject({ value: '₹42,600', context: '60 shares at ₹710.00 avg' });
    expect(f.return).toMatchObject({ value: '+₹48,162', tone: 'positive', context: 'unrealised · +113.1%' });
    expect(f.realised).toMatchObject({ value: '₹0', context: 'nothing sold yet' });
    expect(f.charges).toMatchObject({ value: '₹51.20', context: 'across 3 trades' });
  });

  it('says "manual price" for the LTP of a holding priced by hand, and dashes a missing price and XIRR', () => {
    expect(figures({ ...holding, manualPrice: true }).ltp.context).toBe('manual price · 13 Oct');
    const unpriced = figures({ ...holding, ltp: null, noPrice: true, xirr: null });
    expect(unpriced.ltp.value).toBe('—');
    expect(unpriced.xirr.value).toBe('—');
    expect(unpriced.return).toMatchObject({ value: '—', context: 'no price' });
  });

  it('shows a booked loss in red', () => {
    expect(figures({ ...holding, realisedPnl: -1200 }).realised).toMatchObject({ value: '−₹1,200', tone: 'danger', context: 'booked on sells' });
  });
});

describe('sellLine', () => {
  it('writes the gain, its term, the tax and what is left of the exemption', () => {
    expect(sellLine(estimate)).toBe('Gain ₹48,162 · long term · tax ≈ ₹0 · ₹76,838 exemption left');
  });

  it('writes a loss, mixed terms, and leaves tax out for other asset classes', () => {
    const other: SellEstimate = { ...estimate, gain: -500, longTermGain: -200, shortTermGain: -300, tax: null, exemptionLeftAfter: null };
    expect(sellLine(other)).toBe('Loss ₹500 · long and short term');
  });

  it('says there is no price to estimate with', () => {
    expect(sellLine({ ...estimate, noPrice: true })).toBe('No price to estimate with');
  });
});

describe('section rows', () => {
  it('writes a buy with its broker and value, and a sell with its realised P&L', () => {
    expect(tradeRow(buy())).toMatchObject({ side: 'Buy', broker: 'Zerodha', quantity: '20', price: '₹1,420.00', value: '₹28,400', pnl: null, date: '11 Mar 24' });
    const sell = tradeRow(buy({ id: 't3', type: 'sell', realisedPnl: 1200 }));
    expect(sell.side).toBe('Sell');
    expect(sell.pnl).toEqual({ text: 'P&L +₹1,200', plain: 'P&L +1,200', tone: 'positive' });
    expect([sell.pricePlain, sell.valuePlain]).toEqual(['1,420.00', '28,400']);
    expect(sell.phoneSub).toBe('11 Mar 24 · 20 @ ₹1,420.00 · P&L +₹1,200');
  });

  it('writes a dividend per share with its dates and TDS, and no Final or Interim word', () => {
    expect(dividendRow(dividend)).toEqual({
      id: 'd1',
      title: 'Dividend ₹22.00 / share',
      subtitle: 'ex 30 May 25 · paid 18 Jun 25 · TDS ₹132.00',
      amount: '+₹1,320.00',
    });
  });

  it('writes a corporate action with its ratio and ex date, and no "Applied" word', () => {
    expect(corporateActionRow(bonus)).toEqual({ id: 'ca1', title: 'Bonus 1:1', subtitle: 'ex 10 Jun 25' });
  });

  it('lets only the signed-in user\'s own manual prices change', () => {
    expect(priceRow(manualPrice)).toMatchObject({ id: 'p3', source: 'manual price', amount: '₹1,470.00', date: '10 Oct', editable: true });
    expect(priceRow({ id: null, asOf: '2026-10-13', close: 1512.7, source: 'YAHOO', editable: false })).toMatchObject({ source: 'Yahoo', editable: false });
    // a price flagged editable but without an id has nothing to address
    expect(priceRow({ ...manualPrice, id: null }).editable).toBe(false);
  });

  it('writes the instrument rows', () => {
    expect(instrumentRows(instrument)).toEqual([
      { label: 'Exchange', value: 'NSE' },
      { label: 'ISIN', value: 'INE009A01021' },
      { label: 'Yahoo symbol', value: 'INFY.NS' },
      { label: 'Price source', value: 'Yahoo' },
      { label: 'Overrides', value: 'none' },
    ]);
  });
});

describe('hero figures', () => {
  it('puts Invested, ₹ return and XIRR in the hero; the other five are the Position card rows', () => {
    const ids = holdingFigures(holding, null, 2).map((f) => f.id);
    expect(HERO_FIGURE_IDS).toEqual(['invested', 'return', 'xirr']);
    expect(ids.filter((id) => !HERO_FIGURE_IDS.includes(id))).toEqual(['quantity', 'avgCost', 'ltp', 'realised', 'charges']);
  });
});

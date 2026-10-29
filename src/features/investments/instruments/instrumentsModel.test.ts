import { describe, expect, it } from 'vitest';

import { instrument } from './instruments.fixtures';
import {
  identifierOf,
  instrumentListRow,
  instrumentsQuery,
  instrumentsUrl,
  parseInstrumentsUrl,
  priceSourceWord,
  typeWord,
} from './instrumentsModel';

const defaults = parseInstrumentsUrl({});

describe('Instruments URL state', () => {
  it('starts on the first page, name A–Z, every type, 50 a page', () => {
    expect(defaults).toEqual({ q: '', type: '', stale: false, sort: 'asc', page: 0, size: 50 });
  });

  it('reads search, type, stale, sort, page and size, and ignores junk', () => {
    expect(parseInstrumentsUrl({ q: ' tata ', type: 'etf', stale: '1', sort: 'desc', page: '4', size: '100' })).toEqual({
      q: 'tata',
      type: 'etf',
      stale: true,
      sort: 'desc',
      page: 3,
      size: 100,
    });
    expect(parseInstrumentsUrl({ type: 'bond', stale: 'yes', sort: 'up', page: '-2', size: '7' })).toEqual(defaults);
  });

  it('keeps defaults out of the address and round-trips the rest', () => {
    expect(instrumentsUrl(defaults)).toBe('/investments/instruments');
    const state = { q: 'tata', type: 'stock' as const, stale: true, sort: 'desc' as const, page: 2, size: 25 };
    const url = instrumentsUrl(state);
    expect(url).toBe('/investments/instruments?q=tata&type=stock&stale=1&sort=desc&page=3&size=25');
    expect(parseInstrumentsUrl(Object.fromEntries(new URL(url, 'http://x').searchParams))).toEqual(state);
  });

  it('builds the server request: name order only when descending, stale only when on', () => {
    expect(instrumentsQuery(defaults)).toEqual({ page: 0, size: 50 });
    expect(instrumentsQuery({ q: 'tata', type: 'etf', stale: true, sort: 'desc', page: 1, size: 25 })).toEqual({
      search: 'tata',
      type: 'etf',
      sort: 'name,desc',
      stale: true,
      page: 1,
      size: 25,
    });
  });
});

describe('Instrument rows', () => {
  it('names the type and the price source', () => {
    expect(typeWord('mutual_fund')).toBe('Fund');
    expect(typeWord('etf')).toBe('ETF');
    expect(priceSourceWord('YAHOO')).toBe('Yahoo');
    expect(priceSourceWord('MANUAL')).toBe('Manual');
    expect(priceSourceWord(null)).toBe('');
  });

  it('shows the AMFI code of a fund, else the ISIN, else the Yahoo symbol', () => {
    expect(identifierOf(instrument({ type: 'mutual_fund', amfiCode: '122639' }))).toBe('AMFI 122639');
    expect(identifierOf(instrument())).toBe('INE009A01021');
    expect(identifierOf(instrument({ isin: null }))).toBe('INFY.NS');
    expect(identifierOf(instrument({ isin: null, yahooSymbol: null }))).toBeNull();
  });

  it('formats a stock row: price, source, day and the phone line', () => {
    const row = instrumentListRow(instrument());
    expect(row).toMatchObject({ name: 'Infosys', symbol: 'INFY', typeLabel: 'Stock', exchange: 'NSE', price: '1,512.70', priceRupees: '₹1,512.70', asOf: '13 Oct', notHeld: false, overridden: false });
    expect(row.source).toEqual({ label: 'Yahoo', tone: 'neutral' });
    expect(row.sub).toBe('INE009A01021 · Yahoo · 13 Oct');
  });

  it('writes AMFI prices as NAV and manual prices as an override', () => {
    expect(instrumentListRow(instrument({ type: 'mutual_fund', amfiCode: '122639', lastPriceSource: 'AMFI', lastPriceAsOf: '2026-10-12' })).sub).toBe('AMFI 122639 · NAV 12 Oct');
    const manual = instrumentListRow(instrument({ lastPriceSource: 'MANUAL' }));
    expect(manual.source).toEqual({ label: 'Manual', tone: 'warning' });
    expect(manual.sub).toBe('INE009A01021 · manual override 13 Oct');
  });

  it('says No price when there is none, and marks not-held and edited instruments', () => {
    const row = instrumentListRow(instrument({ lastPrice: null, lastPriceAsOf: null, lastPriceSource: null, notHeld: true, overridden: true, overriddenFields: ['name', 'symbol'] }));
    expect(row).toMatchObject({ price: null, source: null, asOf: null, notHeld: true, overridden: true, overriddenFields: 'name and symbol' });
    expect(row.sub).toBe('INE009A01021 · No price');
  });
});

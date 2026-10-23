import type { InstrumentListPage } from '@/lib/instrumentList';
import type { Instrument } from '@/lib/types';

/** One catalog entry as GET /instruments answers it. */
export function instrument(over: Partial<Instrument> = {}): Instrument {
  return {
    id: 'i-infy',
    type: 'stock',
    name: 'Infosys',
    symbol: 'INFY',
    exchange: 'NSE',
    isin: 'INE009A01021',
    yahooSymbol: 'INFY.NS',
    currency: 'INR',
    lastPrice: 1512.7,
    lastPriceAsOf: '2026-10-13',
    lastPriceSource: 'YAHOO',
    notHeld: false,
    overridden: false,
    overriddenFields: [],
    ...over,
  };
}

/** The rows of the board: a stock, a not-held stock, an edited fund and a manual price. */
export const sampleInstruments: Instrument[] = [
  instrument(),
  instrument({ id: 'i-tm', name: 'Tata Motors', symbol: 'TATAMOTORS', isin: 'INE155A01022', lastPrice: 690.05, notHeld: true }),
  instrument({
    id: 'i-mirae',
    type: 'mutual_fund',
    name: 'Mirae Asset Large Cap · Direct Growth',
    symbol: null,
    exchange: null,
    isin: 'INF769K01010',
    amfiCode: '118834',
    yahooSymbol: null,
    lastPrice: 118.62,
    lastPriceAsOf: '2026-10-12',
    lastPriceSource: 'AMFI',
    overridden: true,
    overriddenFields: ['name', 'assetClass'],
    assetClass: 'EQUITY',
  }),
  instrument({
    id: 'i-gold',
    type: 'etf',
    name: 'Nippon India Gold BeES',
    symbol: 'GOLDBEES',
    isin: 'INF204KB17I5',
    lastPrice: 71.8,
    lastPriceSource: 'MANUAL',
  }),
];

export function instrumentPage(items: Instrument[] = sampleInstruments, over: Partial<InstrumentListPage> = {}): InstrumentListPage {
  return { items, page: 0, size: 50, totalElements: items.length, totalPages: items.length ? 1 : 0, ...over };
}

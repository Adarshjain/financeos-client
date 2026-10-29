import { describe, expect, it } from 'vitest';

import type { Instrument, InstrumentCandidate } from '@/lib/types';

import { AUTO_ASSET_CLASS } from './instrumentEditModel';
import {
  assetClassChange,
  candidatePatch,
  defaultYahooSymbol,
  editValuesOf,
  emptyInstrumentForm,
  instrumentRequest,
} from './instrumentFormModel';

const base: Instrument = { id: 'i1', type: 'stock', name: 'Acme', currency: 'INR' };

describe('instrument form helpers', () => {
  it('starts a stock on NSE in rupees', () => {
    expect(emptyInstrumentForm()).toMatchObject({ type: 'stock', exchange: 'NSE', currency: 'INR', name: '' });
  });

  it('defaults the Yahoo symbol to SYMBOL.NS for stocks and ETFs only', () => {
    expect(defaultYahooSymbol('stock', ' bajajhfl ')).toBe('BAJAJHFL.NS');
    expect(defaultYahooSymbol('etf', 'niftybees')).toBe('NIFTYBEES.NS');
    expect(defaultYahooSymbol('mutual_fund', 'x')).toBeNull();
    expect(defaultYahooSymbol('stock', '  ')).toBeNull();
  });

  it('trims the request and leaves blank fields out', () => {
    const req = instrumentRequest({ ...emptyInstrumentForm(), name: '  Bajaj  ', symbol: ' ', isin: ' INE1 ', currency: ' ' });
    expect(req).toEqual({
      type: 'stock',
      name: 'Bajaj',
      symbol: undefined,
      exchange: 'NSE',
      isin: 'INE1',
      amfiCode: undefined,
      yahooSymbol: undefined,
      currency: undefined,
    });
  });

  it('fills the Edit form from an instrument, with Auto unless the user pinned a class', () => {
    expect(editValuesOf({ ...base, symbol: 'ACME', assetClass: 'EQUITY' })).toMatchObject({ symbol: 'ACME', assetClass: AUTO_ASSET_CLASS });
    expect(editValuesOf({ ...base, assetClass: 'GOLD', overriddenFields: ['assetClass'] }).assetClass).toBe('GOLD');
  });

  it('maps a picked catalog entry onto the form fields, keeping the currency when it has none', () => {
    const c = { source: 'AMFI', type: 'mutual_fund', name: 'Mirae', amfiCode: '118834' } as InstrumentCandidate;
    expect(candidatePatch(c)).toEqual({
      type: 'mutual_fund',
      name: 'Mirae',
      symbol: '',
      exchange: '',
      isin: '',
      amfiCode: '118834',
      yahooSymbol: '',
    });
    expect(candidatePatch({ ...c, currency: 'USD' }).currency).toBe('USD');
  });

  it('sends no asset class when unchanged, null for Auto, the class when pinned', () => {
    expect(assetClassChange(base, AUTO_ASSET_CLASS)).toBeUndefined();
    expect(assetClassChange(base, 'GOLD')).toBe('GOLD');
    const pinned = { ...base, assetClass: 'GOLD' as const, overriddenFields: ['assetClass'] };
    expect(assetClassChange(pinned, 'GOLD')).toBeUndefined();
    expect(assetClassChange(pinned, AUTO_ASSET_CLASS)).toBeNull();
  });
});

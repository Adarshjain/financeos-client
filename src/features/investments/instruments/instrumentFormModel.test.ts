import { describe, expect, it } from 'vitest';

import type { Instrument, InstrumentCandidate } from '@/lib/types';

import { AUTO_ASSET_CLASS } from './instrumentEditModel';
import {
  assetClassChange,
  candidatePatch,
  defaultYahooSymbol,
  editValuesOf,
  emptyInstrumentForm,
  exchangeChoice,
  exchangeSwitchable,
  identifiersLocked,
  instrumentEditRequest,
  instrumentRequest,
  isExchangeSwitch,
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

describe('exchange switch', () => {
  const nse: Instrument = { ...base, isin: 'INE2E0000011', exchange: 'NSE', yahooSymbol: 'ACME.NS', amfiCode: '123' };
  const bse: Instrument = { ...nse, exchange: 'BSE', yahooSymbol: 'ACME.BO' };

  it('offers the NSE / BSE choice only for an NSE or BSE instrument with an ISIN', () => {
    expect(exchangeSwitchable(nse)).toBe(true);
    expect(exchangeSwitchable(bse)).toBe(true);
    expect(exchangeSwitchable({ ...nse, exchange: 'NYSE' })).toBe(false);
    expect(exchangeSwitchable({ ...nse, exchange: undefined })).toBe(false);
    expect(exchangeSwitchable({ ...nse, isin: undefined })).toBe(false);
  });

  it('is a switch from NSE to BSE and from BSE to NSE, not when back at the start', () => {
    expect(isExchangeSwitch(nse, { ...editValuesOf(nse), exchange: 'BSE' })).toBe(true);
    expect(isExchangeSwitch(bse, { ...editValuesOf(bse), exchange: 'NSE' })).toBe(true);
    expect(isExchangeSwitch(nse, { ...editValuesOf(nse), exchange: 'NSE' })).toBe(false);
  });

  it('is never a switch for a text-field exchange or without an ISIN', () => {
    const other = { ...nse, exchange: 'NYSE' };
    expect(isExchangeSwitch(other, { ...editValuesOf(other), exchange: 'BSE' })).toBe(false);
    const noIsin = { ...nse, isin: undefined };
    expect(isExchangeSwitch(noIsin, { ...editValuesOf(noIsin), exchange: 'BSE' })).toBe(false);
  });

  it('locks the identifiers while switching and unlocks them back at the start', () => {
    expect(identifiersLocked(nse, { ...editValuesOf(nse), exchange: 'BSE' })).toBe(true);
    expect(identifiersLocked(nse, editValuesOf(nse))).toBe(false);
  });

  it('sends the starting identifiers on a switch', () => {
    const values = { ...editValuesOf(nse), exchange: 'BSE', isin: 'INE2E9999999', amfiCode: '999', yahooSymbol: 'X.NS' };
    expect(instrumentEditRequest(nse, values)).toMatchObject({ exchange: 'BSE', isin: 'INE2E0000011', amfiCode: '123', yahooSymbol: 'ACME.NS' });
  });

  it('sends the typed identifiers when it is not a switch', () => {
    const values = { ...editValuesOf(nse), yahooSymbol: 'NEW.NS' };
    expect(instrumentEditRequest(nse, values)).toMatchObject({ exchange: 'NSE', yahooSymbol: 'NEW.NS' });
  });

  it('is not a switch when the chosen exchange is blank or not NSE / BSE', () => {
    expect(isExchangeSwitch(nse, { ...editValuesOf(nse), exchange: '' })).toBe(false);
    expect(isExchangeSwitch(nse, { ...editValuesOf(nse), exchange: 'NYSE' })).toBe(false);
    expect(identifiersLocked(nse, { ...editValuesOf(nse), exchange: '' })).toBe(false);
  });

  it('treats exchange case-insensitively', () => {
    const lower = { ...nse, exchange: 'nse' };
    expect(exchangeSwitchable(lower)).toBe(true);
    expect(exchangeChoice('nse')).toBe('NSE');
    expect(isExchangeSwitch(lower, { ...editValuesOf(lower), exchange: 'NSE' })).toBe(false);
    expect(isExchangeSwitch(lower, { ...editValuesOf(lower), exchange: 'bse' })).toBe(true);
    expect(instrumentEditRequest(lower, { ...editValuesOf(lower), exchange: 'bse' }).exchange).toBe('BSE');
  });
});

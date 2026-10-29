import type { AssetClass, CreateInstrumentRequest, Instrument, InstrumentCandidate, InstrumentType } from '@/lib/types';

import { assetClassSelection, AUTO_ASSET_CLASS } from './instrumentEditModel';

/** The text of an instrument form, every field as typed. */
export interface InstrumentFormValues {
  type: InstrumentType;
  name: string;
  symbol: string;
  exchange: string;
  isin: string;
  amfiCode: string;
  yahooSymbol: string;
  currency: string;
}

export interface InstrumentEditValues extends InstrumentFormValues {
  /** An AssetClass, or AUTO_ASSET_CLASS. */
  assetClass: string;
}

/** The Add form's starting values: a stock on NSE in rupees. */
export function emptyInstrumentForm(): InstrumentFormValues {
  return { type: 'stock', name: '', symbol: '', exchange: 'NSE', isin: '', amfiCode: '', yahooSymbol: '', currency: 'INR' };
}

/** "RELIANCE.NS" for a stock or ETF symbol; null for a fund or an empty symbol. */
export function defaultYahooSymbol(type: InstrumentType, symbol: string): string | null {
  if (type === 'mutual_fund' || !symbol.trim()) return null;
  return `${symbol.trim().toUpperCase()}.NS`;
}

/** The request body of a form: trimmed, blank fields left out. */
export function instrumentRequest(values: InstrumentFormValues): CreateInstrumentRequest {
  return {
    type: values.type,
    name: values.name.trim(),
    symbol: values.symbol.trim() || undefined,
    exchange: values.exchange.trim() || undefined,
    isin: values.isin.trim() || undefined,
    amfiCode: values.amfiCode.trim() || undefined,
    yahooSymbol: values.yahooSymbol.trim() || undefined,
    currency: values.currency.trim() || undefined,
  };
}

/** The Edit form's values for an instrument. */
export function editValuesOf(instrument: Instrument): InstrumentEditValues {
  return {
    type: instrument.type || 'stock',
    name: instrument.name || '',
    symbol: instrument.symbol || '',
    exchange: instrument.exchange || '',
    isin: instrument.isin || '',
    amfiCode: instrument.amfiCode || '',
    yahooSymbol: instrument.yahooSymbol || '',
    currency: instrument.currency || 'INR',
    assetClass: assetClassSelection(instrument),
  };
}

/** What a picked catalog entry fills into the Edit form (the id and holdings stay with the row). */
export function candidatePatch(c: InstrumentCandidate): Partial<InstrumentEditValues> {
  return {
    type: c.type,
    name: c.name,
    symbol: c.symbol || '',
    exchange: c.exchange || '',
    isin: c.isin || '',
    amfiCode: c.amfiCode || '',
    yahooSymbol: c.yahooSymbol || '',
    ...(c.currency ? { currency: c.currency } : {}),
  };
}

/**
 * The asset class to send on save: undefined when the choice is unchanged, null to go back to Auto,
 * else the class to pin.
 */
export function assetClassChange(instrument: Instrument, selected: string): AssetClass | null | undefined {
  if (selected === assetClassSelection(instrument)) return undefined;
  return selected === AUTO_ASSET_CLASS ? null : (selected as AssetClass);
}

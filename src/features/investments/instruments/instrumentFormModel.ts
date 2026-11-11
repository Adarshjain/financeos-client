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

/** The two listings a stock can move between. */
export const SWITCHABLE_EXCHANGES = ['NSE', 'BSE'] as const;
export const EXCHANGE_OPTIONS = SWITCHABLE_EXCHANGES.map((value) => ({ value, label: value }));

const upper = (v: string | null | undefined) => (v ?? '').trim().toUpperCase();
const isSwitchableExchange = (v: string | null | undefined) => (SWITCHABLE_EXCHANGES as readonly string[]).includes(upper(v));

/** True when the Exchange field is a NSE / BSE choice: the instrument has an ISIN and sits on one of the two (any case). */
export function exchangeSwitchable(instrument: Instrument): boolean {
  return Boolean(instrument.isin) && isSwitchableExchange(instrument.exchange);
}

/** The Exchange select's value: the form's exchange, upper-cased. */
export function exchangeChoice(exchange: string): string {
  return upper(exchange);
}

/** True when the chosen exchange is the other NSE / BSE listing than the one the form started with. */
export function isExchangeSwitch(instrument: Instrument, values: InstrumentEditValues): boolean {
  return exchangeSwitchable(instrument) && isSwitchableExchange(values.exchange) && upper(values.exchange) !== upper(instrument.exchange);
}

/** The ISIN, AMFI code and Yahoo symbol fields are disabled while an exchange switch is pending. */
export function identifiersLocked(instrument: Instrument, values: InstrumentEditValues): boolean {
  return isExchangeSwitch(instrument, values);
}

/** The Edit request: on an exchange switch the identifiers go as they started, so the server sees a pure switch. */
export function instrumentEditRequest(instrument: Instrument, values: InstrumentEditValues): CreateInstrumentRequest {
  const body = instrumentRequest(values);
  if (!isExchangeSwitch(instrument, values)) return body;
  const start = editValuesOf(instrument);
  return instrumentRequest({ ...values, exchange: upper(values.exchange), isin: start.isin, amfiCode: start.amfiCode, yahooSymbol: start.yahooSymbol });
}

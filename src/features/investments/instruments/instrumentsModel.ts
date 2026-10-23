import { formatDayMonth } from '@/features/accounts/list/accountsList';
import { DS_PREFIX } from '@/features/shell/routes';
import { INSTRUMENT_MAX_PAGE_SIZE, type InstrumentListQuery, instrumentListQuery } from '@/lib/instrumentList';
import type { Instrument, InstrumentType } from '@/lib/types';

import { plainPrice, unitPrice } from '../investmentsFormat';
import { describeOverriddenFields, isOverridden } from './instrumentEdit';

// ---- URL state ---------------------------------------------------------------

/** This page's own address (the Dinero page exists, so no Legacy fallback is needed). */
export const INSTRUMENTS_HREF = `${DS_PREFIX}/investments/instruments`;
export const INSTRUMENTS_SIZE_OPTIONS = [25, 50, 100, INSTRUMENT_MAX_PAGE_SIZE];
export const INSTRUMENTS_DEFAULT_SIZE = 50;

export type InstrumentsSortDir = 'asc' | 'desc';

export interface InstrumentsUrlState {
  q: string;
  /** '' = every type. */
  type: InstrumentType | '';
  /** Only instruments whose last price is stale. */
  stale: boolean;
  /** Name order. */
  sort: InstrumentsSortDir;
  page: number;
  size: number;
}

const TYPES: InstrumentType[] = ['stock', 'mutual_fund', 'etf'];

export function parseInstrumentsUrl(params: {
  q?: string;
  type?: string;
  stale?: string;
  sort?: string;
  page?: string;
  size?: string;
}): InstrumentsUrlState {
  const page = Math.floor(Number(params.page));
  const size = Number(params.size);
  return {
    q: (params.q ?? '').trim(),
    type: TYPES.includes(params.type as InstrumentType) ? (params.type as InstrumentType) : '',
    stale: params.stale === '1',
    sort: params.sort === 'desc' ? 'desc' : 'asc',
    page: Number.isFinite(page) && page > 0 ? page : 0,
    size: INSTRUMENTS_SIZE_OPTIONS.includes(size) ? size : INSTRUMENTS_DEFAULT_SIZE,
  };
}

/** The Instruments tab URL for a state: defaults stay out of the query string. */
export function instrumentsUrl(state: InstrumentsUrlState): string {
  const query = new URLSearchParams();
  if (state.q) query.set('q', state.q);
  if (state.type) query.set('type', state.type);
  if (state.stale) query.set('stale', '1');
  if (state.sort === 'desc') query.set('sort', 'desc');
  if (state.page > 0) query.set('page', String(state.page));
  if (state.size !== INSTRUMENTS_DEFAULT_SIZE) query.set('size', String(state.size));
  const text = query.toString();
  return text ? `${INSTRUMENTS_HREF}?${text}` : INSTRUMENTS_HREF;
}

/** The GET /instruments request for a state. */
export function instrumentsQuery(state: InstrumentsUrlState): InstrumentListQuery {
  return {
    ...instrumentListQuery({
      search: state.q,
      type: state.type || undefined,
      sortDir: state.sort,
      page: state.page,
      size: state.size,
    }),
    ...(state.stale ? { stale: true } : {}),
  };
}

export const TYPE_CHIPS: { value: InstrumentType | ''; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'stock', label: 'Stocks' },
  { value: 'mutual_fund', label: 'Funds' },
  { value: 'etf', label: 'ETFs' },
];

export const SORT_OPTIONS: { value: InstrumentsSortDir; label: string }[] = [
  { value: 'asc', label: 'Name A–Z' },
  { value: 'desc', label: 'Name Z–A' },
];

export const TYPE_OPTIONS: { value: InstrumentType; label: string }[] = [
  { value: 'stock', label: 'Stock' },
  { value: 'mutual_fund', label: 'Fund' },
  { value: 'etf', label: 'ETF' },
];

export function typeWord(type: string | null | undefined): string {
  return TYPE_OPTIONS.find((o) => o.value === type)?.label ?? 'Other';
}

// ---- Rows --------------------------------------------------------------------

const SOURCE_WORDS: Record<string, string> = { YAHOO: 'Yahoo', AMFI: 'AMFI', MANUAL: 'Manual' };

/** "Yahoo" / "AMFI" / "Manual": where the last price came from. */
export function priceSourceWord(source: string | null | undefined): string {
  if (!source) return '';
  return SOURCE_WORDS[source.toUpperCase()] ?? source;
}

/** The one identifier a row shows: the AMFI code of a fund, else the ISIN, else the Yahoo symbol. */
export function identifierOf(i: Pick<Instrument, 'type' | 'amfiCode' | 'isin' | 'yahooSymbol'>): string | null {
  if (i.type === 'mutual_fund' && i.amfiCode) return `AMFI ${i.amfiCode}`;
  return i.isin || i.yahooSymbol || null;
}

export interface InstrumentListRow {
  id: string;
  name: string;
  symbol: string | null;
  typeLabel: string;
  exchange: string | null;
  identifier: string | null;
  /** "1,512.70" for the table; "₹1,512.70" for the phone row. */
  price: string | null;
  priceRupees: string | null;
  source: { label: string; tone: 'neutral' | 'warning' } | null;
  /** "13 Oct", the day of the last price. */
  asOf: string | null;
  notHeld: boolean;
  overridden: boolean;
  /** "name and symbol" when overridden, else null. */
  overriddenFields: string | null;
  /** The phone row's second line: "INE009A01021 · Yahoo · 13 Oct", "AMFI 122639 · NAV 12 Oct". */
  sub: string;
}

function priceNumber(value: Instrument['lastPrice']): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** "Yahoo · 13 Oct" / "NAV 12 Oct" / "manual override 13 Oct" / "No price". */
function priceLine(source: string | null | undefined, asOf: string | null): string {
  const key = source?.toUpperCase();
  if (!asOf && !source) return 'No price';
  if (key === 'AMFI') return asOf ? `NAV ${asOf}` : 'AMFI';
  if (key === 'MANUAL') return asOf ? `manual override ${asOf}` : 'manual override';
  return [priceSourceWord(source), asOf].filter(Boolean).join(' · ');
}

export function instrumentListRow(i: Instrument): InstrumentListRow {
  const price = priceNumber(i.lastPrice);
  const asOf = price != null && i.lastPriceAsOf ? formatDayMonth(i.lastPriceAsOf) || null : null;
  const label = price != null ? priceSourceWord(i.lastPriceSource) : '';
  const identifier = identifierOf(i);
  const overridden = isOverridden(i);
  return {
    id: i.id,
    name: i.name,
    symbol: i.symbol || null,
    typeLabel: typeWord(i.type),
    exchange: i.exchange || null,
    identifier,
    price: price != null ? plainPrice(price) : null,
    priceRupees: price != null ? unitPrice(price) : null,
    source: label ? { label, tone: i.lastPriceSource?.toUpperCase() === 'MANUAL' ? 'warning' : 'neutral' } : null,
    asOf,
    notHeld: Boolean(i.notHeld),
    overridden,
    overriddenFields: overridden ? describeOverriddenFields(i.overriddenFields) || null : null,
    sub: [identifier, price != null ? priceLine(i.lastPriceSource, asOf) : 'No price'].filter(Boolean).join(' · '),
  };
}

import { fyLabel, moveTone } from '@/features/investments/investmentsFormatModel';
import { fyStartYear } from '@/features/loans/detail/financialYearModel';
import { DEFAULT_PAGE_SIZE, parsePage, setPageParam } from '@/features/shell/pagination';
import { appHref } from '@/features/shell/routes';
import { first, type SearchParamsRecord } from '@/features/shell/searchParams';
import { todayInAppZone } from '@/lib/date-range';
import { formatDate, formatMoney, formatPercent, formatQuantity } from '@/lib/format';
import type { FnoPageQuery, FnoSort, FnoSummary } from '@/lib/investments.types';
import type { FnoTradeResponse } from '@/lib/types';

import { INVESTMENTS_IMPORT_HREF } from '../investmentsTabs';

/** The F&O tab. */
export const FNO_HREF = appHref('/investments/fno');

/** "Import statement" opens the Import tradebook page. */
export const IMPORT_STATEMENT_HREF = INVESTMENTS_IMPORT_HREF;

// ---- URL state ---------------------------------------------------------------

export const FNO_SIZE_OPTIONS = [25, 50, 100];

/** The contract filter: every contract, futures, all options, calls or puts (the server's `optionType`). */
export type FnoContract = '' | 'FUT' | 'OPT' | 'CE' | 'PE';

export interface FnoUrlState {
  /** The symbol typed in the search field (contains, over symbol, underlying and notes); '' = no search. */
  q: string;
  contract: FnoContract;
  /** A broker account id; '' = every broker. */
  broker: string;
  /** The financial year's start year; null = every year (`fy=all`). */
  fy: number | null;
  sort: FnoSort;
  page: number;
  size: number;
}

const CONTRACTS: FnoContract[] = ['FUT', 'OPT', 'CE', 'PE'];
const SORTS: FnoSort[] = ['newest', 'oldest', 'pnl_desc', 'pnl_asc'];

/** The financial year the business date is in (start year). */
export function currentFy(): number {
  return fyStartYear(todayInAppZone());
}

export function parseFnoUrl(params: SearchParamsRecord): FnoUrlState {
  const fy = Math.floor(Number(first(params.fy)));
  return {
    q: (first(params.q) ?? '').trim(),
    contract: CONTRACTS.includes(first(params.contract) as FnoContract) ? (first(params.contract) as FnoContract) : '',
    broker: (first(params.broker) ?? '').trim(),
    fy: first(params.fy) === 'all' ? null : Number.isFinite(fy) && fy >= 1900 && fy <= 2200 ? fy : currentFy(),
    sort: SORTS.includes(first(params.sort) as FnoSort) ? (first(params.sort) as FnoSort) : 'newest',
    ...parsePage(params, { size: DEFAULT_PAGE_SIZE, sizes: FNO_SIZE_OPTIONS }),
  };
}

/** The F&O tab URL for a state: defaults stay out of the query string. */
export function fnoUrl(state: FnoUrlState): string {
  const query = new URLSearchParams();
  if (state.q) query.set('q', state.q);
  if (state.contract) query.set('contract', state.contract);
  if (state.broker) query.set('broker', state.broker);
  if (state.fy == null) query.set('fy', 'all');
  else if (state.fy !== currentFy()) query.set('fy', String(state.fy));
  if (state.sort !== 'newest') query.set('sort', state.sort);
  setPageParam(query, state.page);
  if (state.size !== DEFAULT_PAGE_SIZE) query.set('size', String(state.size));
  const text = query.toString();
  return text ? `${FNO_HREF}?${text}` : FNO_HREF;
}

/** The page request for a state. */
export function fnoQuery(state: FnoUrlState): FnoPageQuery {
  return {
    fy: state.fy ?? undefined,
    optionType: state.contract || undefined,
    brokerAccountId: state.broker || undefined,
    search: state.q || undefined,
    sort: state.sort,
    page: state.page,
    size: state.size,
  };
}

export const CONTRACT_CHIPS: { value: FnoContract; label: string }[] = [
  { value: '', label: 'All contracts' },
  { value: 'FUT', label: 'Futures' },
  { value: 'OPT', label: 'Options' },
  { value: 'CE', label: 'CE' },
  { value: 'PE', label: 'PE' },
];

export const SORT_OPTIONS: { value: FnoSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'pnl_desc', label: 'Highest P&L' },
  { value: 'pnl_asc', label: 'Lowest P&L' },
];

/** The summary request for a state: every year, or the one financial year. */
export function fnoSummaryQuery(state: FnoUrlState): { fy?: number; allYears?: boolean; brokerAccountId?: string } {
  return { ...(state.fy == null ? { allYears: true } : { fy: state.fy }), brokerAccountId: state.broker || undefined };
}

/** The FY filter's first option: every year (the URL's `fy=all`). */
export const FNO_ALL_YEARS = { value: '', label: 'All years' };

/** The FY filter's label: the year, or "All years". */
export function fnoFyLabel(fy: number | null): string {
  return fy == null ? FNO_ALL_YEARS.label : fyLabel(fy);
}

/** How many financial years the FY filter offers, counting back from the current one. */
const FY_COUNT = 6;

/** The FY filter's options: the current year back, plus the selected year when it is older. */
export function fyOptions(selected: number): { value: string; label: string }[] {
  const years = Array.from({ length: FY_COUNT }, (_, i) => currentFy() - i);
  if (!years.includes(selected)) years.push(selected);
  return years.map((y) => ({ value: String(y), label: fyLabel(y) }));
}

// ---- Figures -----------------------------------------------------------------

type Tone = 'positive' | 'danger' | undefined;

export interface FnoFiguresModel {
  /** "+₹10,456": the year's realised P&L. */
  realised: { text: string; tone: Tone };
  /** "4 trades". */
  realisedSub: string;
  /** "50%". */
  winRate: string;
  /** "2 of 4". */
  winSub: string;
  /** "₹669". */
  charges: string;
  /** "4 trades". */
  chargesSub: string;
}

function trades(count: number, word = 'trade'): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export function figuresModel(summary: FnoSummary): FnoFiguresModel {
  const count = summary.tradeCount;
  return {
    realised: { text: formatMoney(summary.realisedPnl, { sign: 'always' }), tone: moveTone(summary.realisedPnl) },
    realisedSub: trades(count),
    winRate: formatPercent(summary.winRate),
    winSub: `${summary.winCount} of ${count}`,
    charges: formatMoney(Math.round(summary.totalCharges)),
    chargesSub: trades(count),
  };
}

/** "Realised +₹10,456 · taxed as business income": the line under the list. */
export function realisedLine(summary: FnoSummary): string {
  return `Realised ${formatMoney(summary.realisedPnl, { sign: 'always' })} · taxed as business income`;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export interface PnlBarRow {
  key: string;
  label: string;
  amount: string;
  tone: Tone;
  /** Bar fill, 0 to 100 of the biggest move. */
  pct: number;
  barTone: 'brand' | 'danger';
}

/** The months with a result, in year order, each with a bar sized against the biggest month. */
export function monthRows(summary: FnoSummary): PnlBarRow[] {
  const active = summary.byMonth.filter((m) => Math.round(m.pnl) !== 0);
  const biggest = Math.max(0, ...active.map((m) => Math.abs(m.pnl)));
  return active.map((m) => ({
    key: m.month,
    label: MONTH_NAMES[Number(m.month.slice(5, 7)) - 1] ?? m.month,
    amount: formatMoney(m.pnl, { sign: 'always' }),
    tone: moveTone(m.pnl),
    pct: biggest > 0 ? Math.max(2, Math.round((Math.abs(m.pnl) / biggest) * 100)) : 0,
    barTone: m.pnl < 0 ? 'danger' : 'brand',
  }));
}

export interface UnderlyingRow {
  key: string;
  label: string;
  amount: string;
  tone: Tone;
}

/** The underlyings with their results, biggest move first (the server's order). */
export function underlyingRows(summary: FnoSummary): UnderlyingRow[] {
  return summary.byUnderlying.map((u) => ({
    key: u.underlying,
    label: u.underlying,
    amount: formatMoney(u.pnl, { sign: 'always' }),
    tone: moveTone(u.pnl),
  }));
}

// ---- Rows --------------------------------------------------------------------

export interface FnoListRow {
  id: string;
  /** "RELIANCE 3000 CE", "NIFTY OCT FUT". */
  contract: string;
  /** "29 Oct": the expiry, null without one. */
  expiry: string | null;
  /** "Option · CE", "Option · PE", "Future". */
  type: string;
  typeTone: 'info' | 'neutral';
  /** "3,000"; null for a future. */
  strike: string | null;
  qty: string;
  /** Without the ₹ (desktop column). */
  bought: string;
  sold: string;
  charges: string;
  /** "−1,339" without the ₹ (desktop column), "−₹1,339" with it (phone). */
  pnlPlain: string;
  pnl: string;
  pnlTone: Tone;
  /** "Statement" for an imported trade, "Manual" for a recorded one. */
  source: string;
  /** The phone's second line: "7 → 10 Oct · 500 qty · bought ₹14,500 · sold ₹13,250 · statement". */
  line: string;
}

/** The underlying of a trade: its own field, else the trading symbol. */
export function underlyingOf(trade: Pick<FnoTradeResponse, 'underlyingSymbol' | 'tradingSymbol'>): string {
  return trade.underlyingSymbol?.trim() || trade.tradingSymbol;
}

function monthShort(iso: string): string {
  return formatDate(iso, 'list').split(' ')[1]?.toUpperCase() ?? '';
}

/** "RELIANCE 3000 CE" for an option, "NIFTY OCT FUT" for a future (the expiry's month). */
export function contractName(trade: FnoTradeResponse): string {
  const underlying = underlyingOf(trade);
  if (trade.contractType === 'option') {
    return [underlying, trade.strikePrice != null ? formatQuantity(trade.strikePrice, 2).replace(/,/g, '') : null, trade.optionType]
      .filter(Boolean)
      .join(' ');
  }
  const month = trade.expiryDate ? monthShort(trade.expiryDate) : '';
  return [underlying, month, 'FUT'].filter(Boolean).join(' ');
}

/** "7 → 10 Oct", "30 Sep → 3 Oct", "10 Oct": the entry and exit of a trade; '' with neither. */
export function tradeSpan(entry: string | undefined, exit: string | undefined): string {
  if (!entry && !exit) return '';
  if (!entry) return formatDate(exit!, 'list');
  if (!exit) return formatDate(entry, 'list');
  const sameMonth = entry.slice(0, 7) === exit.slice(0, 7);
  return `${sameMonth ? formatDate(entry, 'list').split(' ')[0] : formatDate(entry, 'list')} → ${formatDate(exit, 'list')}`;
}

export function sourceLabel(source: string | undefined): string {
  return !source || source === 'manual' ? 'Manual' : 'Statement';
}

export function fnoListRow(trade: FnoTradeResponse): FnoListRow {
  const isOption = trade.contractType === 'option';
  const source = sourceLabel(trade.source);
  const line = [
    tradeSpan(trade.entryDate, trade.exitDate),
    `${formatQuantity(trade.quantity, 2)} qty`,
    `bought ${formatMoney(trade.buyValue, { decimals: 'auto' })}`,
    `sold ${formatMoney(trade.sellValue, { decimals: 'auto' })}`,
    source.toLowerCase(),
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    id: trade.id,
    contract: contractName(trade),
    expiry: trade.expiryDate ? formatDate(trade.expiryDate, 'list') : null,
    type: isOption ? (trade.optionType ? `Option · ${trade.optionType}` : 'Option') : 'Future',
    typeTone: isOption ? 'info' : 'neutral',
    strike: trade.strikePrice != null ? formatQuantity(trade.strikePrice, 2) : null,
    qty: formatQuantity(trade.quantity, 2),
    bought: formatQuantity(trade.buyValue, 2),
    sold: formatQuantity(trade.sellValue, 2),
    charges: formatMoney(trade.totalCharges ?? 0, { decimals: 'exact', symbol: false }),
    pnlPlain: formatMoney(trade.realizedPnl, { sign: 'always', symbol: false }),
    pnl: formatMoney(trade.realizedPnl, { sign: 'always' }),
    pnlTone: moveTone(trade.realizedPnl),
    source,
    line,
  };
}

export const FNO_PAGE_SIZE_LABEL = (n: number) => `${n} / page`;

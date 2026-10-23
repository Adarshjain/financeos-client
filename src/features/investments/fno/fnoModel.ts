import { formatDayMonth } from '@/features/accounts/list/accountsList';
import { fyStartYear } from '@/features/loans/detail/financialYear';
import { appHref } from '@/features/shell/routes';
import { todayInAppZone } from '@/lib/date-range';
import type { FnoPageQuery, FnoSort, FnoSummary } from '@/lib/investments.types';
import type { FnoTradeResponse } from '@/lib/types';

import {
  fyLabel,
  moveTone,
  plainPrice,
  plainSignedRupees,
  rupees,
  signedRupees,
} from '../investmentsFormat';

/** The F&O tab. */
export const FNO_HREF = appHref('/investments/fno');

/**
 * The Legacy page that holds the statement import wizard (Zerodha Tax P&L, F&O only). There is no Dinero wizard yet,
 * so "Import statement" goes there; the path is not routed through `appHref` because this page will be a Dinero page.
 */
export const IMPORT_STATEMENT_HREF = '/investments/fno';

// ---- URL state ---------------------------------------------------------------

export const FNO_SIZE_OPTIONS = [25, 50, 100];
export const FNO_DEFAULT_SIZE = 25;

/** The contract filter: every contract, futures, all options, calls or puts (the server's `optionType`). */
export type FnoContract = '' | 'FUT' | 'OPT' | 'CE' | 'PE';

export interface FnoUrlState {
  /** The symbol typed in the search field (contains, over symbol, underlying and notes); '' = no search. */
  q: string;
  contract: FnoContract;
  /** A broker account id; '' = every broker. */
  broker: string;
  /** The financial year's start year. */
  fy: number;
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

export function parseFnoUrl(params: {
  q?: string;
  contract?: string;
  broker?: string;
  fy?: string;
  sort?: string;
  page?: string;
  size?: string;
}): FnoUrlState {
  const page = Math.floor(Number(params.page));
  const size = Number(params.size);
  const fy = Math.floor(Number(params.fy));
  return {
    q: (params.q ?? '').trim(),
    contract: CONTRACTS.includes(params.contract as FnoContract) ? (params.contract as FnoContract) : '',
    broker: (params.broker ?? '').trim(),
    fy: Number.isFinite(fy) && fy >= 1900 && fy <= 2200 ? fy : currentFy(),
    sort: SORTS.includes(params.sort as FnoSort) ? (params.sort as FnoSort) : 'newest',
    page: Number.isFinite(page) && page > 0 ? page : 0,
    size: FNO_SIZE_OPTIONS.includes(size) ? size : FNO_DEFAULT_SIZE,
  };
}

/** The F&O tab URL for a state: defaults stay out of the query string. */
export function fnoUrl(state: FnoUrlState): string {
  const query = new URLSearchParams();
  if (state.q) query.set('q', state.q);
  if (state.contract) query.set('contract', state.contract);
  if (state.broker) query.set('broker', state.broker);
  if (state.fy !== currentFy()) query.set('fy', String(state.fy));
  if (state.sort !== 'newest') query.set('sort', state.sort);
  if (state.page > 0) query.set('page', String(state.page));
  if (state.size !== FNO_DEFAULT_SIZE) query.set('size', String(state.size));
  const text = query.toString();
  return text ? `${FNO_HREF}?${text}` : FNO_HREF;
}

/** The page request for a state. */
export function fnoQuery(state: FnoUrlState): FnoPageQuery {
  return {
    fy: state.fy,
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
    realised: { text: signedRupees(summary.realisedPnl), tone: moveTone(summary.realisedPnl) },
    realisedSub: trades(count),
    winRate: `${Number(summary.winRate.toFixed(1))}%`,
    winSub: `${summary.winCount} of ${count}`,
    charges: rupees(Math.round(summary.totalCharges)),
    chargesSub: trades(count),
  };
}

/** "Realised +₹10,456 · taxed as business income": the line under the list. */
export function realisedLine(summary: FnoSummary): string {
  return `Realised ${signedRupees(summary.realisedPnl)} · taxed as business income`;
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
    amount: signedRupees(m.pnl),
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
    amount: signedRupees(u.pnl),
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

/** Up to two decimals, none when whole: "14,500", "88.9", "11,250.5". */
export function trimmedAmount(value: number): string {
  return Number(value.toFixed(2)).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

/** The underlying of a trade: its own field, else the trading symbol. */
export function underlyingOf(trade: Pick<FnoTradeResponse, 'underlyingSymbol' | 'tradingSymbol'>): string {
  return trade.underlyingSymbol?.trim() || trade.tradingSymbol;
}

function monthShort(iso: string): string {
  return formatDayMonth(iso).split(' ')[1]?.toUpperCase() ?? '';
}

/** "RELIANCE 3000 CE" for an option, "NIFTY OCT FUT" for a future (the expiry's month). */
export function contractName(trade: FnoTradeResponse): string {
  const underlying = underlyingOf(trade);
  if (trade.contractType === 'option') {
    return [underlying, trade.strikePrice != null ? trimmedAmount(trade.strikePrice).replace(/,/g, '') : null, trade.optionType]
      .filter(Boolean)
      .join(' ');
  }
  const month = trade.expiryDate ? monthShort(trade.expiryDate) : '';
  return [underlying, month, 'FUT'].filter(Boolean).join(' ');
}

/** "7 → 10 Oct", "30 Sep → 3 Oct", "10 Oct": the entry and exit of a trade; '' with neither. */
export function tradeSpan(entry: string | undefined, exit: string | undefined): string {
  if (!entry && !exit) return '';
  if (!entry) return formatDayMonth(exit!);
  if (!exit) return formatDayMonth(entry);
  const sameMonth = entry.slice(0, 7) === exit.slice(0, 7);
  return `${sameMonth ? formatDayMonth(entry).split(' ')[0] : formatDayMonth(entry)} → ${formatDayMonth(exit)}`;
}

export function sourceLabel(source: string | undefined): string {
  return !source || source === 'manual' ? 'Manual' : 'Statement';
}

export function fnoListRow(trade: FnoTradeResponse): FnoListRow {
  const isOption = trade.contractType === 'option';
  const source = sourceLabel(trade.source);
  const line = [
    tradeSpan(trade.entryDate, trade.exitDate),
    `${trimmedAmount(trade.quantity)} qty`,
    `bought ₹${trimmedAmount(trade.buyValue)}`,
    `sold ₹${trimmedAmount(trade.sellValue)}`,
    source.toLowerCase(),
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    id: trade.id,
    contract: contractName(trade),
    expiry: trade.expiryDate ? formatDayMonth(trade.expiryDate) : null,
    type: isOption ? (trade.optionType ? `Option · ${trade.optionType}` : 'Option') : 'Future',
    typeTone: isOption ? 'info' : 'neutral',
    strike: trade.strikePrice != null ? trimmedAmount(trade.strikePrice) : null,
    qty: trimmedAmount(trade.quantity),
    bought: trimmedAmount(trade.buyValue),
    sold: trimmedAmount(trade.sellValue),
    charges: plainPrice(trade.totalCharges ?? 0),
    pnlPlain: plainSignedRupees(trade.realizedPnl),
    pnl: signedRupees(trade.realizedPnl),
    pnlTone: moveTone(trade.realizedPnl),
    source,
    line,
  };
}

export const FNO_PAGE_SIZE_LABEL = (n: number) => `${n} / page`;

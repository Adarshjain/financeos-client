import { formatAmount, formatDayMonth } from '@/features/accounts/list/accountsList';
import { fyStartYear as fyStartOf } from '@/features/loans/detail/financialYear';
import { DS_PREFIX } from '@/features/shell/routes';
import type { DividendFilters, DividendInstrumentTotal, DividendReceiptFilter } from '@/lib/investments.types';
import type { Dividend, DividendReceiptStatus, DividendReceiptSummary, DividendSuggestion, DividendSummary, DividendType } from '@/lib/types';

import { fyLabel, quantity, rupees, shortDate } from '../investmentsFormat';
import type { MatchReason, UnrecordedCredit } from './receiptTypes';

// ---- URL state ---------------------------------------------------------------

/** The Dividends tab address. It carries the Dinero prefix itself so it stays right once the prefix is dropped. */
export const DIVIDENDS_HREF = `${DS_PREFIX}/investments/dividends`;

export const DIVIDENDS_SIZE_OPTIONS = [25, 50, 100];
export const DIVIDENDS_DEFAULT_SIZE = 25;
/** The by-instrument card pages in tens. */
export const BY_INSTRUMENT_SIZE = 10;
/** Financial years the by-instrument card covers. */
export const BY_INSTRUMENT_YEARS = 3;

export interface DividendsUrlState {
  /** The FY's starting year; 'all' = every year; null = the current FY (the default). */
  fy: number | 'all' | null;
  /** A broker account id; '' = every broker. */
  broker: string;
  type: DividendType | '';
  receipt: DividendReceiptFilter | '';
  /** A holding's instrument, from the holding page's link; '' = every instrument. */
  instrument: string;
  page: number;
  size: number;
  /** The by-instrument card's page. */
  ipage: number;
}

export const DEFAULT_DIVIDENDS_URL: DividendsUrlState = {
  fy: null,
  broker: '',
  type: '',
  receipt: '',
  instrument: '',
  page: 0,
  size: DIVIDENDS_DEFAULT_SIZE,
  ipage: 0,
};

const TYPES: DividendType[] = ['dividend', 'interest', 'other'];
const RECEIPTS: DividendReceiptFilter[] = ['received', 'received_untracked', 'not_received', 'awaiting', 'overdue', 'unverifiable'];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const pageNo = (value: string | undefined) => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function parseDividendsUrl(params: {
  fy?: string;
  broker?: string;
  type?: string;
  receipt?: string;
  instrumentId?: string;
  page?: string;
  size?: string;
  ip?: string;
}): DividendsUrlState {
  const size = Number(params.size);
  const year = Number(params.fy);
  return {
    fy: params.fy === 'all' ? 'all' : /^\d{4}$/.test(params.fy ?? '') && year > 1900 ? year : null,
    broker: (params.broker ?? '').trim(),
    type: TYPES.includes(params.type as DividendType) ? (params.type as DividendType) : '',
    receipt: RECEIPTS.includes(params.receipt as DividendReceiptFilter) ? (params.receipt as DividendReceiptFilter) : '',
    instrument: UUID.test((params.instrumentId ?? '').trim()) ? (params.instrumentId ?? '').trim() : '',
    page: pageNo(params.page),
    size: DIVIDENDS_SIZE_OPTIONS.includes(size) ? size : DIVIDENDS_DEFAULT_SIZE,
    ipage: pageNo(params.ip),
  };
}

/** The Dividends tab URL for a state: defaults stay out of the query string. */
export function dividendsUrl(state: DividendsUrlState): string {
  const query = new URLSearchParams();
  if (state.fy !== null) query.set('fy', String(state.fy));
  if (state.broker) query.set('broker', state.broker);
  if (state.type) query.set('type', state.type);
  if (state.receipt) query.set('receipt', state.receipt);
  if (state.instrument) query.set('instrumentId', state.instrument);
  if (state.page > 0) query.set('page', String(state.page));
  if (state.size !== DIVIDENDS_DEFAULT_SIZE) query.set('size', String(state.size));
  if (state.ipage > 0) query.set('ip', String(state.ipage));
  const text = query.toString();
  return text ? `${DIVIDENDS_HREF}?${text}` : DIVIDENDS_HREF;
}

export { fyStartOf };

/** The FY the page shows: the one in the address, the current one by default, undefined for every year. */
export function effectiveFy(state: DividendsUrlState, today: string): number | undefined {
  if (state.fy === 'all') return undefined;
  return state.fy ?? fyStartOf(today);
}

/** The filters every dividend request shares: the list, the receipt summary and the CSV. `receipt` is the list's own. */
export function dividendFilters(state: DividendsUrlState, fy: number | undefined): DividendFilters {
  return {
    brokerAccountId: state.broker || undefined,
    type: state.type || undefined,
    instrumentId: state.instrument || undefined,
    fy,
    receipt: state.receipt || undefined,
  };
}

/** The filters of the summary and the receipt tiles: no receipt filter, so the tiles read the whole year. */
export function figureFilters(state: DividendsUrlState, fy: number | undefined): DividendFilters {
  return { ...dividendFilters(state, fy), receipt: undefined };
}

// ---- Filter choices -----------------------------------------------------------

export const RECEIPT_LABEL: Record<DividendReceiptStatus, string> = {
  received: 'Received',
  received_untracked: 'Received (untracked)',
  awaiting: 'Awaiting',
  overdue: 'Overdue',
  not_received: 'Not received',
  unverifiable: 'No bank data',
};

/** The receipt-status filter choices. */
export const RECEIPT_FILTER_OPTIONS = [
  { value: 'all', label: 'All receipts' },
  { value: 'received', label: 'Received' },
  { value: 'awaiting', label: 'Awaiting' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'unverifiable', label: 'No bank data' },
  { value: 'received_untracked', label: 'Received (untracked)' },
  { value: 'not_received', label: 'Not received' },
] as const;

export const TYPE_OPTIONS: { value: DividendType; label: string }[] = [
  { value: 'dividend', label: 'Dividend' },
  { value: 'interest', label: 'Interest' },
  { value: 'other', label: 'Other payout' },
];

export interface FyOption {
  value: string;
  label: string;
}

/** "All FYs", then every year that has a payout (newest first) and the one the page shows. */
export function fyOptions(summary: DividendSummary | null, shown: number | undefined, current: number): FyOption[] {
  const years = new Set<number>([current]);
  if (shown !== undefined) years.add(shown);
  for (const b of summary?.buckets ?? []) years.add(fyStartOf(b.fromDate));
  return [
    { value: 'all', label: 'All FYs' },
    ...[...years].sort((a, b) => b - a).map((y) => ({ value: String(y), label: fyLabel(y) })),
  ];
}

// ---- Figures ------------------------------------------------------------------

type Tone = 'positive' | 'danger' | 'warning' | undefined;

export interface FyTotals {
  gross: number;
  tds: number;
  net: number;
  count: number;
}

/** The totals of the shown FY from the all-years summary (every year's total when none is picked); null when the summary could not be read. */
export function fyTotals(summary: DividendSummary | null, fy: number | undefined): FyTotals | null {
  if (!summary) return null;
  if (fy === undefined) {
    return { gross: Number(summary.totalAmount), tds: Number(summary.totalTds), net: Number(summary.totalNet), count: summary.totalCount };
  }
  const bucket = summary.buckets.find((b) => fyStartOf(b.fromDate) === fy);
  return bucket
    ? { gross: Number(bucket.amount), tds: Number(bucket.tds), net: Number(bucket.net), count: bucket.count }
    : { gross: 0, tds: 0, net: 0, count: 0 };
}

const NOT_RECEIVED_STATUSES = ['overdue', 'awaiting', 'not_received'] as const;
export type NotReceivedStatus = (typeof NOT_RECEIVED_STATUSES)[number];
const NOT_RECEIVED_WORD: Record<NotReceivedStatus, string> = { overdue: 'overdue', awaiting: 'awaiting', not_received: 'not received' };

function bucket(summary: DividendReceiptSummary | null, status: DividendReceiptStatus) {
  return summary?.buckets.find((b) => b.status === status);
}

/** The statuses that make up "Not received" and how many payouts each holds. */
export function notReceivedCounts(summary: DividendReceiptSummary | null): { status: NotReceivedStatus; count: number }[] {
  return NOT_RECEIVED_STATUSES.map((status) => ({ status, count: bucket(summary, status)?.count ?? 0 })).filter((s) => s.count > 0);
}

/** "ITC overdue · TCS awaiting": the instruments behind the figure, or a count when their names are not known. */
export function notReceivedNote(counts: { status: NotReceivedStatus; count: number }[], names: Partial<Record<NotReceivedStatus, string[]>>): string | undefined {
  const parts = counts.map(({ status, count }) => {
    const list = names[status] ?? [];
    if (list.length === 0) return `${count} ${NOT_RECEIVED_WORD[status]}`;
    const shown = list.slice(0, 2).join(', ');
    const more = count - Math.min(list.length, 2);
    return `${shown}${more > 0 ? ` +${more}` : ''} ${NOT_RECEIVED_WORD[status]}`;
  });
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export interface DividendsFigures {
  /** "FY 26-27", or null for every year. */
  fy: string | null;
  declared: { value: string; context: string };
  received: { value: string; context: string };
  tds: { value: string; context: string };
  notReceived: { value: string; context?: string; tone: Tone };
}

/** "2 matched to bank credits", plus the untracked ones when there are any. */
function matchedLine(received: number, untracked: number): string {
  const base = `${received} matched to ${received === 1 ? 'a bank credit' : 'bank credits'}`;
  return untracked > 0 ? `${base} · incl. ${untracked} untracked` : base;
}

/** What a figure that could not be read shows. */
export const UNAVAILABLE = '—';

export function dividendsFigures(
  fy: number | undefined,
  totals: FyTotals | null,
  receipts: DividendReceiptSummary | null,
  names: Partial<Record<NotReceivedStatus, string[]>>,
): DividendsFigures {
  const received = bucket(receipts, 'received');
  const untracked = bucket(receipts, 'received_untracked');
  const open = NOT_RECEIVED_STATUSES.reduce((sum, s) => sum + (bucket(receipts, s)?.expectedNet ?? 0), 0);
  return {
    fy: fy === undefined ? null : fyLabel(fy),
    declared: totals
      ? { value: rupees(totals.gross), context: `${totals.count} ${totals.count === 1 ? 'payout' : 'payouts'}` }
      : { value: UNAVAILABLE, context: '' },
    received: receipts
      ? {
          value: rupees((received?.receivedAmount ?? 0) + (untracked?.receivedAmount ?? 0)),
          context: matchedLine(received?.count ?? 0, untracked?.count ?? 0),
        }
      : { value: UNAVAILABLE, context: '' },
    tds: totals ? { value: rupees(totals.tds), context: 'claim in ITR' } : { value: UNAVAILABLE, context: '' },
    notReceived: receipts
      ? { value: rupees(open), context: notReceivedNote(notReceivedCounts(receipts), names), tone: open > 0 ? 'warning' : undefined }
      : { value: UNAVAILABLE, context: undefined, tone: undefined },
  };
}

export interface DividendsTile {
  label: string;
  value: string;
  context?: string;
  tone?: Tone;
}

/** The four desktop tiles: Declared, Received, TDS, Not received. */
export function dividendsTiles(f: DividendsFigures): DividendsTile[] {
  return [
    { label: f.fy ? 'Declared · FY' : 'Declared', value: f.declared.value, context: f.declared.context },
    { label: 'Received', value: f.received.value, context: f.received.context, tone: f.received.value === UNAVAILABLE ? undefined : 'positive' },
    { label: 'TDS', value: f.tds.value, context: f.tds.context },
    { label: 'Not received', value: f.notReceived.value, context: f.notReceived.context, tone: f.notReceived.tone },
  ];
}

// ---- The list -------------------------------------------------------------------

/** "110", "1,500", "1,020.50": a table figure, whole when it is whole. */
export function plainAmount(value: number): string {
  return formatAmount(value, Number.isInteger(value) ? 0 : 2);
}

/** "₹11", "₹5.50", "₹7.5025": a per-unit figure with the decimals it needs (at least two when not whole). */
export function perUnitText(value: number): string {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 4 })}`;
}

/** The units behind a payout: gross over the per-unit amount; null when either is missing. */
export function unitsOf(gross: number, perUnit: number | null): number | null {
  if (!perUnit || perUnit <= 0 || gross <= 0) return null;
  const units = gross / perUnit;
  return Number.isFinite(units) ? Number(units.toFixed(4)) : null;
}

export interface ReceiptWord {
  label: string;
  tone: 'neutral' | 'info' | 'warning' | 'success';
}

/** The word of a receipt status: green when the money is in, amber when it needs you, grey otherwise. */
export function receiptWord(status: DividendReceiptStatus | undefined | null): ReceiptWord | null {
  switch (status) {
    case 'received':
    case 'received_untracked':
      return { label: RECEIPT_LABEL[status], tone: 'success' };
    case 'overdue':
    case 'not_received':
      return { label: RECEIPT_LABEL[status], tone: 'warning' };
    case 'awaiting':
    case 'unverifiable':
      return { label: RECEIPT_LABEL[status], tone: 'neutral' };
    default:
      return null;
  }
}

export interface DividendListRow {
  id: string;
  /** "TCS"; the instrument's name when it has no symbol. */
  title: string;
  /** "29 Sep 26" for the table. */
  payDate: string;
  /** "29 Sep" for the phone line. */
  payDay: string;
  perUnit: string;
  gross: string;
  tds: string;
  net: string;
  receipt: ReceiptWord | null;
  /** "₹11 × 10", or null when the payout has no per-unit amount. */
  unitsLine: string | null;
  /** "TDS ₹88", or null when none was held. */
  tdsLine: string | null;
  /** The account the linked credit landed in. */
  account: string | null;
  /** True while the payout can still be matched to a credit (awaiting or overdue and not linked). */
  canLink: boolean;
  /** "no statement covers 28 Aug" when the bank data stops short of the pay date. */
  noBankNote: string | null;
}

export function dividendListRow(d: Dividend): DividendListRow {
  const gross = Number(d.amount || 0);
  const tds = Number(d.tds || 0);
  const perUnit = d.perUnit ? Number(d.perUnit) : null;
  const units = unitsOf(gross, perUnit);
  const payDay = formatDayMonth(d.payDate);
  return {
    id: d.id,
    title: d.symbol || d.instrumentName || 'Instrument',
    payDate: shortDate(d.payDate),
    payDay,
    perUnit: perUnit ? formatAmount(perUnit, 2) : '—',
    gross: plainAmount(gross),
    tds: plainAmount(tds),
    net: plainAmount(gross - tds),
    receipt: receiptWord(d.receiptStatus),
    unitsLine: perUnit && units ? `${perUnitText(perUnit)} × ${quantity(units)}` : null,
    tdsLine: tds > 0 ? `TDS ${rupees(tds)}` : null,
    account: d.transaction?.accountName ?? null,
    canLink: !d.transaction && (d.receiptStatus === 'awaiting' || d.receiptStatus === 'overdue'),
    noBankNote: d.receiptStatus === 'unverifiable' ? `no statement covers ${payDay}` : null,
  };
}

/** The footer of the list: what the filtered payouts add up to. TDS is left out when the figure is not known. */
export function listTotals(
  state: DividendsUrlState,
  totals: FyTotals | null,
  receipts: DividendReceiptSummary | null,
  rows: Dividend[],
  totalElements: number,
): { net: string; tds: string | null } | null {
  if (!state.receipt) return totals ? { net: rupees(totals.net), tds: rupees(totals.tds) } : null;
  // A receipt filter narrows the list below what the summary covers: one page can be added up, a filtered total comes from the receipt buckets.
  if (totalElements <= rows.length) {
    const net = rows.reduce((s, d) => s + Number(d.amount || 0) - Number(d.tds || 0), 0);
    const tds = rows.reduce((s, d) => s + Number(d.tds || 0), 0);
    return { net: rupees(net), tds: rupees(tds) };
  }
  const found = bucket(receipts, state.receipt);
  return found ? { net: rupees(found.expectedNet), tds: null } : null;
}

/** "Total net ₹3,605 · TDS ₹370". */
export function totalsLine(t: { net: string; tds: string | null }): string {
  return `Total net ${t.net}${t.tds ? ` · TDS ${t.tds}` : ''}`;
}

// ---- Receipts and credits -------------------------------------------------------

/** Variance (in ₹) between the expected net and the linked credit that is still "matches": rounding noise. */
const VARIANCE_TOLERANCE = 1;

/** Signed gap between the linked credit and the expected net, or null when the dividend isn't linked or the gap is within tolerance. */
export function receiptVariance(dividend: Dividend): number | null {
  if (!dividend.transaction) return null;
  const expectedNet = Number(dividend.amount || 0) - Number(dividend.tds || 0);
  const diff = dividend.transaction.signedAmount - expectedNet;
  return Math.abs(diff) > VARIANCE_TOLERANCE ? diff : null;
}

/** A TDS hint is only offered when the shortfall looks like withholding. */
const MAX_TDS_GAP_FRACTION = 0.25;

/** The shortfall of a linked credit against the gross amount when it looks like TDS and no TDS is entered; else null. */
export function tdsHint(txnAmount: number | null, gross: number, tds: string): number | null {
  if (txnAmount === null || tds.trim() !== '') return null;
  const gap = gross - txnAmount;
  return gap > 0 && gap <= gross * MAX_TDS_GAP_FRACTION ? Math.round(gap * 100) / 100 : null;
}

export type ReceiptNote = 'derived' | 'received_untracked' | 'not_received';

export const RECEIPT_NOTE_OPTIONS: { value: ReceiptNote; label: string }[] = [
  { value: 'derived', label: 'Worked out automatically' },
  { value: 'received_untracked', label: "Received in an account that isn't tracked" },
  { value: 'not_received', label: 'Not received' },
];

export function receiptNoteOf(status: DividendReceiptStatus | undefined | null): ReceiptNote {
  return status === 'received_untracked' || status === 'not_received' ? status : 'derived';
}

export const REASON_LABELS: Record<MatchReason, string> = {
  EXACT_GROSS: 'Exact amount',
  NET_OF_RECORDED_TDS: 'Net of recorded TDS',
  NET_OF_10PCT_TDS: 'Net of 10% TDS',
  AMOUNT_WITHIN_BAND: 'Amount in range',
  SPLIT_RATIO_SUSPECT: 'Split multiple? check expected amount',
  DIVIDEND_KEYWORD: 'Says dividend',
  NAME_MATCH: 'Names the company',
  SYMBOL_MATCH: 'Mentions ticker',
};

/** One bank credit in the banner: its description, amount and day. */
function creditPhrase(c: UnrecordedCredit): string {
  const t = c.transaction;
  return `"${t.description || t.sourcedDescription || 'Transaction'}" ${rupees(Math.abs(t.amount))} on ${formatDayMonth(t.date)}`;
}

/** The banner over the list: how many credits look like dividends and the first two, or null with none. */
export function unrecordedBanner(items: UnrecordedCredit[]): { title: string; detail: string } | null {
  if (items.length === 0) return null;
  const n = items.length;
  const shown = items.slice(0, 2).map(creditPhrase);
  const rest = n - shown.length;
  const detail = rest > 0 ? `${shown.join(', ')} and ${rest} more.` : shown.length === 2 ? `${shown[0]} and ${shown[1]}.` : `${shown[0]}.`;
  return {
    title: `${n} bank ${n === 1 ? 'credit looks' : 'credits look'} like ${n === 1 ? 'a dividend' : 'dividends'} but ${n === 1 ? 'is' : 'are'} not recorded:`,
    detail,
  };
}

// ---- By instrument ---------------------------------------------------------------

export interface ByInstrumentRow {
  id: string;
  title: string;
  net: string;
}

export function byInstrumentRow(t: DividendInstrumentTotal): ByInstrumentRow {
  return { id: t.instrumentId, title: t.symbol || t.instrumentName, net: rupees(t.net) };
}

// ---- Suggestions -----------------------------------------------------------------

export interface SuggestionRow {
  key: string;
  title: string;
  line: string;
}

/** "paid 5 Aug · 10 shares · ₹100"; a payout from an earlier year carries the year ("paid 28 Oct 25"). */
export function suggestionRow(s: DividendSuggestion, thisYear: string): SuggestionRow {
  const units = Number(s.qtyHeld);
  const date = s.exDate.slice(0, 4) === thisYear ? formatDayMonth(s.exDate) : shortDate(s.exDate);
  return {
    key: `${s.holdingId}-${s.exDate}`,
    title: `${s.symbol} · ${perUnitText(Number(s.perUnit))} / share`,
    line: `paid ${date} · ${quantity(units)} ${units === 1 ? 'share' : 'shares'} · ${rupees(Number(s.estimatedAmount))}`,
  };
}

/** The note a recorded suggestion carries. */
export function suggestionNote(s: DividendSuggestion): string {
  return `Auto-detected dividend (${s.qtyHeld} units @ ₹${s.perUnit})`;
}

// ---- Money fields -----------------------------------------------------------------

/** A typed number rounded to `places` decimals (paise: 2, a per-unit amount: 4); undefined when empty or not a number. */
export function toDecimal(text: string, places: number): number | undefined {
  const n = Number(text);
  if (text.trim() === '' || !Number.isFinite(n)) return undefined;
  const scale = 10 ** places;
  return Math.round(n * scale) / scale;
}

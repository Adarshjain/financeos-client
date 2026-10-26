import { appHref } from '@/features/shell/routes';
import type { ReviewReason, ReviewType, TransactionSource } from '@/lib/transaction.types';

// The Transactions list keeps everything in the address: a link opens it filtered, refresh and Back
// keep it, and the server page reads it once before the first fetch.

export const TRANSACTIONS_HREF = appHref('/transactions');

export const TRANSACTIONS_SIZE_OPTIONS = [25, 50, 100];
export const TRANSACTIONS_DEFAULT_SIZE = 25;

// ---- Period ----------------------------------------------------------------

export const PERIOD_PRESETS = [
  { id: 'last_14_days', label: 'Last 14 days' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This week' },
  { id: 'previous_week', label: 'Last week' },
  { id: 'this_month', label: 'This month' },
  { id: 'previous_month', label: 'Last month' },
  { id: 'this_year', label: 'This year' },
  { id: 'current_fy', label: 'Current FY' },
  { id: 'prev_fy', label: 'Previous FY' },
  { id: 'all_time', label: 'All time' },
] as const;

export type PeriodPresetId = (typeof PERIOD_PRESETS)[number]['id'];

export type Period =
  | { kind: 'preset'; id: PeriodPresetId }
  | { kind: 'date'; date: string }
  | { kind: 'range'; from: string; to: string };

export const ALL_TIME = { kind: 'preset', id: 'all_time' } as const satisfies Period;
/** No period in the address means every transaction, latest first; "Last 14 days" is a choice, not the default. */
export const DEFAULT_PERIOD = ALL_TIME;

export function isAllTime(period: Period): boolean {
  return period.kind === 'preset' && period.id === 'all_time';
}

// ---- Review, reasons, sources, sort ---------------------------------------

export const REVIEW_PARAMS: Record<string, ReviewType> = {
  needs_review: 'NEEDS_REVIEW',
  auto_reviewed: 'AUTO_REVIEWED',
  manually_reviewed: 'MANUALLY_REVIEWED',
  na: 'NA',
};

export const REASON_PARAMS: Record<string, ReviewReason> = {
  unreconciled: 'UNRECONCILED',
  category_unverified: 'CATEGORY_UNVERIFIED',
  duplicate_suspect: 'DUPLICATE_SUSPECT',
  date_corrected: 'DATE_CORRECTED',
};

const SOURCES: TransactionSource[] = ['gmail_transaction_alert', 'gmail_statement', 'manual', 'file_upload'];

export const SORTS = [
  { id: 'newest', label: 'Newest', server: 'date,desc' },
  { id: 'oldest', label: 'Oldest', server: 'date,asc' },
  { id: 'highest', label: 'Highest amount', server: 'amount,desc' },
  { id: 'lowest', label: 'Lowest amount', server: 'amount,asc' },
] as const;

export type SortId = (typeof SORTS)[number]['id'];

export type TypeFilter = 'all' | 'debit' | 'credit';

export type AmountOp = 'greater_than' | 'less_than' | 'between';

/** `from` is the lower bound (Greater than, Between), `to` the upper (Less than, Between). */
export interface AmountCondition {
  op: AmountOp;
  from: number | null;
  to: number | null;
}

const AMOUNT_PARAMS: Record<string, AmountOp> = { gt: 'greater_than', lt: 'less_than', between: 'between' };

// ---- The query -------------------------------------------------------------

export interface TransactionsQuery {
  q: string;
  period: Period;
  /** Account ids. */
  accounts: string[];
  /** Category names, as the server filters them. */
  categories: string[];
  /** Only transactions with no category (`uncategorized=1`). */
  uncategorized: boolean;
  type: TypeFilter;
  amount: AmountCondition | null;
  review: ReviewType | null;
  reason: ReviewReason | null;
  monitoring: boolean;
  upToStatement: boolean;
  excluded: boolean;
  source: TransactionSource | null;
  sort: SortId;
  /** A transaction to open in the detail panel (a link, e.g. from search); never written by the list itself. */
  txn: string | null;
  /** 0-based. */
  page: number;
  size: number;
}

export const DEFAULT_QUERY: TransactionsQuery = {
  q: '',
  period: DEFAULT_PERIOD,
  accounts: [],
  categories: [],
  uncategorized: false,
  type: 'all',
  amount: null,
  review: null,
  reason: null,
  monitoring: false,
  upToStatement: false,
  excluded: false,
  source: null,
  txn: null,
  sort: 'newest',
  page: 0,
  size: TRANSACTIONS_DEFAULT_SIZE,
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

const TXN_ID = /^[\w-]{1,64}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

function many(value: string | string[] | undefined): string[] {
  const list = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return [...new Set(list.map((v) => v.trim()).filter(Boolean))];
}

function validDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function amountNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parsePeriod(params: RawSearchParams): Period {
  const date = one(params.date);
  if (validDate(date)) return { kind: 'date', date };
  const from = one(params.from);
  const to = one(params.to);
  if (validDate(from) && validDate(to)) {
    return from <= to ? { kind: 'range', from, to } : { kind: 'range', from: to, to: from };
  }
  const preset = PERIOD_PRESETS.find((p) => p.id === one(params.period));
  return preset ? { kind: 'preset', id: preset.id } : DEFAULT_PERIOD;
}

function parseAmount(params: RawSearchParams): AmountCondition | null {
  const op = AMOUNT_PARAMS[one(params.amount)];
  if (!op) return null;
  const from = amountNumber(one(params.amountFrom));
  const to = amountNumber(one(params.amountTo));
  if (op === 'greater_than') return from === null ? null : { op, from, to: null };
  if (op === 'less_than') return to === null ? null : { op, from: null, to };
  if (from === null || to === null) return null;
  return { op, from: Math.min(from, to), to: Math.max(from, to) };
}

/** A transaction id from ?txn; anything that is not a plain id (letters, digits, - and _) is no link. */
export function parseTxn(value: string | null | undefined): string | null {
  const id = (value ?? '').trim();
  return TXN_ID.test(id) ? id : null;
}

/** The query a set of URL params stands for; anything missing or invalid falls back to its default. */
export function parseTransactionsUrl(params: RawSearchParams): TransactionsQuery {
  const page = Math.floor(Number(one(params.page)));
  const size = Number(one(params.size));
  const type = one(params.type);
  const source = one(params.source) as TransactionSource;
  const sort = SORTS.find((s) => s.id === one(params.sort));
  // The two are exclusive: with no category asked for, picked categories could only give an empty list.
  const uncategorized = one(params.uncategorized) === '1';
  return {
    q: one(params.q).trim(),
    period: parsePeriod(params),
    accounts: many(params.account),
    categories: uncategorized ? [] : many(params.category),
    uncategorized,
    type: type === 'debit' || type === 'credit' ? type : 'all',
    amount: parseAmount(params),
    review: REVIEW_PARAMS[one(params.review)] ?? null,
    reason: REASON_PARAMS[one(params.reason)] ?? null,
    monitoring: one(params.monitoring) === '1',
    upToStatement: one(params.statement) === '1',
    excluded: one(params.excluded) === '1',
    source: SOURCES.includes(source) ? source : null,
    txn: parseTxn(one(params.txn)),
    sort: sort?.id ?? 'newest',
    page: Number.isFinite(page) && page > 0 ? page : 0,
    size: TRANSACTIONS_SIZE_OPTIONS.includes(size) ? size : TRANSACTIONS_DEFAULT_SIZE,
  };
}

function keyOf<T extends string>(table: Record<string, T>, value: T): string | undefined {
  return Object.keys(table).find((k) => table[k] === value);
}

function samePeriod(a: Period, b: Period): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** The query string (no leading "?") for a query, in a stable order with defaults left out. */
export function transactionsSearch(query: TransactionsQuery): string {
  const out = new URLSearchParams();
  if (query.q) out.set('q', query.q);
  if (query.txn) out.set('txn', query.txn);
  const { period } = query;
  if (period.kind === 'date') out.set('date', period.date);
  else if (period.kind === 'range') {
    out.set('from', period.from);
    out.set('to', period.to);
  } else if (!samePeriod(period, DEFAULT_PERIOD)) out.set('period', period.id);
  query.accounts.forEach((id) => out.append('account', id));
  query.categories.forEach((name) => out.append('category', name));
  if (query.uncategorized) out.set('uncategorized', '1');
  if (query.type !== 'all') out.set('type', query.type);
  if (query.amount) {
    out.set('amount', keyOf(AMOUNT_PARAMS, query.amount.op) ?? '');
    if (query.amount.from !== null) out.set('amountFrom', String(query.amount.from));
    if (query.amount.to !== null) out.set('amountTo', String(query.amount.to));
  }
  if (query.review) out.set('review', keyOf(REVIEW_PARAMS, query.review) ?? '');
  if (query.reason) out.set('reason', keyOf(REASON_PARAMS, query.reason) ?? '');
  if (query.monitoring) out.set('monitoring', '1');
  if (query.upToStatement) out.set('statement', '1');
  if (query.excluded) out.set('excluded', '1');
  if (query.source) out.set('source', query.source);
  if (query.sort !== 'newest') out.set('sort', query.sort);
  if (query.page > 0) out.set('page', String(query.page));
  if (query.size !== TRANSACTIONS_DEFAULT_SIZE) out.set('size', String(query.size));
  return out.toString();
}

/** The Transactions URL for a query. */
export function transactionsUrl(query: TransactionsQuery): string {
  const text = transactionsSearch(query);
  return text ? `${TRANSACTIONS_HREF}?${text}` : TRANSACTIONS_HREF;
}

/** "Clear all filters": search, every filter and the period go (all time); sort and page size stay. */
export function clearedQuery(query: TransactionsQuery): TransactionsQuery {
  return { ...DEFAULT_QUERY, period: ALL_TIME, sort: query.sort, size: query.size };
}

/** True when nothing narrows the list: no search, no filter and the period is all time. */
export function isUnfiltered(query: TransactionsQuery): boolean {
  const cleared = clearedQuery(query);
  return transactionsSearch({ ...query, page: 0 }) === transactionsSearch({ ...cleared, page: 0 });
}

import type { SelectOption } from '@/components/ds';
import { REVIEW_REASON_META } from '@/features/transactions/catalog';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import { formatCount, formatMoney } from '@/lib/format';
import { AccountType } from '@/lib/types';

import {
  type AmountCondition,
  type AmountOp,
  type Period,
  PERIOD_PRESETS,
  REASON_PARAMS,
  REVIEW_PARAMS,
  SORTS,
  type TransactionsQuery,
  type TypeFilter,
} from './transactionsUrl';

/** Dates read dd/mm/yyyy in fields and chips. */
export function dmy(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export function periodLabel(period: Period): string {
  if (period.kind === 'date') return dmy(period.date);
  if (period.kind === 'range') return `${dmy(period.from)} – ${dmy(period.to)}`;
  return PERIOD_PRESETS.find((p) => p.id === period.id)?.label ?? period.id;
}

export const PERIOD_OPTIONS: SelectOption[] = PERIOD_PRESETS.map((p) => ({ value: p.id, label: p.label }));

export const SORT_OPTIONS: SelectOption[] = SORTS.map((s) => ({ value: s.id, label: s.label }));

/** The sort field of the Filters dialog (the chip row says "Newest"). */
export const SORT_ORDER_OPTIONS: SelectOption[] = [
  { value: 'newest', label: 'Date · newest first' },
  { value: 'oldest', label: 'Date · oldest first' },
  { value: 'highest', label: 'Amount · highest first' },
  { value: 'lowest', label: 'Amount · lowest first' },
];

export const TYPE_OPTIONS: (SelectOption & { value: TypeFilter })[] = [
  { value: 'all', label: 'All' },
  { value: 'debit', label: 'Expense' },
  { value: 'credit', label: 'Income' },
];

export const AMOUNT_OP_OPTIONS: (SelectOption & { value: AmountOp })[] = [
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
  { value: 'between', label: 'Between' },
];

export const ANY = 'any';

export const REVIEW_OPTIONS: SelectOption[] = [
  { value: ANY, label: 'Any' },
  { value: 'needs_review', label: 'Needs review' },
  { value: 'auto_reviewed', label: 'Auto reviewed' },
  { value: 'manually_reviewed', label: 'Manually reviewed' },
  { value: 'na', label: 'N/A' },
];

export const SOURCE_OPTIONS: SelectOption[] = [
  { value: ANY, label: 'Any' },
  { value: 'gmail_transaction_alert', label: 'Gmail alert' },
  { value: 'gmail_statement', label: 'Gmail statement' },
  { value: 'manual', label: 'Manual' },
  { value: 'file_upload', label: 'File upload' },
];

/** The reasons the server filters on (Date corrected included), behind "All reasons". */
export const REASON_OPTIONS: SelectOption[] = [
  { value: ANY, label: 'All reasons' },
  ...Object.entries(REASON_PARAMS).map(([param, reason]) => ({ value: param, label: REVIEW_REASON_META[reason].label })),
];

export function reviewLabel(review: NonNullable<TransactionsQuery['review']>): string {
  const param = Object.keys(REVIEW_PARAMS).find((k) => REVIEW_PARAMS[k] === review);
  return REVIEW_OPTIONS.find((o) => o.value === param)?.label ?? review;
}

export function sourceLabel(source: string): string {
  return SOURCE_OPTIONS.find((o) => o.value === source)?.label ?? source;
}

export function reasonLabel(reason: NonNullable<TransactionsQuery['reason']>): string {
  return REVIEW_REASON_META[reason].label;
}

function rupees(n: number): string {
  return formatMoney(n, { decimals: 'auto' });
}

/** "Over ₹500", "Under ₹5,000", "₹500 – ₹5,000". */
export function amountLabel(amount: AmountCondition): string {
  if (amount.op === 'greater_than') return `Over ${rupees(amount.from ?? 0)}`;
  if (amount.op === 'less_than') return `Under ${rupees(amount.to ?? 0)}`;
  return `${rupees(amount.from ?? 0)} – ${rupees(amount.to ?? 0)}`;
}

/** The account types the Account filter can list, in picker order. */
export const FILTER_ACCOUNT_TYPES: readonly AccountType[] = [
  AccountType.BANK_ACCOUNT,
  AccountType.CREDIT_CARD,
  AccountType.GENERIC,
  AccountType.BROKER,
];

/** The accounts the Account filter lists: every bank, card and wallet account, and only the brokers already picked. */
export function filterAccounts(picked: readonly string[], accounts: readonly Account[]): Account[] {
  return accounts.filter((a) => a.type !== AccountType.BROKER || picked.includes(a.id));
}

/** The Category dropdown: the server filters on the category name. */
export function categoryOptions(categories: readonly Category[]): SelectOption[] {
  return categories.map((c) => ({ value: c.name, label: c.name }));
}

/** The words of every active filter, for "No transactions match": "Last 14 days · manual · excluded only". */
export function activeFilterWords(query: TransactionsQuery): string {
  const words: string[] = [];
  if (!(query.period.kind === 'preset' && query.period.id === 'all_time')) words.push(periodLabel(query.period));
  if (query.q) words.push(`“${query.q}”`);
  if (query.accounts.length > 0) words.push(formatCount(query.accounts.length, ['account', 'accounts']));
  if (query.categories.length > 0) {
    words.push(formatCount(query.categories.length, ['category', 'categories']));
  }
  if (query.uncategorized) words.push('uncategorized');
  if (query.type !== 'all') words.push(query.type === 'debit' ? 'expense' : 'income');
  if (query.amount) words.push(amountLabel(query.amount).toLowerCase());
  if (query.review) words.push(reviewLabel(query.review).toLowerCase());
  if (query.reason) words.push(reasonLabel(query.reason).toLowerCase());
  if (query.monitoring) words.push('monitoring');
  if (query.upToStatement) words.push('up to statement');
  if (query.excluded) words.push('excluded only');
  if (query.source) words.push(sourceLabel(query.source).toLowerCase());
  return words.join(' · ');
}

/** How many filters narrow the list, for the count on "All filters" (search is not a filter). */
export function activeFilterCount(query: TransactionsQuery): number {
  return [
    !(query.period.kind === 'preset' && query.period.id === 'all_time'),
    query.accounts.length > 0,
    query.categories.length > 0,
    query.uncategorized,
    query.type !== 'all',
    query.amount !== null,
    query.review !== null,
    query.reason !== null,
    query.monitoring,
    query.upToStatement,
    query.excluded,
    query.source !== null,
  ].filter(Boolean).length;
}

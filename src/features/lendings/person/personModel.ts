import { daysBetween } from '@/features/loans/loanFormat';
import { appHref } from '@/features/shell/routes';
import { formatCount, formatDate, formatMoney, initialsOf } from '@/lib/format';
import type { CounterpartyResponse, LedgerEntryResponse, LendingDirection } from '@/lib/lending.types';
import { ENTRY_TYPE_SHORT, isSettlementType, toEntryType } from '@/lib/lendingEntry';


// ---- URL state -------------------------------------------------------------

export const LEDGER_SIZE_OPTIONS = [10, 25, 50];
export const LEDGER_DEFAULT_SIZE = 25;

export interface PersonUrlState {
  page: number;
  size: number;
}

export function parsePersonUrl(params: { page?: string; size?: string }): PersonUrlState {
  const page = Math.floor(Number(params.page));
  const size = Number(params.size);
  return {
    page: Number.isFinite(page) && page > 0 ? page : 0,
    size: LEDGER_SIZE_OPTIONS.includes(size) ? size : LEDGER_DEFAULT_SIZE,
  };
}

/** The person page's own path (Dinero when built). */
export function personHref(id: string): string {
  return appHref(`/loans/lendings/${id}`);
}

/** The person page URL for a state: defaults stay out of the query string. */
export function personUrl(id: string, state: PersonUrlState): string {
  const query = new URLSearchParams();
  if (state.page > 0) query.set('page', String(state.page));
  if (state.size !== LEDGER_DEFAULT_SIZE) query.set('size', String(state.size));
  const text = query.toString();
  return text ? `${personHref(id)}?${text}` : personHref(id);
}

// ---- Header ----------------------------------------------------------------

function monthOf(iso: string): string {
  return formatDate(iso, 'month');
}

/** "in 15 days", "today", "3 days overdue". */
export function inDays(days: number): string {
  if (days === 0) return 'today';
  const n = Math.abs(days);
  return days > 0 ? `in ${formatCount(n, ['day', 'days'])}` : `${formatCount(n, ['day', 'days'])} overdue`;
}

export interface PersonHeaderModel {
  initials: string;
  /** "College friend · 3 entries since Aug" */
  meta: string;
  eyebrow: 'Owes you' | 'You owe' | 'Settled';
  /** "₹15,000" */
  amount: string;
  tone: 'positive' | 'ink';
  /** "expected 28 Oct · in 15 days", or null. */
  context: string | null;
}

/** `firstEntryDate` is the oldest entry's date, null before any entry. */
export function personHeader(cp: CounterpartyResponse, firstEntryDate: string | null, today: string): PersonHeaderModel {
  const net = cp.netPosition;
  const entries =
    cp.entryCount === 0
      ? 'No entries yet'
      : `${formatCount(cp.entryCount, ['entry', 'entries'])}${firstEntryDate ? ` since ${monthOf(firstEntryDate)}` : ''}`;
  let context: string | null = null;
  if (net !== 0 && cp.expectedReturnDate) {
    const days = daysBetween(today, cp.expectedReturnDate);
    const day = formatDate(cp.expectedReturnDate, 'list');
    context = `${net < 0 ? 'due' : 'expected'} ${day}${days === null ? '' : ` · ${inDays(days)}`}`;
  }
  return {
    initials: initialsOf(cp.name),
    meta: [cp.notes?.trim(), entries].filter(Boolean).join(' · '),
    eyebrow: net > 0 ? 'Owes you' : net < 0 ? 'You owe' : 'Settled',
    amount: formatMoney(Math.abs(net), { decimals: 'auto' }),
    tone: net > 0 ? 'positive' : 'ink',
    context,
  };
}

// ---- Ledger ----------------------------------------------------------------

export interface LedgerRow {
  id: string;
  entry: LedgerEntryResponse;
  /** "10 Oct" */
  date: string;
  /** The entry's note, else its type ("Lent", "They repaid"). */
  title: string;
  linked: boolean;
  /** The balance right after this entry is zero. */
  settled: boolean;
  /** "25,000", or null. */
  lent: string | null;
  /** "+10,000", or null. */
  received: string | null;
  /** "15,000", "0", "-3,000". */
  balance: string;
  /** Phone's second line: "10 Oct · received ₹10,000 · UPI from Rahul Sharma". */
  sub: string;
}

/** What the money did in the entry's own words: principal reads lent / borrowed, a repayment received / paid. */
export function entryWord(direction: LendingDirection, kind: LedgerEntryResponse['kind']): string {
  if (kind === 'settlement') return direction === 'borrowed' ? 'received' : 'paid';
  return direction;
}

function balanceText(value: number): string {
  return formatMoney(value, { decimals: 'auto', symbol: false });
}

export function ledgerRow(entry: LedgerEntryResponse): LedgerRow {
  const type = toEntryType(entry.direction, entry.kind);
  const date = formatDate(entry.entryDate, 'list');
  const out = entry.direction === 'lent';
  const tx = entry.transaction;
  const sub = [
    date,
    `${entryWord(entry.direction, entry.kind)} ${formatMoney(entry.amount, { decimals: 'auto' })}`,
    tx ? tx.description || tx.accountName || null : null,
    entry.expectedReturnDate && !isSettlementType(type) ? `expected ${formatDate(entry.expectedReturnDate, 'list')}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    id: entry.id,
    entry,
    date,
    title: entry.notes?.trim() || ENTRY_TYPE_SHORT[type],
    linked: Boolean(entry.transaction),
    settled: Math.abs(entry.runningBalance) < 0.005,
    lent: out ? formatMoney(entry.amount, { decimals: 'auto', symbol: false }) : null,
    received: out ? null : formatMoney(entry.amount, { decimals: 'auto', symbol: false, sign: 'always' }),
    balance: balanceText(entry.runningBalance),
    sub,
  };
}

export const ledgerRows = (entries: readonly LedgerEntryResponse[]): LedgerRow[] => entries.map(ledgerRow);

/** "Opening ₹0 · lent ₹26,800 · received ₹11,800 · closing ₹15,000" */
export function totalsLine(totals: { lent: number; received: number; closing: number }): string {
  return [
    'Opening ₹0',
    `lent ${formatMoney(totals.lent, { decimals: 'auto' })}`,
    `received ${formatMoney(totals.received, { decimals: 'auto' })}`,
    `closing ${formatMoney(totals.closing, { decimals: 'auto' })}`,
  ].join(' · ');
}

/** "2 of 3 entries" */
export function linkedLine(entryCount: number, linkedEntryCount: number): string {
  return `${linkedEntryCount} of ${formatCount(entryCount, ['entry', 'entries'])}`;
}

/** "Delete this repayment entry of ₹10,000?" copy for the delete confirm. */
export function deleteEntryCopy(entry: LedgerEntryResponse): { description: string; impact: string[] } {
  const type = toEntryType(entry.direction, entry.kind);
  const noun = isSettlementType(type) ? 'repayment' : entry.direction;
  return {
    description: `This ${noun} entry of ${formatMoney(entry.amount, { decimals: 'auto' })} goes.`,
    impact: [
      'The entry leaves the ledger and the balance is worked out again.',
      ...(entry.transaction ? ['The bank transaction stays; only its link to this entry goes.'] : []),
    ],
  };
}

/** The "Since" row: "May 2026" (month and year of the first entry), or null. */
export function sinceText(firstEntryDate: string | null): string | null {
  if (!firstEntryDate) return null;
  return formatDate(firstEntryDate, 'month');
}

/** "Delete Rahul Sharma?" copy: what goes (the whole ledger) and what stays. */
export function deletePersonCopy(cp: CounterpartyResponse): { description: string; impact: string[] } {
  return {
    description: `${cp.name} goes.`,
    impact: [
      `Their whole ledger goes (${formatCount(cp.entryCount, ['entry', 'entries'])}).`,
      'Bank transactions stay; only their links to these entries go.',
    ],
  };
}

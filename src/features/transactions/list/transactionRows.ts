import type { TransactionLink, TransactionRowData } from '@/components/organisms';
import { formatAmount, formatDayMonth } from '@/features/accounts/list/accountsList';
import type { Account } from '@/lib/account.types';
import type { ReviewReason, Transaction, TransactionSource } from '@/lib/transaction.types';

/** A transaction as the list draws it: the strings and flags `TransactionRow` and the table columns take. */
export interface TransactionListRow extends TransactionRowData {
  /** The calendar day, YYYY-MM-DD: month bands and day headers group on it. */
  day: string;
  /** "12 Oct". */
  date: string;
  /** "Mon". */
  weekday: string;
  formattedAmount: string;
  isCredit: boolean;
  /** The account's name. */
  account?: string;
  /** The account's bank id; none for cash, wallets and accounts with no bank set. */
  bankId?: string;
  /** "••7741", or "Meera · ••7742" on a card that is not yours. */
  plastic?: string;
  /** "₹2,95,030"; none on an excluded row. */
  balance?: string;
  /** Every category name, in order; empty on an excluded row (it shows no category). */
  categories: string[];
  /** The first category, for the table's Category column. */
  category?: string;
  /** Amber words: review reasons and Watching. */
  reviewStatus?: string;
  /** Blue words: links and records. */
  link?: TransactionLink;
  /** Grey words: Excluded, and where it came from. */
  provenance?: string;
  watching: boolean;
  excluded: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** The amber word for each review reason, as the row board writes them. */
export const REASON_WORDS: Record<ReviewReason, string> = {
  UNRECONCILED: 'Unreconciled',
  CATEGORY_UNVERIFIED: 'Category unverified',
  DUPLICATE_SUSPECT: 'Duplicate',
  DATE_CORRECTED: 'Date corrected',
};

const SOURCE_WORDS: Partial<Record<TransactionSource, string>> = {
  gmail_transaction_alert: 'Gmail',
  gmail_statement: 'Statement',
  manual: 'Manual',
};

/** "Mon" for a calendar day. */
export function weekdayOf(day: string): string {
  const d = new Date(`${day.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? '' : WEEKDAYS[d.getUTCDay()];
}

/** "October 2026" for a calendar day. */
export function monthLabel(day: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(day);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : '';
}

/** The amber words: each review reason (or "Needs review" when there is none), then Watching with its reason. */
export function reviewWords(t: Transaction): string | undefined {
  const words: string[] = [];
  if (t.reviewType === 'NEEDS_REVIEW') {
    if (t.reviewReasons && t.reviewReasons.length > 0) words.push(...t.reviewReasons.map((r) => REASON_WORDS[r] ?? r));
    else words.push('Needs review');
  }
  if (t.isTransactionUnderMonitoring) {
    const reason = t.monitoringReason?.trim();
    words.push(reason ? `Watching: ${reason}` : 'Watching');
  }
  return words.length > 0 ? words.join(' · ') : undefined;
}

/**
 * The blue words. Links say their role ("Transfer out", "Purchase (EMI) (4)" with the group size when it is
 * more than a pair); records say what they are ("EMI #8 · HDFC car loan"). A row with only records shows no
 * chain glyph; a row with a link shows it.
 */
export function linkWords(t: Transaction): TransactionLink | undefined {
  const links = (t.links ?? []).map((l) => (l.memberCount > 2 ? `${l.roleLabel} (${l.memberCount})` : l.roleLabel));
  const records = (t.obligationRefs ?? []).map((r) => r.label);
  const words = [...links, ...records];
  if (words.length === 0) return undefined;
  return { label: words.join(', '), isRecord: links.length === 0 };
}

function plasticOf(t: Transaction): string | undefined {
  if (!(t.cardLabel || t.cardLast4) || t.cardLabel === 'You') return undefined;
  return [t.cardLabel, t.cardLast4 ? `••${t.cardLast4}` : null].filter(Boolean).join(' · ');
}

export interface RowContext {
  accounts: readonly Account[] | null;
  /** Show where each transaction came from (the Needs review view). */
  showSource: boolean;
}

function bankIdOf(accounts: RowContext['accounts'], accountId: string): string | undefined {
  const a = accounts?.find((x) => x.id === accountId);
  return a && 'bank' in a && a.bank ? a.bank : undefined;
}

export function transactionRow(t: Transaction, ctx: RowContext): TransactionListRow {
  const excluded = Boolean(t.isTransactionExcluded);
  const credit = t.amount > 0;
  const amount = formatAmount(Math.abs(t.amount), 2);
  const categories = excluded ? [] : (t.categories ?? []).map((c) => c.name);
  const source = ctx.showSource ? SOURCE_WORDS[t.source] : undefined;
  const provenance = [excluded ? 'Excluded' : undefined, source].filter(Boolean).join(' · ');
  return {
    id: t.id,
    day: t.date.slice(0, 10),
    date: formatDayMonth(t.date),
    weekday: weekdayOf(t.date),
    description: t.description || t.sourcedDescription || '—',
    amount: t.amount,
    formattedAmount: credit ? `+${amount}` : amount,
    isCredit: credit,
    account: ctx.accounts ? (ctx.accounts.find((a) => a.id === t.accountId)?.name ?? 'Unknown') : undefined,
    bankId: bankIdOf(ctx.accounts, t.accountId),
    plastic: plasticOf(t),
    balance: t.balance != null && !excluded ? `${t.balance < 0 ? '-' : ''}₹${formatAmount(Math.abs(t.balance), 0)}` : undefined,
    categories,
    category: categories[0],
    reviewStatus: reviewWords(t),
    link: linkWords(t),
    provenance: provenance || undefined,
    watching: Boolean(t.isTransactionUnderMonitoring),
    excluded,
  };
}

export function transactionRows(items: readonly Transaction[], ctx: RowContext): TransactionListRow[] {
  return items.map((t) => transactionRow(t, ctx));
}

/** The month band a row falls under, or null when the list is not in date order (a sort by amount). */
export function monthBand(row: TransactionListRow, byDate: boolean): { key: string; label: string } | null {
  return byDate ? { key: row.day.slice(0, 7), label: monthLabel(row.day) } : null;
}

/** The phone day header a row falls under: "12 Oct" and "Mon"; null when the list is not in date order. */
export function dayHeader(
  row: TransactionListRow,
  byDate: boolean,
): { key: string; label: string; sublabel: string } | null {
  return byDate ? { key: row.day, label: row.date, sublabel: row.weekday } : null;
}

import { mergeSourceLabel } from '@/features/transactions/bulk/mergeModel';
import type { DuplicateReviewItem, DuplicateReviewTransaction } from '@/lib/api/types';
import { formatDate, formatMoney } from '@/lib/format';

/** One side of a pair, as the words the dialog draws. */
export interface DuplicateSideLine {
  date: string;
  amount: string;
  description: string;
  account: string;
  source: string;
}

/** The dialog's line for one transaction: date, amount, full description, account and where it came from. */
export function duplicateSideLine(t: DuplicateReviewTransaction): DuplicateSideLine {
  return {
    date: formatDate(t.date, 'list'),
    amount: t.amount == null ? '—' : formatMoney(t.amount, { decimals: 'auto' }),
    description: t.description?.trim() || '(no description)',
    account: t.accountName?.trim() || 'No account',
    source: t.source ? mergeSourceLabel(t.source) : 'Unknown source',
  };
}

/** "Date · amount · account · source": the detail line under a transaction's description. */
export function duplicateSideDetail(t: DuplicateReviewTransaction): string {
  const l = duplicateSideLine(t);
  return [l.date, l.amount, l.account, l.source].join(' · ');
}

/** The text shown for a pair with nothing to compare against. */
export const NO_TWIN_TEXT = 'No matching transaction found';

/** The pairs of the transactions being approved, in the server's order (the endpoint lists every flagged one). */
export function pairsForSelection(items: readonly DuplicateReviewItem[], ids: ReadonlySet<string>): DuplicateReviewItem[] {
  return items.filter((i) => ids.has(i.transaction.id));
}

/** Whether the pairs of every transaction being approved have been found, so no further page is needed. */
export function allPairsFound(found: number, expected: number): boolean {
  return found >= expected;
}

/** The heading over the list: how many of the approved transactions are possible duplicates. */
export function duplicatesHeading(count: number): string {
  return count === 1 ? 'Possible duplicate' : `${count} possible duplicates`;
}

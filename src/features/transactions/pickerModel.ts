import { formatAmount, formatDayMonth } from '@/features/accounts/list/accountsList';

/** What the picker needs of a transaction: both a full `Transaction` and a lending's transaction summary fit. */
export interface PickerSummaryLike {
  id: string;
  description?: string | null;
  sourcedDescription?: string | null;
  date: string;
  accountId: string;
  accountName?: string | null;
  signedAmount?: number;
  amount?: number;
}

/** "₹2,300", "₹2,300.50": whole figures bare, paise only when there are some. */
function rupeesOf(value: number): string {
  const abs = Math.abs(value);
  return `₹${formatAmount(abs, Number.isInteger(abs) ? 0 : 2)}`;
}

/** The amount of a summary, signed (a debit is negative). */
export function summaryAmount(tx: PickerSummaryLike): number {
  return tx.signedAmount ?? tx.amount ?? 0;
}

/** "13 Sep · HDFC Savings · IMPS from X · ₹2,300": the picker's one-line row. */
export function pickerRowLabel(tx: PickerSummaryLike, accountName: string): string {
  const text = tx.description || tx.sourcedDescription || 'Transaction';
  return [formatDayMonth(tx.date), accountName, text, rupeesOf(summaryAmount(tx))].join(' · ');
}

/** The "also linked to n ledger entries" note a shareable row carries, or null. */
export function sharedNote(
  refCount: number,
  shareableKind: 'LENDING' | 'DIVIDEND',
  excludeAnyObligationRef: boolean,
): string | null {
  if (excludeAnyObligationRef || refCount <= 0) return null;
  return shareableKind === 'DIVIDEND'
    ? `also linked to ${refCount} dividend${refCount === 1 ? '' : 's'}`
    : `also linked to ${refCount} ledger entr${refCount === 1 ? 'y' : 'ies'}`;
}

/** The hint under an empty result list: the caller's rule, else the direction's. */
export function pickerEmptyHint(ruleHint: string | undefined, direction?: 'lent' | 'borrowed'): string {
  if (ruleHint !== undefined) return ruleHint;
  if (direction === 'lent') return 'Lent entries link money-out (debit) transactions.';
  if (direction === 'borrowed') return 'Borrowed entries link money-in (credit) transactions.';
  return '';
}

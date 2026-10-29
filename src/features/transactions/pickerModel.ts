import { formatCount, formatDate, formatMoney } from '@/lib/format';

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
  return formatMoney(Math.abs(value), { decimals: 'exact' });
}

/** The amount of a summary, signed (a debit is negative). */
export function summaryAmount(tx: PickerSummaryLike): number {
  return tx.signedAmount ?? tx.amount ?? 0;
}

/** The "also linked to n ledger entries" note a shareable row carries, or null. */
export function sharedNote(
  refCount: number,
  shareableKind: 'LENDING' | 'DIVIDEND',
  excludeAnyObligationRef: boolean,
): string | null {
  if (excludeAnyObligationRef || refCount <= 0) return null;
  return shareableKind === 'DIVIDEND'
    ? `also linked to ${formatCount(refCount, ['dividend', 'dividends'])}`
    : `also linked to ${formatCount(refCount, ['ledger entry', 'ledger entries'])}`;
}

/** The hint under an empty result list: the caller's rule, else the direction's. */
export function pickerEmptyHint(ruleHint: string | undefined, direction?: 'lent' | 'borrowed'): string {
  if (ruleHint !== undefined) return ruleHint;
  if (direction === 'lent') return 'Lent entries link money-out (debit) transactions.';
  if (direction === 'borrowed') return 'Borrowed entries link money-in (credit) transactions.';
  return '';
}

/** One row of the open list: title = description, subtitle = "13 Sep · HDFC Savings ••1234" (+ the shared note). */
export function pickerListItem(
  tx: PickerSummaryLike,
  account: { name: string; last4?: string | null },
  note?: string | null,
): { id: string; title: string; subtitle: string; amount: string; isCredit: boolean } {
  const signed = summaryAmount(tx);
  const where = account.last4 ? `${account.name} ••${account.last4}` : account.name;
  return {
    id: tx.id,
    title: tx.description || tx.sourcedDescription || 'Transaction',
    subtitle: [formatDate(tx.date, 'list'), where, note].filter(Boolean).join(' · '),
    amount: rupeesOf(signed),
    isCredit: signed > 0,
  };
}

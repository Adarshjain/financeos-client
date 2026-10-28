import { deleteImpact } from '@/features/transactions/detail/transactionDetail';
import { REASON_WORDS } from '@/features/transactions/list/transactionRows';
import { formatMoney } from '@/lib/format';
import type { ReviewReason, Transaction } from '@/lib/transaction.types';

type Reviewable = Pick<Transaction, 'reviewType' | 'reviewReasons'>;

/** The reasons an approve can clear. */
function clearableReasons(t: Reviewable): ReviewReason[] {
  return t.reviewReasons ?? [];
}

/** A row Approve works on: it needs review and carries a reason to clear. Needs review with no reason has nothing to clear. */
export function isApprovable(t: Reviewable): boolean {
  return t.reviewType === 'NEEDS_REVIEW' && clearableReasons(t).length > 0;
}

/** "₹5,382 · 2 need review": the size of the selection (money in and out added up) and how much of it needs review. */
export function selectionSummary(selected: Pick<Transaction, 'amount' | 'reviewType' | 'reviewReasons'>[]): string {
  const total = selected.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const flagged = selected.filter(isApprovable).length;
  const money = formatMoney(total);
  return flagged > 0 ? `${money} · ${flagged} need review` : money;
}

/** The Merge hint: the pair when two are picked, "pick 2" otherwise (it is disabled then). */
export function mergeHint(count: number): string {
  return count === 2 ? 'the pair' : 'pick 2';
}

/** The Approve hint: "clear Duplicate" when every flagged row carries the same one reason, else how many are flagged. */
export function approveHint(selected: Reviewable[]): string {
  const flagged = selected.filter(isApprovable);
  if (flagged.length === 0) return 'none flagged';
  const sets = new Set(flagged.map((t) => clearableReasons(t).join('|')));
  if (sets.size === 1) {
    const reasons = clearableReasons(flagged[0]);
    if (reasons.length === 1) return `clear ${REASON_WORDS[reasons[0]]}`;
  }
  return `${flagged.length} flagged`;
}

/** The toast after a merge: resolved, or what the kept transaction still needs review for. */
export function mergedMessage(remainingReasonLabels: string[]): string {
  return remainingReasonLabels.length > 0
    ? `Transactions merged. The kept transaction still needs review: ${remainingReasonLabels.join(', ')}`
    : 'Transactions merged and resolved';
}

export function deletedMessage(count: number): string {
  return count === 1 ? 'Transaction deleted' : `Deleted ${count} transactions`;
}

export interface DeleteCopy {
  title: string;
  impact: string[];
  confirmLabel: string;
}

/** What the delete confirm says goes and what stays, for one transaction or several. */
export function deleteCopy(
  transactions: Pick<Transaction, 'amount' | 'description' | 'sourcedDescription' | 'source' | 'obligationRefs'>[],
): DeleteCopy {
  if (transactions.length === 1) {
    const [t] = transactions;
    const name = t.description || t.sourcedDescription || '—';
    return {
      title: `Delete ${name} · ${formatMoney(Math.abs(t.amount), { decimals: 'auto' })}?`,
      impact: deleteImpact(t as Transaction),
      confirmLabel: 'Delete transaction',
    };
  }
  const n = transactions.length;
  const impact = [`${n} transactions are deleted for good. This cannot be undone.`];
  const records = transactions.reduce((sum, t) => sum + (t.obligationRefs?.length ?? 0), 0);
  if (records > 0) {
    impact.push(
      `${records} linked ${records === 1 ? 'record stays' : 'records stay'} but ${records === 1 ? 'loses' : 'lose'} the link.`,
    );
  }
  const imported = transactions.filter((t) => t.source !== 'manual').length;
  if (imported > 0) {
    impact.push(`${imported} ${imported === 1 ? 'is' : 'are'} not manually created. It is discouraged to delete these.`);
  }
  return { title: `Delete ${n} transactions?`, impact, confirmLabel: `Delete ${n} transactions` };
}

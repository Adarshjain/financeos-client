import { batchFailureLabel } from '@/features/transactions/catalog';
import { formatCount } from '@/lib/format';
import type { ReviewReason, Transaction } from '@/lib/transaction.types';

/** The reasons `batch-review` can clear or re-add. */
export type ClearableReason = ReviewReason;

/** The approve dialog's rows, in board order, with the words the board draws. */
export const APPROVE_REASONS: { reason: ClearableReason; label: string; hint: string }[] = [
  { reason: 'CATEGORY_UNVERIFIED', label: 'Category unverified', hint: 'keep the category as set' },
  { reason: 'UNRECONCILED', label: 'Unreconciled', hint: 'no statement match needed' },
  { reason: 'DUPLICATE_SUSPECT', label: 'Duplicate', hint: 'keep both' },
  { reason: 'DATE_CORRECTED', label: 'Date corrected', hint: 'accept the statement date' },
];

type Described = Pick<Transaction, 'id' | 'description' | 'sourcedDescription'>;

/** The distinct reasons carried by the selected transactions of a loaded page. */
export function getPresentReasons(
  pagedData: { content: { id: string; reviewReasons?: ReviewReason[] }[] } | null,
  selectedIds: string[],
): ReviewReason[] {
  const txns = pagedData?.content.filter((t) => selectedIds.includes(t.id)) || [];
  return Array.from(new Set(txns.flatMap((t) => t.reviewReasons || [])));
}

/** How many of the transactions carry each approvable reason, in board order. */
export function countReasons(txns: { reviewReasons?: ReviewReason[] }[]) {
  return APPROVE_REASONS.map((r) => ({
    ...r,
    count: txns.filter((t) => t.reviewReasons?.includes(r.reason)).length,
  }));
}

/** Shapes a batch response's failed ids into the descriptions the summary dialog shows. */
export function mapBatchFailures(
  failures: { id: string; reason?: string }[] | undefined,
  txns: { content: Described[] } | null,
): { description: string; reason: string }[] {
  return (failures || []).map((f) => {
    const txn = txns?.content.find((t) => t.id === f.id);
    const desc = txn ? txn.description || txn.sourcedDescription : `Transaction ID: ${f.id}`;
    return { description: desc || '', reason: batchFailureLabel(f.reason || '') };
  });
}

export function mapBatchSkips(skippedIds: string[] | undefined, txns: { content: Described[] } | null): string[] {
  return (skippedIds || []).map((id) => {
    const txn = txns?.content.find((t) => t.id === id);
    return txn ? txn.description || txn.sourcedDescription || '' : `Transaction ID: ${id}`;
  });
}

export function approveTitle(count: number): string {
  return `Approve ${formatCount(count, ['transaction', 'transactions'])}`;
}

export function approvedMessage(count: number): string {
  return count === 1 ? 'Approved' : `Approved ${count} transactions`;
}

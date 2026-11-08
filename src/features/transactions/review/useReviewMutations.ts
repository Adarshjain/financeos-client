'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { showToast } from '@/components/ds/Toast/Toast';
import { batchReviewTransactions, undoApproveTransactions } from '@/features/transactions/transactionActions';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { components } from '@/lib/api/schema';
import { keys } from '@/lib/query/keys';
import { useAppRouter } from '@/lib/useAppRouter';

import type { ClearableReason } from './reviewModel';

export interface BatchReviewInput {
  ids: string[];
  /** MANUALLY_REVIEWED clears the reasons; NEEDS_REVIEW puts them back (Undo). */
  reviewType: 'MANUALLY_REVIEWED' | 'NEEDS_REVIEW';
  reasons: ClearableReason[];
}

/**
 * `POST /transactions/batch-review`, then refresh everything that shows review state: the lists, the Needs
 * review count and the server-rendered page. Callers decide what to tell the person.
 */
export function useBatchReview() {
  const qc = useQueryClient();
  const router = useAppRouter();
  return useMutation({
    mutationFn: ({ ids, reviewType, reasons }: BatchReviewInput) =>
      unwrapAction(batchReviewTransactions({ transactionIds: ids, reviewType, reviewReasons: reasons })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.transactions.all });
      qc.invalidateQueries({ queryKey: keys.transactions.needsReviewCount() });
      router.refresh();
    },
  });
}

export type ClearedTransaction = components['schemas']['ClearedTransaction'];

/**
 * The Undo behind every "Approved" Toast: sends back what the approve cleared in one all-or-nothing request, then
 * refreshes lists, the Needs review count and the page. Rows edited since are skipped by the server.
 */
export function useUndoApprove() {
  const qc = useQueryClient();
  const router = useAppRouter();

  const mutation = useMutation({
    mutationFn: ({ approved }: { approved: ClearedTransaction[] }) => unwrapAction(undoApproveTransactions({ approved })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.transactions.all });
      qc.invalidateQueries({ queryKey: keys.transactions.needsReviewCount() });
      router.refresh();
    },
    onError: (e) => showToast(getErrorMessage(e, "Couldn't undo. Try again."), { tone: 'danger' }),
  });

  return (approved: ClearedTransaction[]) => mutation.mutate({ approved });
}

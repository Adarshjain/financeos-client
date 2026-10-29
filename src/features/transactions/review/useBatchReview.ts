'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { batchReviewTransactions } from '@/features/transactions/transactionActions';
import { unwrapAction } from '@/lib/actionResult';
import { keys } from '@/lib/query/keys';

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
  const router = useRouter();
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

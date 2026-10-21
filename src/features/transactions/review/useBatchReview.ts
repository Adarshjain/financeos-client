'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';

import type { ClearableReason } from './reviewHelpers';

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
    mutationFn: async ({ ids, reviewType, reasons }: BatchReviewInput) => {
      const { data } = await api.POST('/api/v1/transactions/batch-review', {
        body: { transactionIds: ids, reviewType, reviewReasons: reasons },
      });
      if (!data) throw new Error('No response from the server');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.transactions.all });
      qc.invalidateQueries({ queryKey: keys.transactions.needsReviewCount() });
      router.refresh();
    },
  });
}

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { showToast } from '@/components/ds';
import { reviewReasonLabel } from '@/features/transactions/catalog';
import { api } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { invalidateMoneyQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import type { MergeTransactionsResponse } from '@/lib/transaction.types';

import { mergedMessage } from './bulkModel';

/**
 * `POST /transactions/merge`: the kept transaction takes what it lacks from the other, which is deleted.
 * Says what happened in a Toast, refreshes everything that shows transactions, then calls `onMerged`.
 */
export function useMergeTransactions(onMerged: () => void) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async ({ keepId, deleteId }: { keepId: string; deleteId: string }): Promise<MergeTransactionsResponse> => {
      const { data } = await api.POST('/api/v1/transactions/merge', { body: { keepId, deleteId } });
      if (!data) throw new Error('No response from the server');
      return data as MergeTransactionsResponse;
    },
    onSuccess: (data) => {
      showToast(mergedMessage((data.remainingReasons ?? []).map(reviewReasonLabel)), { tone: 'success' });
      void queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      void invalidateMoneyQueries(queryClient);
      router.refresh();
      onMerged();
    },
    onError: (e) => showToast(getErrorMessage(e, 'Could not merge these transactions'), { tone: 'danger' }),
  });
}

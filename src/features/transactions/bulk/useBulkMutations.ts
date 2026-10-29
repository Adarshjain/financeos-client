'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { showToast } from '@/components/ds';
import { reviewReasonLabel } from '@/features/transactions/catalog';
import { mapBatchFailures } from '@/features/transactions/review/reviewModel';
import type { ReviewSummary } from '@/features/transactions/review/useApproveTransactions';
import { batchDeleteTransactions, mergeTransactions } from '@/features/transactions/transactionActions';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { invalidateMoneyQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import type { MergeTransactionsResponse,Transaction } from '@/lib/transaction.types';

import { removeChange } from '../optimistic/optimisticModel';
import { useOptimisticTransactions } from '../optimistic/OptimisticTransactions';
import { deletedMessage, mergedMessage } from './bulkModel';

type Deleted = Pick<Transaction, 'id' | 'description' | 'sourcedDescription'>;

/**
 * `POST /transactions/batch-delete` for the selection or for one swiped row. A clean run says so in a
 * Toast; any failure opens the summary instead (`summary`, `closeSummary` feed `ReviewSummaryDialog`).
 * `remove` resolves true when the request went through.
 */
export function useDeleteTransactions() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const optimistic = useOptimisticTransactions();
  const [summary, setSummary] = useState<ReviewSummary | null>(null);

  const mutation = useMutation({
    mutationFn: (ids: string[]) => unwrapAction(batchDeleteTransactions(ids)),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      void queryClient.invalidateQueries({ queryKey: keys.transactions.needsReviewCount() });
      void invalidateMoneyQueries(queryClient);
      router.refresh();
    },
  });

  /** `instant` (one swiped row, not the bulk bar): the rows leave the list now and come back if the delete fails. */
  const remove = async (transactions: Deleted[], instant = false): Promise<boolean> => {
    const shown = instant ? optimistic?.begin(removeChange(transactions.map((t) => t.id))) : undefined;
    try {
      const send = () => mutation.mutateAsync(transactions.map((t) => t.id));
      const data = await (shown ? shown.send(send) : send());
      shown?.settle(data.failures.length === 0);
      const failures = mapBatchFailures(data.failures, { content: transactions });
      if (failures.length > 0) {
        setSummary({ succeededCount: data.succeededIds.length, skippedCount: 0, failures, skips: [] });
      } else {
        showToast(deletedMessage(data.succeededIds.length), { tone: 'success' });
      }
      return true;
    } catch (e) {
      shown?.settle(false);
      showToast(getErrorMessage(e, "Couldn't delete the transactions. Try again."), { tone: 'danger' });
      return false;
    }
  };

  return { remove, isPending: mutation.isPending, summary, closeSummary: () => setSummary(null) };
}

/**
 * `POST /transactions/merge`: the kept transaction takes what it lacks from the other, which is deleted.
 * Says what happened in a Toast, refreshes everything that shows transactions, then calls `onMerged`.
 */
export function useMergeTransactions(onMerged: () => void) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: ({ keepId, deleteId }: { keepId: string; deleteId: string }): Promise<MergeTransactionsResponse> =>
      unwrapAction(mergeTransactions(keepId, deleteId)),
    onSuccess: (data) => {
      showToast(mergedMessage((data.remainingReasons ?? []).map(reviewReasonLabel)), { tone: 'success' });
      void queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      void invalidateMoneyQueries(queryClient);
      router.refresh();
      onMerged();
    },
    onError: (e) => showToast(getErrorMessage(e, "Couldn't merge these transactions. Try again."), { tone: 'danger' }),
  });
}

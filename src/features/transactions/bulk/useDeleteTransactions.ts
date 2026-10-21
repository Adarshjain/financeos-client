'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { showToast } from '@/components/ds';
import { mapBatchFailures } from '@/features/transactions/review/reviewHelpers';
import type { ReviewSummary } from '@/features/transactions/review/useApproveTransactions';
import { api } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { invalidateMoneyQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import type { Transaction } from '@/lib/transaction.types';

import { deletedMessage } from './bulkModel';

type Deleted = Pick<Transaction, 'id' | 'description' | 'sourcedDescription'>;

/**
 * `POST /transactions/batch-delete` for the selection or for one swiped row. A clean run says so in a
 * Toast; any failure opens the summary instead (`summary`, `closeSummary` feed `ReviewSummaryDialog`).
 * `remove` resolves true when the request went through.
 */
export function useDeleteTransactions() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [summary, setSummary] = useState<ReviewSummary | null>(null);

  const mutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data } = await api.POST('/api/v1/transactions/batch-delete', { body: { transactionIds: ids } });
      if (!data) throw new Error('No response from the server');
      return data;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      void queryClient.invalidateQueries({ queryKey: keys.transactions.needsReviewCount() });
      void invalidateMoneyQueries(queryClient);
      router.refresh();
    },
  });

  const remove = async (transactions: Deleted[]): Promise<boolean> => {
    try {
      const data = await mutation.mutateAsync(transactions.map((t) => t.id));
      const failures = mapBatchFailures(data.failures, { content: transactions });
      if (failures.length > 0) {
        setSummary({ succeededCount: data.succeededIds.length, skippedCount: 0, failures, skips: [] });
      } else {
        showToast(deletedMessage(data.succeededIds.length), { tone: 'success' });
      }
      return true;
    } catch (e) {
      showToast(getErrorMessage(e, 'Could not delete'), { tone: 'danger' });
      return false;
    }
  };

  return { remove, isPending: mutation.isPending, summary, closeSummary: () => setSummary(null) };
}

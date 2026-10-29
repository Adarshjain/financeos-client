'use client';

import { useState } from 'react';

import { showToast } from '@/components/ds';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { Transaction } from '@/lib/transaction.types';

import { approveChange } from '../optimistic/optimisticModel';
import { useOptimisticTransactions } from '../optimistic/OptimisticTransactions';
import { approvedMessage, type ClearableReason, mapBatchFailures, mapBatchSkips } from './reviewHelpers';
import { useBatchReview } from './useBatchReview';
import { useUndoApprove } from './useUndoApprove';

export type ReviewTxn = Pick<Transaction, 'id' | 'reviewReasons' | 'description' | 'sourcedDescription'>;

export interface ReviewSummary {
  succeededCount: number;
  skippedCount: number;
  failures: { description: string; reason: string }[];
  skips: string[];
}

/**
 * Approves a set of transactions for the ticked reasons. A clean run says so in a Toast; anything skipped
 * (no ticked reason on that row) or failed opens the summary instead. `summary` and `closeSummary` feed
 * `ReviewSummaryDialog`. `approve` resolves true when the request went through.
 */
export function useApproveTransactions() {
  const batch = useBatchReview();
  const undo = useUndoApprove();
  const optimistic = useOptimisticTransactions();
  const [summary, setSummary] = useState<ReviewSummary | null>(null);

  /** `instant` (one row, not the bulk bar): the rows clear on screen now and come back if the approve fails. */
  const approve = async (transactions: ReviewTxn[], reasons: ClearableReason[], instant = false): Promise<boolean> => {
    const shown = instant ? optimistic?.begin(approveChange(transactions.map((t) => t.id), reasons)) : undefined;
    try {
      const send = () =>
        batch.mutateAsync({ ids: transactions.map((t) => t.id), reviewType: 'MANUALLY_REVIEWED', reasons });
      const data = await (shown ? shown.send(send) : send());
      shown?.settle(data.failures.length === 0 && data.skippedIds.length === 0);
      const content = { content: transactions };
      const failures = mapBatchFailures(data.failures, content);
      const skips = mapBatchSkips(data.skippedIds, content);
      if (failures.length > 0 || skips.length > 0) {
        setSummary({
          succeededCount: data.succeededIds.length,
          skippedCount: data.skippedIds.length,
          failures,
          skips,
        });
      } else {
        showToast(approvedMessage(data.succeededIds.length), {
          tone: 'success',
          action: { label: 'Undo', onSelect: () => void undo(data.approvedTransactions ?? [], data.verifiedRules ?? []) },
        });
      }
      return true;
    } catch (e) {
      shown?.settle(false);
      showToast(getErrorMessage(e, "Couldn't approve. Try again."), { tone: 'danger' });
      return false;
    }
  };

  return { approve, isPending: batch.isPending, summary, closeSummary: () => setSummary(null) };
}

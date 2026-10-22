'use client';

import { useState } from 'react';

import { showToast } from '@/components/ds';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { Transaction } from '@/lib/transaction.types';

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
  const [summary, setSummary] = useState<ReviewSummary | null>(null);

  const approve = async (transactions: ReviewTxn[], reasons: ClearableReason[]): Promise<boolean> => {
    try {
      const data = await batch.mutateAsync({
        ids: transactions.map((t) => t.id),
        reviewType: 'MANUALLY_REVIEWED',
        reasons,
      });
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
        // Each row gets back the ticked reasons it carried, as quick approve does.
        const restores = new Map<string, { ids: string[]; reasons: ClearableReason[] }>();
        for (const t of transactions.filter((x) => data.succeededIds.includes(x.id))) {
          const cleared = (t.reviewReasons ?? []).filter((r) => reasons.includes(r));
          if (cleared.length === 0) continue;
          const key = [...cleared].sort().join(',');
          const group = restores.get(key) ?? { ids: [], reasons: cleared };
          group.ids.push(t.id);
          restores.set(key, group);
        }
        showToast(approvedMessage(data.succeededIds.length), {
          tone: 'success',
          action: { label: 'Undo', onSelect: () => void undo([...restores.values()], data.verifiedRules ?? []) },
        });
      }
      return true;
    } catch (e) {
      showToast(getErrorMessage(e, 'Could not approve'), { tone: 'danger' });
      return false;
    }
  };

  return { approve, isPending: batch.isPending, summary, closeSummary: () => setSummary(null) };
}

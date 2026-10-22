'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { showToast } from '@/components/ds';
import { api } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { keys } from '@/lib/query/keys';

import type { ClearableReason } from './reviewHelpers';
import { useBatchReview } from './useBatchReview';

export type VerifiedRule = { ruleId: string; clearedTransactionIds: string[] };

/** Rows an approve cleared, grouped by the reasons it cleared on them. */
export type ApproveRestore = { ids: string[]; reasons: ClearableReason[] };

/**
 * The Undo behind every "Approved" Toast: puts each row's cleared reasons back (NEEDS_REVIEW), then
 * unverifies the rules the approve verified and refreshes rules, lists, the Needs review count and the page.
 */
export function useUndoApprove() {
  const batch = useBatchReview();
  const qc = useQueryClient();
  const router = useRouter();

  return async (restores: ApproveRestore[], verifiedRules: VerifiedRule[]) => {
    try {
      for (const { ids, reasons } of restores) {
        await batch.mutateAsync({ ids, reviewType: 'NEEDS_REVIEW', reasons });
      }
      if (verifiedRules.length > 0) {
        // The approve verified these rules and cleared other rows' flags; roll that back too.
        await Promise.all(
          verifiedRules.map(async (rule) => {
            const { data, error } = await api.POST('/api/v1/rules/{id}/unverify', {
              params: { path: { id: rule.ruleId } },
              body: { transactionIds: rule.clearedTransactionIds },
            });
            if (error || !data) throw error ?? new Error('Could not undo');
          }),
        );
        qc.invalidateQueries({ queryKey: keys.rules.all });
        qc.invalidateQueries({ queryKey: keys.transactions.all });
        qc.invalidateQueries({ queryKey: keys.transactions.needsReviewCount() });
        router.refresh();
      }
    } catch (e) {
      showToast(getErrorMessage(e, 'Could not undo'), { tone: 'danger' });
    }
  };
}

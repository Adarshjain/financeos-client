'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { showToast } from '@/components/ds';
import { batchFailureLabel } from '@/features/transactions/catalog';
import { api } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { keys } from '@/lib/query/keys';
import type { Transaction } from '@/lib/transaction.types';

import { approvedMessage, type ClearableReason } from './reviewHelpers';
import { useBatchReview } from './useBatchReview';

type VerifiedRule = { ruleId: string; clearedTransactionIds: string[] };

export type QuickApproveOutcome = 'approved' | 'needs-dialog' | 'nothing-to-approve' | 'failed';

/**
 * The one-tap approve on a single row (Review button, phone swipe right). One reason clears at once and
 * the Toast offers Undo, which puts that reason back. Several reasons return `needs-dialog`: the caller
 * opens `ApproveDialog` for that row (owner 15). A row with no reason has nothing to approve, as in
 * Legacy (the Review button is not offered), so it returns `nothing-to-approve` and does nothing.
 */
export function useQuickApprove() {
  const batch = useBatchReview();
  const qc = useQueryClient();
  const router = useRouter();

  const undo = async (id: string, reason: ClearableReason, verifiedRules: VerifiedRule[]) => {
    try {
      await batch.mutateAsync({ ids: [id], reviewType: 'NEEDS_REVIEW', reasons: [reason] });
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

  const quickApprove = async (
    txn: Pick<Transaction, 'id' | 'reviewReasons'>,
  ): Promise<QuickApproveOutcome> => {
    const reasons: ClearableReason[] = txn.reviewReasons ?? [];
    if (reasons.length === 0) return 'nothing-to-approve';
    if (reasons.length > 1) return 'needs-dialog';
    const [reason] = reasons;
    try {
      const data = await batch.mutateAsync({ ids: [txn.id], reviewType: 'MANUALLY_REVIEWED', reasons });
      if (data.succeededIds.length === 0) {
        const failure = data.failures[0];
        showToast(failure ? batchFailureLabel(failure.reason ?? '') : 'Nothing to approve on this transaction', {
          tone: 'danger',
        });
        return 'failed';
      }
      showToast(approvedMessage(1), {
        tone: 'success',
        action: { label: 'Undo', onSelect: () => void undo(txn.id, reason, data.verifiedRules ?? []) },
      });
      return 'approved';
    } catch (e) {
      showToast(getErrorMessage(e, 'Could not approve'), { tone: 'danger' });
      return 'failed';
    }
  };

  return { quickApprove, isPending: batch.isPending };
}

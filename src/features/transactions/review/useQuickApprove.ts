'use client';

import { showToast } from '@/components/ds';
import { batchFailureLabel } from '@/features/transactions/catalog';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { Transaction } from '@/lib/transaction.types';

import { approvedMessage, type ClearableReason } from './reviewHelpers';
import { useBatchReview } from './useBatchReview';
import { useUndoApprove } from './useUndoApprove';

export type QuickApproveOutcome = 'approved' | 'needs-dialog' | 'nothing-to-approve' | 'failed';

/**
 * The one-tap approve on a single row (Review button, phone swipe right). One reason clears at once and
 * the Toast offers Undo, which puts that reason back. Several reasons return `needs-dialog`: the caller
 * opens `ApproveDialog` for that row (owner 15). A row with no reason has nothing to approve, as in
 * Legacy (the Review button is not offered), so it returns `nothing-to-approve` and does nothing.
 */
export function useQuickApprove() {
  const batch = useBatchReview();

  const undo = useUndoApprove();

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
        action: { label: 'Undo', onSelect: () => void undo([{ ids: [txn.id], reasons: [reason] }], data.verifiedRules ?? []) },
      });
      return 'approved';
    } catch (e) {
      showToast(getErrorMessage(e, 'Could not approve'), { tone: 'danger' });
      return 'failed';
    }
  };

  return { quickApprove, isPending: batch.isPending };
}

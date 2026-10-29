'use client';

import { showToast } from '@/components/ds';
import { batchFailureLabel } from '@/features/transactions/catalog';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { Transaction } from '@/lib/transaction.types';

import { approveChange } from '../optimistic/optimisticModel';
import { useOptimisticTransactions } from '../optimistic/OptimisticTransactions';
import { approvedMessage, type ClearableReason } from './reviewModel';
import { useBatchReview } from './useReviewMutations';
import { useUndoApprove } from './useReviewMutations';

export type QuickApproveOutcome = 'approved' | 'needs-dialog' | 'nothing-to-approve' | 'failed';

/**
 * The one-tap approve on a single row (Review button, phone swipe right). One reason clears at once (on screen before the server answers) and
 * the Toast offers Undo, which puts that reason back. Several reasons return `needs-dialog`: the caller
 * opens `ApproveDialog` for that row (owner 15). A row with no reason has nothing to approve, as in
 * Legacy (the Review button is not offered), so it returns `nothing-to-approve` and does nothing.
 */
export function useQuickApprove() {
  const batch = useBatchReview();
  const optimistic = useOptimisticTransactions();

  const undo = useUndoApprove();

  const quickApprove = async (
    txn: Pick<Transaction, 'id' | 'reviewReasons'>,
  ): Promise<QuickApproveOutcome> => {
    const reasons: ClearableReason[] = txn.reviewReasons ?? [];
    if (reasons.length === 0) return 'nothing-to-approve';
    if (reasons.length > 1) return 'needs-dialog';
    // The row clears on screen now; a failure puts it back.
    const shown = optimistic?.begin(approveChange([txn.id], reasons));
    try {
      const send = () => batch.mutateAsync({ ids: [txn.id], reviewType: 'MANUALLY_REVIEWED', reasons });
      const data = await (shown ? shown.send(send) : send());
      if (data.succeededIds.length === 0) {
        const failure = data.failures[0];
        shown?.settle(false);
        showToast(failure ? batchFailureLabel(failure.reason ?? '') : 'Nothing to approve on this transaction', {
          tone: 'danger',
        });
        return 'failed';
      }
      shown?.settle(true);
      showToast(approvedMessage(1), {
        tone: 'success',
        action: { label: 'Undo', onSelect: () => void undo(data.approvedTransactions ?? [], data.verifiedRules ?? []) },
      });
      return 'approved';
    } catch (e) {
      shown?.settle(false);
      showToast(getErrorMessage(e, "Couldn't approve. Try again."), { tone: 'danger' });
      return 'failed';
    }
  };

  return { quickApprove, isPending: batch.isPending };
}

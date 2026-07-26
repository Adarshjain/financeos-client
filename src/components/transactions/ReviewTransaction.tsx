'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { batchReviewTransactions } from '@/actions/transactions';
import { batchFailureLabel, reviewReasonLabel } from '@/components/transactions/catalog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ReviewReason, Transaction } from '@/lib/transaction.types';

interface ReviewTransactionProps {
  transaction: Transaction;
  /** Called after the transaction was successfully marked as reviewed. */
  onSuccess?: () => void;
}

/**
 * Single-transaction counterpart to the batch approve flow on
 * `/transactions/review`. Renders nothing unless the transaction actually needs
 * review, so callers can drop it in unconditionally.
 *
 * The backend never flags a transaction for review without at least one reason,
 * so there is nothing to approve when the list is empty. Rather than guess at
 * what a reason-less approval should clear, the action simply isn't offered —
 * data that violates the invariant can't produce a request whose meaning is
 * undefined.
 */
export const ReviewTransaction = ({ transaction, onSuccess }: ReviewTransactionProps) => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reasonsToApprove, setReasonsToApprove] = useState<ReviewReason[]>([]);

  const reasons = transaction.reviewReasons ?? [];

  if (transaction.reviewType !== 'NEEDS_REVIEW' || reasons.length === 0) return null;

  const handleOpenChange = (next: boolean) => {
    // Don't let an outside click or Escape dismiss mid-flight.
    if (submitting) return;
    if (next) setReasonsToApprove(reasons);
    setOpen(next);
  };

  const toggleReason = (reason: ReviewReason, checked: boolean) => {
    setReasonsToApprove((prev) =>
      checked ? [...prev, reason] : prev.filter((r) => r !== reason),
    );
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const res = await batchReviewTransactions(
        [transaction.id],
        'MANUALLY_REVIEWED',
        reasonsToApprove,
      );

      if (!res.success) {
        toast.error(res.error.message);
        return;
      }

      const { succeededIds, skippedIds, failures } = res.data;
      const failure = failures.find((f) => f.id === transaction.id);

      if (failure) {
        toast.error(batchFailureLabel(failure.reason));
        return;
      }
      if (skippedIds.includes(transaction.id)) {
        toast.warning('Nothing to approve — no matching review reasons');
        return;
      }
      if (!succeededIds.includes(transaction.id)) {
        toast.error('Failed to mark transaction as reviewed');
        return;
      }

      toast.success('Transaction marked as reviewed');
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleOpenChange(true)}
        className="h-9 w-full rounded-lg gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40 hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-350 transition-colors"
      >
        <Check className="h-3.5 w-3.5" />
        Review
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Approve Transaction</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1">
              Select which review reasons you want to clear from this transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {reasons.map((reason) => (
              <div key={reason} className="flex items-center space-x-2">
                <Checkbox
                  id={`review-reason-${reason}`}
                  checked={reasonsToApprove.includes(reason)}
                  onCheckedChange={(checked) => toggleReason(reason, checked === true)}
                />
                <label
                  htmlFor={`review-reason-${reason}`}
                  className="text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer select-none"
                >
                  {reviewReasonLabel(reason)}
                </label>
              </div>
            ))}
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs rounded-xl"
              disabled={submitting}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl"
              size="sm"
              disabled={submitting || reasonsToApprove.length === 0}
              onClick={handleApprove}
            >
              {submitting ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

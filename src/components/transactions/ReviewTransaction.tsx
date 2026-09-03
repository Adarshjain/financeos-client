'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { batchFailureLabel, reviewReasonLabel } from '@/components/transactions/catalog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api, ApiError } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
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
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reasonsToApprove, setReasonsToApprove] = useState<ReviewReason[]>([]);

  const reasons = transaction.reviewReasons ?? [];

  const approveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.POST('/api/v1/transactions/batch-review', {
        body: {
          transactionIds: [transaction.id],
          reviewType: 'MANUALLY_REVIEWED',
          reviewReasons: reasonsToApprove as ('UNRECONCILED' | 'CATEGORY_UNVERIFIED' | 'DUPLICATE_SUSPECT')[],
        },
      });
      return data;
    },
    onSuccess: (data) => {
      if (!data) return;
      const { succeededIds = [], skippedIds = [], failures = [] } = data;
      const failure = failures.find((f) => f.id === transaction.id);

      if (failure) {
        toast.error(batchFailureLabel(failure.reason || ''));
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
      queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      setOpen(false);
      onSuccess?.();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.response.message : (error as Error).message);
    },
  });

  const submitting = approveMutation.isPending;

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

  const handleApprove = () => {
    approveMutation.mutate();
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleOpenChange(true)}
        className="h-9 w-full text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40 hover:bg-emerald-50 hover:text-emerald-800 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-350"
      >
        <Check className="h-3.5 w-3.5" />
        Review
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Approve Transaction</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1">
              Select which review reasons you want to clear from this transaction.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-3">
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
          </DialogBody>
          <DialogFooter
            primaryAction={{
              label: submitting ? 'Approving...' : 'Approve',
              onClick: handleApprove,
              disabled: submitting || reasonsToApprove.length === 0,
            }}
            secondaryAction={{
              label: 'Cancel',
              onClick: () => handleOpenChange(false),
              disabled: submitting,
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { batchFailureLabel, reviewReasonLabel } from '@/components/transactions/catalog';
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
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';
import type { ReviewReason, Transaction } from '@/lib/transaction.types';

interface ReviewTransactionDialogProps {
  /** Undefined renders nothing, so a list can keep one instance bound to a nullable target. */
  transaction: Transaction | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the transaction was successfully marked as reviewed. */
  onSuccess?: () => void;
}

/**
 * Controlled reason picker for approving one transaction. Every open
 * pre-checks all of the transaction's current review reasons; the parent owns
 * `open` so both the detail dialog's button and a card swipe can drive it.
 */
export const ReviewTransactionDialog = ({
  transaction,
  open,
  onOpenChange,
  onSuccess,
}: ReviewTransactionDialogProps) => {
  const queryClient = useQueryClient();
  const [reasonsToApprove, setReasonsToApprove] = useState<ReviewReason[]>([]);

  const transactionId = transaction?.id;
  const reasons = transaction?.reviewReasons ?? [];

  useEffect(() => {
    if (open) setReasonsToApprove(transaction?.reviewReasons ?? []);
    // Re-seed per open and per target, not per reasons-array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, transactionId]);

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!transactionId) return undefined;
      const { data } = await api.POST('/api/v1/transactions/batch-review', {
        body: {
          transactionIds: [transactionId],
          reviewType: 'MANUALLY_REVIEWED',
          reviewReasons: reasonsToApprove as ('UNRECONCILED' | 'CATEGORY_UNVERIFIED' | 'DUPLICATE_SUSPECT')[],
        },
      });
      return data;
    },
    onSuccess: (data) => {
      if (!data || !transactionId) return;
      const { succeededIds = [], skippedIds = [], failures = [] } = data;
      const failure = failures.find((f) => f.id === transactionId);

      if (failure) {
        toast.error(batchFailureLabel(failure.reason || ''));
        return;
      }
      if (skippedIds.includes(transactionId)) {
        toast.warning('Nothing to approve — no matching review reasons');
        return;
      }
      if (!succeededIds.includes(transactionId)) {
        toast.error('Failed to mark transaction as reviewed');
        return;
      }

      toast.success('Transaction marked as reviewed');
      queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: unknown) => {
      toastError(error, (error as Error).message);
    },
  });

  const submitting = approveMutation.isPending;

  if (!transaction) return null;

  const handleOpenChange = (next: boolean) => {
    // Don't let an outside click or Escape dismiss mid-flight.
    if (submitting) return;
    onOpenChange(next);
  };

  const toggleReason = (reason: ReviewReason, checked: boolean) => {
    setReasonsToApprove((prev) =>
      checked ? [...prev, reason] : prev.filter((r) => r !== reason),
    );
  };

  return (
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
            onClick: () => approveMutation.mutate(),
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
  );
};

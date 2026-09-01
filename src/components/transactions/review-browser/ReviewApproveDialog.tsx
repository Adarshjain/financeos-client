'use client';

import { reviewReasonLabel } from '@/components/transactions/catalog';
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
import { ReviewReason } from '@/lib/transaction.types';

interface ReviewApproveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  presentReasons: ReviewReason[];
  reasonsToApprove: ReviewReason[];
  setReasonsToApprove: (reasons: ReviewReason[]) => void;
  batchActionLoading: boolean;
  onBatchApprove: () => void;
}

export function ReviewApproveDialog({
  open,
  onOpenChange,
  selectedCount,
  presentReasons,
  reasonsToApprove,
  setReasonsToApprove,
  batchActionLoading,
  onBatchApprove,
}: ReviewApproveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">
            Approve Transactions
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Select which review reasons you want to clear from the {selectedCount} selected
            transaction(s).
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {presentReasons.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              No specific review reasons found on selected transactions.
            </p>
          ) : (
            presentReasons.map((reason) => {
              const label = reviewReasonLabel(reason);
              const isChecked = reasonsToApprove.includes(reason);
              return (
                <div key={reason} className="flex items-center space-x-2">
                  <Checkbox
                    id={`reason-${reason}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setReasonsToApprove([...reasonsToApprove, reason]);
                      } else {
                        setReasonsToApprove(reasonsToApprove.filter((r) => r !== reason));
                      }
                    }}
                  />
                  <label
                    htmlFor={`reason-${reason}`}
                    className="text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer select-none"
                  >
                    {label}
                  </label>
                </div>
              );
            })
          )}
        </DialogBody>
        <DialogFooter
          primaryAction={{
            label: batchActionLoading ? 'Approving...' : 'Approve',
            onClick: onBatchApprove,
            disabled: reasonsToApprove.length === 0 || batchActionLoading,
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: () => onOpenChange(false),
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

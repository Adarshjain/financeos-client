'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FnoTradeResponse } from '@/lib/types';

interface DeleteFnoTradeDialogProps {
  deletingTrade: FnoTradeResponse | null;
  onClose: () => void;
  isDeleting: boolean;
  onConfirmDelete: () => Promise<void>;
}

export function DeleteFnoTradeDialog({
  deletingTrade,
  onClose,
  isDeleting,
  onConfirmDelete,
}: DeleteFnoTradeDialogProps) {
  return (
    <Dialog open={!!deletingTrade} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
            Delete FnO Trade Record
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Are you sure you want to delete the trade record for{' '}
            <span className="font-semibold text-slate-900 dark:text-white">
              {deletingTrade?.tradingSymbol}
            </span>
            ? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter
          primaryAction={{
            label: isDeleting ? 'Deleting...' : 'Delete Trade',
            variant: 'destructive',
            onClick: onConfirmDelete,
            disabled: isDeleting,
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: onClose,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

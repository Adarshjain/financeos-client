'use client';

import { AlertTriangle } from 'lucide-react';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AccountRequest } from '@/lib/account.types';

interface CleanupConfirmDialogProps {
  confirmCleanup: {
    count: number;
    before: string;
    accountData: AccountRequest;
  } | null;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onConfirm: () => void;
}

export function CleanupConfirmDialog({
  confirmCleanup,
  onOpenChange,
  isSubmitting,
  onConfirm,
}: CleanupConfirmDialogProps) {
  return (
    <Dialog open={!!confirmCleanup} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Confirm Transaction Cleanup
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed py-2">
            Delete <strong className="text-rose-600 dark:text-rose-400">{confirmCleanup?.count}</strong> Gmail-imported transactions before <strong>{confirmCleanup?.before}</strong>? Statement imports are not affected.
          </p>
        </DialogBody>
        <DialogFooter
          primaryAction={{
            label: isSubmitting ? 'Cleaning up...' : 'Delete & Save',
            onClick: onConfirm,
            disabled: isSubmitting,
            variant: 'destructive',
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: () => onOpenChange(false),
            variant: 'outline',
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

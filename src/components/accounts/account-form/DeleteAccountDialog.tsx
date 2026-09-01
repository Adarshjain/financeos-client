'use client';

import { AlertTriangle, Trash2, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Account } from '@/lib/account.types';

interface DeleteAccountDialogProps {
  account: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDeleting: boolean;
  isClosingAccount: boolean;
  onCloseInstead: () => void;
  onDeletePermanently: () => void;
}

export function DeleteAccountDialog({
  account,
  open,
  onOpenChange,
  isDeleting,
  isClosingAccount,
  onCloseInstead,
  onDeletePermanently,
}: DeleteAccountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            Delete Account
          </DialogTitle>
          <DialogDescription className="space-y-2 pt-2 text-xs text-slate-600 dark:text-slate-300">
            <p>
              Are you sure you want to delete <strong>{account.name}</strong>?
            </p>
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-2xs text-rose-700 dark:text-rose-300">
              <strong>Warning:</strong> Deleting permanently removes all associated transactions, statements, card instances, and reward rules.
            </div>
            {!account.closedOn && (
              <p className="text-2xs text-slate-500 dark:text-slate-400">
                Consider closing the account instead to preserve your transaction and statement history.
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDeleting || isClosingAccount}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {!account.closedOn && (
            <Button
              type="button"
              variant="default"
              size="sm"
              className="gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
              disabled={isDeleting || isClosingAccount}
              onClick={onCloseInstead}
            >
              <XCircle className="w-3.5 h-3.5" />
              {isClosingAccount ? 'Closing...' : 'Close Instead'}
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="gap-1.5"
            disabled={isDeleting || isClosingAccount}
            onClick={onDeletePermanently}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

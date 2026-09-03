'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Account, isAccountClosed } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { keys } from '@/lib/query/keys';

interface DeleteAccountProps {
  account: Account;
}

export function DeleteAccount({ account }: DeleteAccountProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const closed = isAccountClosed(account);

  const deleteAccountMutation = useMutation({
    mutationFn: (id: string) => api.DELETE('/api/v1/accounts/{id}', { params: { path: { id } } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.accounts.all }),
  });

  const closeAccountMutation = useMutation({
    mutationFn: (id: string) =>
      api.POST('/api/v1/accounts/{id}/close', { params: { path: { id } } }).then((r) => r.data as Account),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.accounts.all });
      qc.invalidateQueries({ queryKey: keys.transactions.all });
    },
  });

  const isDeleting = deleteAccountMutation.isPending;
  const isClosing = closeAccountMutation.isPending;

  const handleDelete = async () => {
    try {
      await deleteAccountMutation.mutateAsync(account.id);
      toast.success('Account deleted!');
      setOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete account'));
    }
  };

  const handleCloseInstead = async () => {
    try {
      await closeAccountMutation.mutateAsync(account.id);
      toast.success('Account closed successfully!');
      setOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to close account'));
    }
  };

  return (
    <>
      <button
        type="button"
        suppressHydrationWarning
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
        className="flex-1 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100/30 dark:hover:bg-slate-800/20 transition-all flex items-center justify-center gap-1.5"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2 text-xs text-slate-600 dark:text-slate-300">
              <p>
                Are you sure you want to permanently delete <strong>{account.name}</strong>?
              </p>
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-2xs text-rose-700 dark:text-rose-300">
                <strong>Warning:</strong> Deletion cascades across transactions, statements, card instances, holdings, and reward rules. This action cannot be undone.
              </div>
              {!closed && (
                <p className="text-2xs text-slate-500 dark:text-slate-400">
                  If you simply discontinued using this card or account, closing it preserves your historical records while removing it from everyday flows.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting || isClosing}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            {!closed && (
              <Button
                type="button"
                variant="default"
                size="sm"
                className="gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
                disabled={isDeleting || isClosing}
                onClick={handleCloseInstead}
              >
                <XCircle className="w-3.5 h-3.5" />
                {isClosing ? 'Closing...' : 'Close Account Instead'}
              </Button>
            )}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="gap-1.5"
              disabled={isDeleting || isClosing}
              onClick={handleDelete}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { deleteAccount } from '@/actions/accounts';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Account } from '@/lib/account.types';

interface DeleteAccountProps {
  account: Account;
}

export function DeleteAccount({ account }: DeleteAccountProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      // deleteAccount never throws — it returns an ApiResult. This previously
      // toasted success and closed the dialog unconditionally, so a 4xx/5xx
      // left the account intact while the UI claimed it was deleted.
      const res = await deleteAccount(account.id);
      if (res.success) {
        toast.success('Account deleted!');
        setOpen(false);
      } else {
        toast.error(res.error.message);
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsDeleting(false);
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
        className="flex-1 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100/30 dark:hover:bg-slate-800/20 transition-all flex items-center justify-center gap-1.5"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{account.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

'use client';

import { AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { JSX, useState } from 'react';

import { deleteAccount } from '@/actions/accounts';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Account } from '@/lib/account.types';
import { ApiResult } from '@/lib/types';

interface DeleteAccountProps {
  account: Account;
  trigger?: JSX.Element;
  onSuccess?: () => void;
}

export function DeleteAccount({ account, trigger, onSuccess }: DeleteAccountProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [result, setResult] = useState<ApiResult<void> | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setResult(null);

    try {
      const deleteResult = await deleteAccount(account.id);
      setResult(deleteResult);

      if (deleteResult.success) {
        setTimeout(() => {
          setOpen(false);
          if (onSuccess) {
            onSuccess();
          }
        }, 1000);
      }
    } catch (error) {
      setResult({
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const defaultTrigger = (
    <Button variant="destructive" size="sm">
      <Trash2 className="h-4 w-4" />
      Delete
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Account</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{account.name}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {result && !result.success && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{result.error.message}</AlertDescription>
          </Alert>
        )}

        {result?.success && (
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>Account deleted successfully!</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isDeleting || result?.success}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || result?.success}
          >
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

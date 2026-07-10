'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { deleteTransaction } from '@/actions/transactions';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Transaction } from '@/lib/transaction.types';

interface DeleteTransactionProps {
  transaction: Transaction;
  onSuccess?: () => void;
}

export const DeleteTransaction = ({ transaction, onSuccess }: DeleteTransactionProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const res = await deleteTransaction(transaction.id);
      if (res.success) {
        toast.success('Transaction deleted!');
        onSuccess?.();
      } else {
        toast.error(res.error.message);
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  const trigger = (
    <Button
      variant="outline"
      size="sm"
      className="flex-1 w-full rounded-lg hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900/30 gap-1.5 transition-colors text-xs font-semibold"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Delete
    </Button>
  );

  return (
    <ConfirmationDialog
      title="Delete Transaction?"
      description={
        transaction.source !== 'manual'
          ? 'This is not a manually created transaction. It is discouraged to delete this'
          : 'Are you sure you want to delete this transaction?'
      }
      primaryActionText={isDeleting ? 'Deleting...' : 'Delete'}
      trigger={trigger}
      primaryAction={handleDelete}
      loading={isDeleting}
    />
  );
};

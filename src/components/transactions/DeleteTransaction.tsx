'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { Transaction } from '@/lib/transaction.types';

interface DeleteTransactionProps {
  transaction: Transaction;
  onSuccess?: () => void;
}

export const DeleteTransaction = ({ transaction, onSuccess }: DeleteTransactionProps) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => api.DELETE('/api/v1/transactions/{id}', { params: { path: { id: transaction.id } } }),
    onSuccess: () => {
      toast.success('Transaction deleted!');
      queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      queryClient.invalidateQueries({ queryKey: keys.accounts.all });
      onSuccess?.();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.response.message : (error as Error).message);
    },
  });

  const isDeleting = deleteMutation.isPending;

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync();
    } catch {
      // Error toast already shown by the mutation's onError handler.
    }
  };

  const trigger = (
    <Button
      variant="outline"
      size="sm"
      className="flex-1 w-full hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900/30"
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

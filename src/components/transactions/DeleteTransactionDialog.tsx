'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';
import { Transaction } from '@/lib/transaction.types';

interface DeleteTransactionDialogProps {
  /** Undefined renders nothing, so a list can keep one instance bound to a nullable target. */
  transaction: Transaction | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * Controlled delete confirmation for one transaction. The parent owns `open`
 * so both the detail dialog's button and a card swipe can drive it.
 */
export const DeleteTransactionDialog = ({
  transaction,
  open,
  onOpenChange,
  onSuccess,
}: DeleteTransactionDialogProps) => {
  const queryClient = useQueryClient();
  const transactionId = transaction?.id;

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!transactionId) return Promise.resolve(undefined);
      return api.DELETE('/api/v1/transactions/{id}', { params: { path: { id: transactionId } } });
    },
    onSuccess: () => {
      toast.success('Transaction deleted!');
      queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      queryClient.invalidateQueries({ queryKey: keys.accounts.all });
      onSuccess?.();
    },
    onError: (error: unknown) => {
      toastError(error, (error as Error).message);
    },
  });

  const isDeleting = deleteMutation.isPending;

  if (!transaction) return null;

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync();
    } catch {
      // Error toast already shown by the mutation's onError handler.
    }
  };

  return (
    <ConfirmationDialog
      title="Delete Transaction?"
      description={buildDeleteDescription(transaction)}
      primaryActionText={isDeleting ? 'Deleting...' : 'Delete'}
      open={open}
      onOpenChange={onOpenChange}
      primaryAction={handleDelete}
      loading={isDeleting}
    />
  );
};

export function buildDeleteDescription(transaction: Transaction): string {
  const obligationRefs = transaction.obligationRefs ?? [];
  const obligationSuffix =
    obligationRefs.length > 0
      ? ` It is linked to ${obligationRefs.length} loan, lending or dividend record${obligationRefs.length === 1 ? '' : 's'} (${obligationRefs.map((ref) => ref.label).join(', ')}); the record${obligationRefs.length === 1 ? '' : 's'} will stay but lose the link.`
      : '';

  return (
    (transaction.source !== 'manual'
      ? 'This is not a manually created transaction. It is discouraged to delete this'
      : 'Are you sure you want to delete this transaction?') + obligationSuffix
  );
}

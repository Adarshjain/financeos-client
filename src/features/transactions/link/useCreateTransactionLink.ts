'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createTransactionLink } from '@/features/transactions/detail/transactionDetailApi';
import { notify } from '@/lib/notify';
import { invalidateMoneyQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';
import type { CreateTransactionLinkRequest } from '@/lib/transaction.types';

/** POST /transaction-links: toasts, refreshes the transaction lists and what a transfer or reversal moves, then calls `onLinked`. */
export function useCreateTransactionLink(onLinked: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTransactionLinkRequest) => createTransactionLink(body),
    onSuccess: () => {
      notify.success('Transactions linked');
      queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      // A TRANSFER/REVERSAL link moves the emergency fund's outflow and the spending calendar.
      void invalidateMoneyQueries(queryClient);
      onLinked();
    },
    onError: (err: unknown) => {
      toastError(err, "Couldn't link the transactions. Try again.");
    },
  });
}

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createTransaction, updateTransaction } from '@/features/transactions/transactionActions';
import { unwrapAction } from '@/lib/actionResult';
import { invalidateMoneyQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import type { TransactionRequest } from '@/lib/transaction.types';

/** Create and update a transaction; either one refreshes the transaction lists and everything a balance feeds. */
export function useTransactionMutations() {
  const queryClient = useQueryClient();
  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: keys.transactions.all });
    void invalidateMoneyQueries(queryClient);
  };

  const createMutation = useMutation({
    mutationFn: (body: TransactionRequest) => unwrapAction(createTransaction(body)),
    onSuccess,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: TransactionRequest }) => unwrapAction(updateTransaction(id, body)),
    onSuccess,
  });

  return { createMutation, updateMutation };
}

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { Schemas } from '@/lib/api/types';
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
    mutationFn: async (body: TransactionRequest) => {
      const { data } = await api.POST('/api/v1/transactions', {
        body: body as Schemas['CreateTransactionRequest'],
      });
      return data!;
    },
    onSuccess,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: TransactionRequest }) => {
      const { data } = await api.PUT('/api/v1/transactions/{id}', {
        params: { path: { id } },
        body: body as Schemas['UpdateTransactionRequest'],
      });
      return data!;
    },
    onSuccess,
  });

  return { createMutation, updateMutation };
}

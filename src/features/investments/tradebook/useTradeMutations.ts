'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { CreateInvestmentTransactionRequest, UpdateInvestmentTransactionRequest } from '@/lib/api/types';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';
import type { InvestmentTransactionResponse } from '@/lib/types';

/**
 * The three ways a user changes the tradebook: record a trade, change one, delete one. Each refreshes every
 * investment query on success.
 */
export function useTradeMutations() {
  const qc = useQueryClient();
  const onSuccess = () => invalidateInvestmentQueries(qc);

  const createTrade = useMutation({
    mutationFn: (body: CreateInvestmentTransactionRequest) =>
      api.POST('/api/v1/investments/transactions', { body }).then((r) => r.data! as InvestmentTransactionResponse),
    onSuccess,
  });

  const updateTrade = useMutation({
    mutationFn: (vars: { id: string; body: UpdateInvestmentTransactionRequest }) =>
      api
        .PUT('/api/v1/investments/transactions/{id}', { params: { path: { id: vars.id } }, body: vars.body })
        .then((r) => r.data! as InvestmentTransactionResponse),
    onSuccess,
  });

  const deleteTrade = useMutation({
    mutationFn: (id: string) => api.DELETE('/api/v1/investments/transactions/{id}', { params: { path: { id } } }),
    onSuccess,
  });

  return { createTrade, updateTrade, deleteTrade };
}

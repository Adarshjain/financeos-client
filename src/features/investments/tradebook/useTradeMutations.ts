'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import type { CreateInvestmentTransactionRequest, UpdateInvestmentTransactionRequest } from '@/lib/api/types';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';

import { createTradeAction, deleteTradeAction, updateTradeAction } from './tradeActions';

/**
 * The three ways a user changes the tradebook: record a trade, change one, delete one. Each refreshes every
 * investment query on success.
 */
export function useTradeMutations() {
  const qc = useQueryClient();
  const onSuccess = () => invalidateInvestmentQueries(qc);

  const createTrade = useMutation({
    mutationFn: (body: CreateInvestmentTransactionRequest) => unwrapAction(createTradeAction(body)),
    onSuccess,
  });

  const updateTrade = useMutation({
    mutationFn: (vars: { id: string; body: UpdateInvestmentTransactionRequest }) =>
      unwrapAction(updateTradeAction(vars.id, vars.body)),
    onSuccess,
  });

  const deleteTrade = useMutation({
    mutationFn: (id: string) => unwrapAction(deleteTradeAction(id)),
    onSuccess,
  });

  return { createTrade, updateTrade, deleteTrade };
}

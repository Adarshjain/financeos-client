'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';

/**
 * The three ways a user changes one instrument's prices: set a manual price for a date, change the amount of
 * one of their manual prices, delete one. Each refreshes every investment query on success.
 */
export function usePriceMutations(instrumentId: string) {
  const qc = useQueryClient();
  const onSuccess = () => invalidateInvestmentQueries(qc);

  const setPrice = useMutation({
    mutationFn: (body: { price: number; asOf?: string }) =>
      api.POST('/api/v1/instruments/{id}/price', { params: { path: { id: instrumentId } }, body }),
    onSuccess,
  });

  const updatePrice = useMutation({
    mutationFn: (vars: { priceId: string; price: number }) =>
      api.PUT('/api/v1/instruments/{instrumentId}/prices/{priceId}', {
        params: { path: { instrumentId, priceId: vars.priceId } },
        body: { price: vars.price },
      }),
    onSuccess,
  });

  const deletePrice = useMutation({
    mutationFn: (priceId: string) =>
      api.DELETE('/api/v1/instruments/{instrumentId}/prices/{priceId}', { params: { path: { instrumentId, priceId } } }),
    onSuccess,
  });

  return { setPrice, updatePrice, deletePrice };
}

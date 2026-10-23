'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';
import type { CreateFnoTradeRequest, FnoTradeResponse } from '@/lib/types';

/** Records an F&O trade (POST /investments/fno) and refreshes every investment query. */
export function useCreateFnoTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFnoTradeRequest) =>
      api.POST('/api/v1/investments/fno', { body }).then((r) => r.data! as FnoTradeResponse),
    onSuccess: () => invalidateInvestmentQueries(qc),
  });
}

/** Changes an F&O trade (PUT /investments/fno/{id}) and refreshes every investment query. */
export function useUpdateFnoTrade(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFnoTradeRequest) =>
      api
        .PUT('/api/v1/investments/fno/{id}', { params: { path: { id: id ?? '' } }, body })
        .then((r) => r.data! as FnoTradeResponse),
    onSuccess: () => invalidateInvestmentQueries(qc),
  });
}

/** Deletes an F&O trade (DELETE /investments/fno/{id}) and refreshes every investment query. */
export function useDeleteFnoTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.DELETE('/api/v1/investments/fno/{id}', { params: { path: { id } } }),
    onSuccess: () => invalidateInvestmentQueries(qc),
  });
}

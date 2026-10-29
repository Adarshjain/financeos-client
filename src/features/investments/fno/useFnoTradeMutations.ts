'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';
import type { CreateFnoTradeRequest } from '@/lib/types';

import { createFnoTrade, deleteFnoTrade, updateFnoTrade } from './fnoActions';

/** Records an F&O trade (POST /investments/fno) and refreshes every investment query. */
export function useCreateFnoTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFnoTradeRequest) => unwrapAction(createFnoTrade(body)),
    onSuccess: () => invalidateInvestmentQueries(qc),
  });
}

/** Changes an F&O trade (PUT /investments/fno/{id}) and refreshes every investment query. */
export function useUpdateFnoTrade(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFnoTradeRequest) => unwrapAction(updateFnoTrade(id ?? '', body)),
    onSuccess: () => invalidateInvestmentQueries(qc),
  });
}

/** Deletes an F&O trade (DELETE /investments/fno/{id}) and refreshes every investment query. */
export function useDeleteFnoTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrapAction(deleteFnoTrade(id)),
    onSuccess: () => invalidateInvestmentQueries(qc),
  });
}

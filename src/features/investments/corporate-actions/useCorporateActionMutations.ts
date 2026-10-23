'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { CorporateAction, CreateCorporateActionRequest, UpdateCorporateActionRequest } from '@/lib/api/types';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';

/** Create, update and delete of one instrument's corporate actions; each refreshes every investment query on success. */
export function useCorporateActionMutations(instrumentId: string | undefined) {
  const qc = useQueryClient();
  const onSuccess = () => invalidateInvestmentQueries(qc);

  const createMutation = useMutation({
    mutationFn: (body: CreateCorporateActionRequest) =>
      api
        .POST('/api/v1/instruments/{instrumentId}/corporate-actions', {
          params: { path: { instrumentId: instrumentId as string } },
          body,
        })
        .then((r) => r.data! as CorporateAction),
    onSuccess,
  });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; body: UpdateCorporateActionRequest }) =>
      api
        .PUT('/api/v1/instruments/{instrumentId}/corporate-actions/{id}', {
          params: { path: { instrumentId: instrumentId as string, id: vars.id } },
          body: vars.body,
        })
        .then((r) => r.data! as CorporateAction),
    onSuccess,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.DELETE('/api/v1/instruments/{instrumentId}/corporate-actions/{id}', {
        params: { path: { instrumentId: instrumentId as string, id } },
      }),
    onSuccess,
  });

  return { createMutation, updateMutation, deleteMutation };
}

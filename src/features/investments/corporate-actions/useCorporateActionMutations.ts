'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import type { CreateCorporateActionRequest, UpdateCorporateActionRequest } from '@/lib/api/types';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';

import { createCorporateAction, deleteCorporateAction, updateCorporateAction } from './corporateActions';

/** Create, update and delete of one instrument's corporate actions; each refreshes every investment query on success. */
export function useCorporateActionMutations(instrumentId: string | undefined) {
  const qc = useQueryClient();
  const onSuccess = () => invalidateInvestmentQueries(qc);

  const createMutation = useMutation({
    mutationFn: (body: CreateCorporateActionRequest) => unwrapAction(createCorporateAction(instrumentId as string, body)),
    onSuccess,
  });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; body: UpdateCorporateActionRequest }) =>
      unwrapAction(updateCorporateAction(instrumentId as string, vars.id, vars.body)),
    onSuccess,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => unwrapAction(deleteCorporateAction(instrumentId as string, id)),
    onSuccess,
  });

  return { createMutation, updateMutation, deleteMutation };
}

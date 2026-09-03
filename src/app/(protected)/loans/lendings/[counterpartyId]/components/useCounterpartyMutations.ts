'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, ApiError } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type {
  CreateLendingRequest,
  UpdateCounterpartyRequest,
  UpdateLendingRequest,
} from '@/lib/types';

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.response.message : fallback;
}

function onErrorToast(fallback: string) {
  return (e: unknown) => toast.error(errorMessage(e, fallback));
}

/** Mutations for the counterparty detail page (person profile + their ledger). */
export function useCounterpartyMutations(counterpartyId: string) {
  const qc = useQueryClient();

  const invalidateLendings = () =>
    qc.invalidateQueries({ queryKey: keys.lendings.all });
  const invalidateLendingsAndTransactions = () => {
    invalidateLendings();
    qc.invalidateQueries({ queryKey: keys.transactions.all });
  };

  const updateCp = useMutation({
    mutationFn: (body: UpdateCounterpartyRequest) =>
      api
        .PUT('/api/v1/counterparties/{id}', {
          params: { path: { id: counterpartyId } },
          body,
        })
        .then((r) => r.data!),
    onSuccess: invalidateLendings,
    onError: onErrorToast('Failed to update counterparty'),
  });

  const deleteCp = useMutation({
    mutationFn: () =>
      api.DELETE('/api/v1/counterparties/{id}', {
        params: { path: { id: counterpartyId } },
      }),
    onSuccess: invalidateLendings,
    onError: onErrorToast('Failed to delete counterparty'),
  });

  const createLending = useMutation({
    mutationFn: (body: CreateLendingRequest) =>
      api.POST('/api/v1/lendings', { body }).then((r) => r.data!),
    onSuccess: invalidateLendingsAndTransactions,
    onError: onErrorToast('Failed to create lending'),
  });

  const updateLending = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateLendingRequest }) =>
      api
        .PUT('/api/v1/lendings/{id}', { params: { path: { id } }, body })
        .then((r) => r.data!),
    onSuccess: invalidateLendings,
    onError: onErrorToast('Failed to update lending'),
  });

  const deleteLending = useMutation({
    mutationFn: (id: string) =>
      api.DELETE('/api/v1/lendings/{id}', { params: { path: { id } } }),
    onSuccess: invalidateLendingsAndTransactions,
    onError: onErrorToast('Failed to delete lending'),
  });

  return { updateCp, deleteCp, createLending, updateLending, deleteLending };
}

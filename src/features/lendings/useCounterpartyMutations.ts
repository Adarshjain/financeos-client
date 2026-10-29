'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { invalidateLendingQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';
import type {
  UpdateCounterpartyRequest,
  UpdateLendingRequest,
} from '@/lib/types';

import { useCreateLending } from './useCreateLending';
import { useLinkLendingTransaction, useUnlinkLendingTransaction } from './useLendingTransactionLink';

export interface CounterpartyMutationOptions {
  /** Replaces the default Legacy error toast, for pages whose toasts come from another toaster. */
  onError?: (e: unknown, fallback: string) => void;
}

/** Mutations for the counterparty detail page (person profile + their ledger). */
export function useCounterpartyMutations(counterpartyId: string, options?: CounterpartyMutationOptions) {
  const qc = useQueryClient();
  const onErrorToast = (fallback: string) => (e: unknown) =>
    options?.onError ? options.onError(e, fallback) : toastError(e, fallback);

  const invalidateLendings = () => invalidateLendingQueries(qc);
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
    onError: onErrorToast("Couldn't update counterparty. Try again."),
  });

  const deleteCp = useMutation({
    mutationFn: () =>
      api.DELETE('/api/v1/counterparties/{id}', {
        params: { path: { id: counterpartyId } },
      }),
    onSuccess: invalidateLendings,
    onError: onErrorToast("Couldn't delete counterparty. Try again."),
  });

  const createLending = useCreateLending(
    options?.onError ? { onError: (e) => options.onError!(e, "Couldn't record lending. Try again.") } : undefined,
  );

  const updateLending = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateLendingRequest }) =>
      api
        .PUT('/api/v1/lendings/{id}', { params: { path: { id } }, body })
        .then((r) => r.data!),
    onSuccess: invalidateLendings,
    onError: onErrorToast("Couldn't update lending. Try again."),
  });

  const deleteLending = useMutation({
    mutationFn: (id: string) =>
      api.DELETE('/api/v1/lendings/{id}', { params: { path: { id } } }),
    onSuccess: invalidateLendingsAndTransactions,
    onError: onErrorToast("Couldn't delete lending. Try again."),
  });

  const linkTransaction = useLinkLendingTransaction(
    options?.onError ? { onError: (e) => options.onError!(e, "Couldn't link transaction. Try again.") } : undefined,
  );

  const unlinkTransaction = useUnlinkLendingTransaction(
    options?.onError ? { onError: (e) => options.onError!(e, "Couldn't unlink transaction. Try again.") } : undefined,
  );

  return {
    updateCp,
    deleteCp,
    createLending,
    updateLending,
    deleteLending,
    linkTransaction,
    unlinkTransaction,
  };
}

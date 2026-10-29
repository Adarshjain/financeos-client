'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { invalidateLendingQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';

interface Options {
  /** Replaces the default Legacy error toast, for pages whose toasts come from another toaster. */
  onError?: (e: unknown) => void;
}

function useRefresh() {
  const qc = useQueryClient();
  return () => {
    // Lendings covers the list, summary, counterparties and unrecorded transfers.
    invalidateLendingQueries(qc);
    qc.invalidateQueries({ queryKey: keys.transactions.all });
  };
}

/** POST /counterparties/{id}/settlements: records a bank transfer as a settlement entry; returns the entry. */
export function useRecordSettlement(options?: Options) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ counterpartyId, transactionId }: { counterpartyId: string; transactionId: string }) =>
      api
        .POST('/api/v1/counterparties/{id}/settlements', {
          params: { path: { id: counterpartyId } },
          body: { transactionId },
        })
        .then((r) => r.data!),
    onSuccess: refresh,
    onError: options?.onError ?? ((e: unknown) => toastError(e, "Couldn't record settlement. Try again.")),
  });
}

/** DELETE /lendings/{id}: removes an entry (Undo of a recorded settlement). */
export function useDeleteLending(options?: Options) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: string) => api.DELETE('/api/v1/lendings/{id}', { params: { path: { id } } }),
    onSuccess: refresh,
    onError: options?.onError ?? ((e: unknown) => toastError(e, "Couldn't delete lending. Try again.")),
  });
}

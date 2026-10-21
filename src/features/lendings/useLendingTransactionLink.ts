'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { invalidateLendingQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';

interface LinkOptions {
  /** Replaces the default Legacy error toast, for pages whose toasts come from another toaster. */
  onError?: (e: unknown) => void;
}

function useRefreshLendingsAndTransactions() {
  const qc = useQueryClient();
  return () => {
    invalidateLendingQueries(qc);
    qc.invalidateQueries({ queryKey: keys.transactions.all });
  };
}

/** PUT /lendings/{id}/transaction: attaches (or replaces) the bank transaction behind a ledger entry. */
export function useLinkLendingTransaction(options?: LinkOptions) {
  const refresh = useRefreshLendingsAndTransactions();
  return useMutation({
    mutationFn: ({ id, transactionId }: { id: string; transactionId: string }) =>
      api
        .PUT('/api/v1/lendings/{id}/transaction', { params: { path: { id } }, body: { transactionId } })
        .then((r) => r.data!),
    onSuccess: refresh,
    onError: options?.onError ?? ((e: unknown) => toastError(e, 'Failed to link transaction')),
  });
}

/** DELETE /lendings/{id}/transaction: detaches it again (idempotent). */
export function useUnlinkLendingTransaction(options?: LinkOptions) {
  const refresh = useRefreshLendingsAndTransactions();
  return useMutation({
    mutationFn: (id: string) => api.DELETE('/api/v1/lendings/{id}/transaction', { params: { path: { id } } }),
    onSuccess: refresh,
    onError: options?.onError ?? ((e: unknown) => toastError(e, 'Failed to unlink transaction')),
  });
}

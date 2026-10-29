'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import { invalidateLendingQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';

import { linkLendingEntryTransaction, unlinkLendingEntryTransaction } from './actions';

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
      unwrapAction(linkLendingEntryTransaction(id, transactionId)),
    onSuccess: refresh,
    onError: options?.onError ?? ((e: unknown) => toastError(e, "Couldn't link transaction. Try again.")),
  });
}

/** DELETE /lendings/{id}/transaction: detaches it again (idempotent). */
export function useUnlinkLendingTransaction(options?: LinkOptions) {
  const refresh = useRefreshLendingsAndTransactions();
  return useMutation({
    mutationFn: (id: string) => unwrapAction(unlinkLendingEntryTransaction(id)),
    onSuccess: refresh,
    onError: options?.onError ?? ((e: unknown) => toastError(e, "Couldn't unlink transaction. Try again.")),
  });
}

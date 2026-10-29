'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import { invalidateLendingQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';
import type { CreateLendingRequest } from '@/lib/types';

import { createLendingEntry } from './actions';

/**
 * Records one lending ledger entry (POST /api/v1/lendings) and refreshes everything it moves:
 * lendings, the loans summary, obligations and transactions. `onError` replaces the default
 * Legacy error toast, for pages whose toasts come from another toaster.
 */
export function useCreateLending(options?: { onError?: (e: unknown) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLendingRequest) => unwrapAction(createLendingEntry(body)),
    onSuccess: () => {
      invalidateLendingQueries(qc);
      qc.invalidateQueries({ queryKey: keys.transactions.all });
    },
    onError: options?.onError ?? ((e: unknown) => toastError(e, "Couldn't record lending. Try again.")),
  });
}

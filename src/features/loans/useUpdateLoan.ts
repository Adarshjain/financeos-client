'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { LoanResponse, UpdateLoanRequest } from '@/lib/loan.types';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';

/**
 * Updates a loan (PUT /api/v1/loans/{id}) and refreshes every loan query. `onError` replaces the default
 * Legacy error toast, for pages whose toasts come from another toaster.
 */
export function useUpdateLoan(options?: { onError?: (e: unknown) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateLoanRequest }) =>
      api.PUT('/api/v1/loans/{id}', { params: { path: { id } }, body }).then((r) => r.data! as LoanResponse),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.loans.all }),
    onError: options?.onError ?? ((e: unknown) => toastError(e, 'Failed to update loan')),
  });
}

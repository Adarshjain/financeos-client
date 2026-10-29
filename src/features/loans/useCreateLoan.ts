'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import type { CreateLoanRequest, LoanResponse } from '@/lib/loan.types';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';

import { createLoan } from './loanActions';

/**
 * Creates a loan (POST /api/v1/loans) and refreshes every loan query. `onError` replaces the default
 * Legacy error toast, for pages whose toasts come from another toaster.
 */
export function useCreateLoan(options?: { onError?: (e: unknown) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLoanRequest): Promise<LoanResponse> => unwrapAction(createLoan(body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.loans.all }),
    onError: options?.onError ?? ((e: unknown) => toastError(e, "Couldn't create loan. Try again.")),
  });
}

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { postLoanPaymentsBatch } from '@/features/loans/loanPaymentsBatch';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';
import type {
  BatchLoanPaymentRequest,
  CreateLoanChargeRequest,
  CreateLoanEventRequest,
  CreateLoanPaymentRequest,
} from '@/lib/types';

export interface LoanMutationOptions {
  /** Replaces the default Legacy error toast, for pages whose toasts come from another toaster. */
  onError?: (e: unknown, fallback: string) => void;
}

/**
 * Mutations for the loan detail page. Each mutation only invalidates the caches it
 * can affect (`keys.loans.all` always; `keys.transactions.all` too when the payload
 * can carry a `transactionId` link to a bank transaction) and surfaces failures via
 * `onError`. Success toasts/dialog-closing are left to the calling handlers since
 * several UI flows share the same endpoint with different copy (e.g. settling an
 * installment vs. confirming a match both call `addPayment`).
 */
export function useLoanMutations(loanId: string, options?: LoanMutationOptions) {
  const qc = useQueryClient();
  const onErrorToast = (fallback: string) => (e: unknown) =>
    options?.onError ? options.onError(e, fallback) : toastError(e, fallback);

  const invalidateLoan = () =>
    qc.invalidateQueries({ queryKey: keys.loans.all });
  const invalidateLoanAndTransactions = () => {
    invalidateLoan();
    qc.invalidateQueries({ queryKey: keys.transactions.all });
  };

  const addPayment = useMutation({
    mutationFn: (body: CreateLoanPaymentRequest) =>
      api
        .POST('/api/v1/loans/{id}/payments', {
          params: { path: { id: loanId } },
          body,
        })
        .then((r) => r.data!),
    onSuccess: invalidateLoanAndTransactions,
    onError: onErrorToast("Couldn't record loan payment. Try again."),
  });

  const addPaymentsBatch = useMutation({
    mutationFn: (body: BatchLoanPaymentRequest) => postLoanPaymentsBatch(loanId, body),
    onSuccess: invalidateLoanAndTransactions,
    onError: onErrorToast("Couldn't record batch loan payments. Try again."),
  });

  const deletePayment = useMutation({
    mutationFn: (paymentId: string) =>
      api.DELETE('/api/v1/loans/{id}/payments/{paymentId}', {
        params: { path: { id: loanId, paymentId } },
      }),
    onSuccess: invalidateLoanAndTransactions,
    onError: onErrorToast("Couldn't delete loan payment. Try again."),
  });

  const addEvent = useMutation({
    mutationFn: (body: CreateLoanEventRequest) =>
      api
        .POST('/api/v1/loans/{id}/events', {
          params: { path: { id: loanId } },
          body,
        })
        .then((r) => r.data!),
    onSuccess: invalidateLoanAndTransactions,
    onError: onErrorToast("Couldn't add loan event. Try again."),
  });

  const deleteEvent = useMutation({
    mutationFn: (eventId: string) =>
      api.DELETE('/api/v1/loans/{id}/events/{eventId}', {
        params: { path: { id: loanId, eventId } },
      }),
    onSuccess: invalidateLoanAndTransactions,
    onError: onErrorToast("Couldn't delete loan event. Try again."),
  });

  const addCharge = useMutation({
    mutationFn: (body: CreateLoanChargeRequest) =>
      api
        .POST('/api/v1/loans/{id}/charges', {
          params: { path: { id: loanId } },
          body,
        })
        .then((r) => r.data!),
    onSuccess: invalidateLoanAndTransactions,
    onError: onErrorToast("Couldn't add loan charge. Try again."),
  });

  const deleteCharge = useMutation({
    mutationFn: (chargeId: string) =>
      api.DELETE('/api/v1/loans/{id}/charges/{chargeId}', {
        params: { path: { id: loanId, chargeId } },
      }),
    onSuccess: invalidateLoanAndTransactions,
    onError: onErrorToast("Couldn't delete loan charge. Try again."),
  });

  const closeLoan = useMutation({
    mutationFn: () =>
      api.POST('/api/v1/loans/{id}/close', {
        params: { path: { id: loanId } },
      }),
    onSuccess: invalidateLoan,
    onError: onErrorToast("Couldn't close loan. Try again."),
  });

  const reopenLoan = useMutation({
    mutationFn: () =>
      api.POST('/api/v1/loans/{id}/reopen', {
        params: { path: { id: loanId } },
      }),
    onSuccess: invalidateLoan,
    onError: onErrorToast("Couldn't reopen loan. Try again."),
  });

  const deleteLoan = useMutation({
    mutationFn: () =>
      api.DELETE('/api/v1/loans/{id}', { params: { path: { id: loanId } } }),
    onSuccess: invalidateLoan,
    onError: onErrorToast("Couldn't delete loan. Try again."),
  });

  return {
    addPayment,
    addPaymentsBatch,
    deletePayment,
    addEvent,
    deleteEvent,
    addCharge,
    deleteCharge,
    closeLoan,
    reopenLoan,
    deleteLoan,
  };
}

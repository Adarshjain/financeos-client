'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { postLoanPaymentsBatch } from '@/features/loans/loanPaymentsBatchModel';
import { unwrapAction } from '@/lib/actionResult';
import type { CreateLoanRequest, LoanResponse, UpdateLoanRequest } from '@/lib/loan.types';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';
import type {
  BatchLoanPaymentRequest,
  CreateLoanChargeRequest,
  CreateLoanEventRequest,
  CreateLoanPaymentRequest,
} from '@/lib/types';

import {
  addLoanCharge,
  addLoanEvent,
  addLoanPayment,
  closeLoan as closeLoanAction,
  createLoan,
  deleteLoan as deleteLoanAction,
  deleteLoanCharge,
  deleteLoanEvent,
  deleteLoanPayment,
  reopenLoan as reopenLoanAction,
  updateLoan,
} from './loanActions';

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
    mutationFn: (body: CreateLoanPaymentRequest) => unwrapAction(addLoanPayment(loanId, body)),
    onSuccess: invalidateLoanAndTransactions,
    onError: onErrorToast("Couldn't record loan payment. Try again."),
  });

  const addPaymentsBatch = useMutation({
    mutationFn: (body: BatchLoanPaymentRequest) => postLoanPaymentsBatch(loanId, body),
    onSuccess: invalidateLoanAndTransactions,
    onError: onErrorToast("Couldn't record batch loan payments. Try again."),
  });

  const deletePayment = useMutation({
    mutationFn: (paymentId: string) => unwrapAction(deleteLoanPayment(loanId, paymentId)),
    onSuccess: invalidateLoanAndTransactions,
    onError: onErrorToast("Couldn't delete loan payment. Try again."),
  });

  const addEvent = useMutation({
    mutationFn: (body: CreateLoanEventRequest) => unwrapAction(addLoanEvent(loanId, body)),
    onSuccess: invalidateLoanAndTransactions,
    onError: onErrorToast("Couldn't add loan event. Try again."),
  });

  const deleteEvent = useMutation({
    mutationFn: (eventId: string) => unwrapAction(deleteLoanEvent(loanId, eventId)),
    onSuccess: invalidateLoanAndTransactions,
    onError: onErrorToast("Couldn't delete loan event. Try again."),
  });

  const addCharge = useMutation({
    mutationFn: (body: CreateLoanChargeRequest) => unwrapAction(addLoanCharge(loanId, body)),
    onSuccess: invalidateLoanAndTransactions,
    onError: onErrorToast("Couldn't add loan charge. Try again."),
  });

  const deleteCharge = useMutation({
    mutationFn: (chargeId: string) => unwrapAction(deleteLoanCharge(loanId, chargeId)),
    onSuccess: invalidateLoanAndTransactions,
    onError: onErrorToast("Couldn't delete loan charge. Try again."),
  });

  const closeLoan = useMutation({
    mutationFn: () => unwrapAction(closeLoanAction(loanId)),
    onSuccess: invalidateLoan,
    onError: onErrorToast("Couldn't close loan. Try again."),
  });

  const reopenLoan = useMutation({
    mutationFn: () => unwrapAction(reopenLoanAction(loanId)),
    onSuccess: invalidateLoan,
    onError: onErrorToast("Couldn't reopen loan. Try again."),
  });

  const deleteLoan = useMutation({
    mutationFn: () => unwrapAction(deleteLoanAction(loanId)),
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

/**
 * Updates a loan (PUT /api/v1/loans/{id}) and refreshes every loan query. `onError` replaces the default
 * Legacy error toast, for pages whose toasts come from another toaster.
 */
export function useUpdateLoan(options?: { onError?: (e: unknown) => void }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateLoanRequest }): Promise<LoanResponse> =>
      unwrapAction(updateLoan(id, body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.loans.all }),
    onError: options?.onError ?? ((e: unknown) => toastError(e, "Couldn't update loan. Try again.")),
  });
}

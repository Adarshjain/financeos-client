'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { Schemas } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import type {
  BatchLoanPaymentRequest,
  CreateLoanChargeRequest,
  CreateLoanEventRequest,
  CreateLoanPaymentRequest,
} from '@/lib/types';

function onErrorToast(fallback: string) {
  return (e: unknown) => toast.error(getErrorMessage(e, fallback));
}

/**
 * Mutations for the loan detail page. Each mutation only invalidates the caches it
 * can affect (`keys.loans.all` always; `keys.transactions.all` too when the payload
 * can carry a `transactionId` link to a bank transaction) and surfaces failures via
 * `onError`. Success toasts/dialog-closing are left to the calling handlers since
 * several UI flows share the same endpoint with different copy (e.g. settling an
 * installment vs. confirming a match both call `addPayment`).
 */
export function useLoanMutations(loanId: string) {
  const qc = useQueryClient();

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
    onError: onErrorToast('Failed to record loan payment'),
  });

  const addPaymentsBatch = useMutation({
    mutationFn: (body: BatchLoanPaymentRequest) =>
      api
        .POST('/api/v1/loans/{id}/payments/batch', {
          params: { path: { id: loanId } },
          // The generated request type requires `transactionId` on every item; the
          // match-confirmation flow always supplies one, but the hand-authored
          // `BatchLoanPaymentItem` marks it optional to mirror the single-payment
          // request shape. See "Spec follow-ups" in the migration report.
          body: body as Schemas['BatchLoanPaymentRequest'],
        })
        .then(() => ({ created: body.items.length })),
    onSuccess: invalidateLoanAndTransactions,
    onError: onErrorToast('Failed to record batch loan payments'),
  });

  const deletePayment = useMutation({
    mutationFn: (paymentId: string) =>
      api.DELETE('/api/v1/loans/{id}/payments/{paymentId}', {
        params: { path: { id: loanId, paymentId } },
      }),
    onSuccess: invalidateLoanAndTransactions,
    onError: onErrorToast('Failed to delete loan payment'),
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
    onError: onErrorToast('Failed to add loan event'),
  });

  const deleteEvent = useMutation({
    mutationFn: (eventId: string) =>
      api.DELETE('/api/v1/loans/{id}/events/{eventId}', {
        params: { path: { id: loanId, eventId } },
      }),
    onSuccess: invalidateLoanAndTransactions,
    onError: onErrorToast('Failed to delete loan event'),
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
    onError: onErrorToast('Failed to add loan charge'),
  });

  const deleteCharge = useMutation({
    mutationFn: (chargeId: string) =>
      api.DELETE('/api/v1/loans/{id}/charges/{chargeId}', {
        params: { path: { id: loanId, chargeId } },
      }),
    onSuccess: invalidateLoanAndTransactions,
    onError: onErrorToast('Failed to delete loan charge'),
  });

  const closeLoan = useMutation({
    mutationFn: () =>
      api.POST('/api/v1/loans/{id}/close', {
        params: { path: { id: loanId } },
      }),
    onSuccess: invalidateLoan,
    onError: onErrorToast('Failed to close loan'),
  });

  const reopenLoan = useMutation({
    mutationFn: () =>
      api.POST('/api/v1/loans/{id}/reopen', {
        params: { path: { id: loanId } },
      }),
    onSuccess: invalidateLoan,
    onError: onErrorToast('Failed to reopen loan'),
  });

  const deleteLoan = useMutation({
    mutationFn: () =>
      api.DELETE('/api/v1/loans/{id}', { params: { path: { id: loanId } } }),
    onSuccess: invalidateLoan,
    onError: onErrorToast('Failed to delete loan'),
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

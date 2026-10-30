'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { showToast } from '@/components/ds/Toast/Toast';
import { paymentItemFor } from '@/features/loans/loanPaymentsBatchModel';
import { useLoanMutations } from '@/features/loans/useLoanMutations';
import { appHref } from '@/features/shell/routes';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { watchSession } from '@/lib/authExpiry';
import type {
  BatchLoanPaymentRequest,
  InstallmentDto,
  MatchSuggestionsResponse,
} from '@/lib/loan.types';

import { loadLoanMatches } from './loanMatchActions';
import {
  buildChargeRequest,
  buildEventRequest,
  buildPaymentRequest,
  type ChargeValues,
  type EventValues,
  type PaymentValues,
} from './loanRequestsModel';
import { nothingFound } from './matchModel';

const NO_MATCHES = 'No matching bank transactions (±7 days)';

/**
 * Everything the loan page does to the loan: each action runs the mutation, says what happened in a Toast
 * (with Undo where an inverse exists), and refreshes the page. Failures surface the server's message.
 */
export function useLoanDetailMutations(loanId: string) {
  const router = useRouter();
  const mutations = useLoanMutations(loanId, {
    onError: (e, fallback) => showToast(getErrorMessage(e, fallback), { tone: 'danger' }),
  });
  const [matches, setMatches] = React.useState<MatchSuggestionsResponse | null>(null);
  const [matchLoading, setMatchLoading] = React.useState(false);

  // The suggestions go stale once a payment is recorded or removed: clear them so the card and the next form ask again.
  const refresh = () => router.refresh();
  const refreshPayments = () => {
    setMatches(null);
    refresh();
  };

  // ---- Payments -----------------------------------------------------------------------------

  /** Removes a payment (the inverse of recording one). */
  const removePayment = async (paymentId: string): Promise<boolean> => {
    try {
      await mutations.deletePayment.mutateAsync(paymentId);
      refreshPayments();
      return true;
    } catch {
      return false;
    }
  };

  /** Records a payment and offers Undo (which removes it). */
  const recordPayment = async (values: PaymentValues, message: string): Promise<boolean> => {
    try {
      const created = await mutations.addPayment.mutateAsync(buildPaymentRequest(values));
      showToast(message, { action: { label: 'Undo', onSelect: () => void removePayment(created.id) } });
      refreshPayments();
      return true;
    } catch {
      return false;
    }
  };

  const markPaid = (inst: InstallmentDto, values: Omit<PaymentValues, 'installmentSeq'>) =>
    recordPayment({ ...values, installmentSeq: inst.seq }, `Installment #${inst.seq} marked as paid`);

  const unlink = async (inst: InstallmentDto): Promise<boolean> => {
    const payment = inst.payment;
    if (!payment) return false;
    try {
      await mutations.deletePayment.mutateAsync(payment.id);
      showToast('Payment unlinked', {
        action: {
          label: 'Undo',
          onSelect: () =>
            void mutations.addPayment
              .mutateAsync(
                buildPaymentRequest({
                  installmentSeq: inst.seq,
                  paymentDate: payment.paymentDate,
                  amount: String(payment.amount),
                  transactionId: payment.transactionId,
                }),
              )
              .then(refreshPayments, () => undefined),
        },
      });
      refreshPayments();
      return true;
    } catch {
      return false;
    }
  };

  // ---- Matching -----------------------------------------------------------------------------

  const fetchMatches = async (): Promise<MatchSuggestionsResponse | null> => {
    const result = await watchSession(loadLoanMatches(loanId));
    if (!result.success) {
      showToast(result.error.message, { tone: 'danger' });
      return null;
    }
    setMatches(result.data);
    return result.data;
  };

  const findMatches = async () => {
    setMatchLoading(true);
    try {
      const found = await fetchMatches();
      if (found && nothingFound(found)) showToast(NO_MATCHES);
    } finally {
      setMatchLoading(false);
    }
  };

  const linkMatch = async (seq: number, date: string, amount: number, transactionId: string) => {
    const ok = await recordPayment(
      { installmentSeq: seq, paymentDate: date, amount: String(amount), transactionId },
      `Matched installment #${seq}`,
    );
    if (ok) await fetchMatches();
  };

  const confirmAll = async () => {
    if (!matches) return;
    const items = matches.suggestions
      .filter((s) => s.candidates.length > 0)
      .map((s) => paymentItemFor(s.installmentSeq, s.candidates[0]));
    if (items.length === 0) return;
    try {
      const result = await mutations.addPaymentsBatch.mutateAsync({ items } satisfies BatchLoanPaymentRequest);
      showToast(`${result.created === 1 ? "1 payment" : `${result.created} payments`} recorded`);
      refreshPayments();
      await fetchMatches();
    } catch {
      // onError already surfaced the toast.
    }
  };

  // ---- Events and charges -------------------------------------------------------------------

  const addEvent = async (values: EventValues): Promise<boolean> => {
    try {
      await mutations.addEvent.mutateAsync(buildEventRequest(values));
      showToast('Event recorded');
      refresh();
      return true;
    } catch {
      return false;
    }
  };

  const deleteEvent = async (eventId: string): Promise<boolean> => {
    try {
      await mutations.deleteEvent.mutateAsync(eventId);
      showToast('Event deleted');
      refresh();
      return true;
    } catch {
      return false;
    }
  };

  const addCharge = async (values: ChargeValues): Promise<boolean> => {
    try {
      await mutations.addCharge.mutateAsync(buildChargeRequest(values));
      showToast('Charge added');
      refresh();
      return true;
    } catch {
      return false;
    }
  };

  const deleteCharge = async (chargeId: string): Promise<boolean> => {
    try {
      await mutations.deleteCharge.mutateAsync(chargeId);
      showToast('Charge deleted');
      refresh();
      return true;
    } catch {
      return false;
    }
  };

  // ---- The loan itself ----------------------------------------------------------------------

  const closeLoan = async () => {
    try {
      await mutations.closeLoan.mutateAsync();
      showToast('Loan closed', {
        action: { label: 'Undo', onSelect: () => void mutations.reopenLoan.mutateAsync().then(refresh, () => undefined) },
      });
      refresh();
    } catch {
      // onError already surfaced the toast.
    }
  };

  const reopenLoan = async () => {
    try {
      await mutations.reopenLoan.mutateAsync();
      showToast('Loan reopened', {
        action: { label: 'Undo', onSelect: () => void mutations.closeLoan.mutateAsync().then(refresh, () => undefined) },
      });
      refresh();
    } catch {
      // onError already surfaced the toast.
    }
  };

  const deleteLoan = async (): Promise<boolean> => {
    try {
      await mutations.deleteLoan.mutateAsync();
      showToast('Loan deleted');
      router.push(appHref('/loans'));
      return true;
    } catch {
      return false;
    }
  };

  return {
    matches,
    matchLoading,
    fetchMatches,
    findMatches,
    linkMatch,
    confirmAll,
    markPaid,
    unlink,
    addEvent,
    deleteEvent,
    addCharge,
    deleteCharge,
    closeLoan,
    reopenLoan,
    deleteLoan,
    pending: {
      payment: mutations.addPayment.isPending,
      event: mutations.addEvent.isPending,
      charge: mutations.addCharge.isPending,
      deleteEvent: mutations.deleteEvent.isPending,
      deleteCharge: mutations.deleteCharge.isPending,
      deleteLoan: mutations.deleteLoan.isPending,
    },
  };
}

export type LoanDetailMutations = ReturnType<typeof useLoanDetailMutations>;

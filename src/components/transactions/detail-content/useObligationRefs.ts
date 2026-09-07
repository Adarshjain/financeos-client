'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { toast } from 'sonner';

import { api, ApiError } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';

/**
 * Unlink actions for the "Ledger & loans" group of obligation refs:
 * - LENDING: detach the transaction from the lending ledger entry (no confirm).
 * - LOAN_PAYMENT: delete the loan payment/settlement (confirmed by the caller
 *   via `ConfirmationDialog`) — the installment goes back to unpaid.
 * LOAN_EVENT / LOAN_CHARGE refs have no unlink action here; they're managed
 * from the loan itself.
 */
export function useObligationRefs(onCloseAndRefresh: () => void) {
  const queryClient = useQueryClient();
  const [unlinkingId, setUnlinkingId] = React.useState<string | null>(null);

  const unlinkLendingMutation = useMutation({
    mutationFn: (lendingId: string) =>
      api.DELETE('/api/v1/lendings/{id}/transaction', {
        params: { path: { id: lendingId } },
      }),
    onMutate: (lendingId: string) => setUnlinkingId(lendingId),
    onSuccess: () => {
      toast.success('Unlinked from ledger entry');
      queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      queryClient.invalidateQueries({ queryKey: keys.lendings.all });
      onCloseAndRefresh();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.response.message : 'Failed to unlink transaction');
    },
    onSettled: () => setUnlinkingId(null),
  });

  const handleUnlink = async (lendingId: string) => {
    await unlinkLendingMutation.mutateAsync(lendingId).catch(() => {
      // Error toast already shown by the mutation's onError handler.
    });
  };

  const unlinkLoanPaymentMutation = useMutation({
    mutationFn: ({ loanId, paymentId }: { loanId: string; paymentId: string }) =>
      api.DELETE('/api/v1/loans/{id}/payments/{paymentId}', {
        params: { path: { id: loanId, paymentId } },
      }),
    onMutate: ({ paymentId }: { loanId: string; paymentId: string }) => setUnlinkingId(paymentId),
    onSuccess: () => {
      toast.success('Settlement removed');
      queryClient.invalidateQueries({ queryKey: keys.loans.all });
      queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      onCloseAndRefresh();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.response.message : 'Failed to remove settlement');
    },
    onSettled: () => setUnlinkingId(null),
  });

  const handleUnlinkLoanPayment = async (loanId: string, paymentId: string) => {
    await unlinkLoanPaymentMutation.mutateAsync({ loanId, paymentId }).catch(() => {
      // Error toast already shown by the mutation's onError handler.
    });
  };

  return {
    unlinkingId,
    handleUnlink,
    handleUnlinkLoanPayment,
  };
}

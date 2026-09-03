'use client';

import { toast } from 'sonner';

import { useLoanMutations } from './useLoanMutations';
import { useLoanQueries } from './useLoanQueries';

interface UseLoanMatchActionsProps {
  matchSuggestions: ReturnType<typeof useLoanQueries>['matchSuggestions'];
  refetchMatches: ReturnType<typeof useLoanQueries>['refetchMatches'];
  mutations: Pick<ReturnType<typeof useLoanMutations>, 'addPayment' | 'addPaymentsBatch'>;
}

/**
 * Transaction-match confirmation handlers for the loan detail page — split out of
 * useLoanDetail to keep that hook under the file-length limit. No behaviour change.
 */
export function useLoanMatchActions({
  matchSuggestions,
  refetchMatches,
  mutations,
}: UseLoanMatchActionsProps) {
  const handleFindMatches = async () => {
    const result = await refetchMatches();
    if (
      result.data &&
      result.data.suggestions.every((s) => s.candidates.length === 0)
    ) {
      toast.info('No matching bank transactions found (±7 days)');
    }
  };

  const handleConfirmMatch = async (
    seq: number,
    date: string,
    amount: number,
    txId: string
  ) => {
    try {
      await mutations.addPayment.mutateAsync({
        installmentSeq: seq,
        paymentDate: date,
        amount,
        transactionId: txId,
      });
      toast.success(`Matched installment #${seq}`);
      await handleFindMatches();
    } catch {
      // onError already surfaced the toast.
    }
  };

  const handleConfirmAllMatches = async () => {
    if (!matchSuggestions) return;
    const itemsToConfirm = matchSuggestions.suggestions
      .filter((s) => s.candidates.length > 0)
      .map((s) => ({
        installmentSeq: s.installmentSeq,
        paymentDate: s.candidates[0].date,
        amount:
          s.candidates[0].amount < 0
            ? Math.abs(s.candidates[0].amount)
            : s.candidates[0].amount,
        transactionId: s.candidates[0].id,
      }));

    if (itemsToConfirm.length === 0) return;

    try {
      const result = await mutations.addPaymentsBatch.mutateAsync({
        items: itemsToConfirm,
      });
      toast.success(`Batch confirmed ${result.created} payments`);
      await handleFindMatches();
    } catch {
      // onError already surfaced the toast.
    }
  };

  return { handleFindMatches, handleConfirmMatch, handleConfirmAllMatches };
}

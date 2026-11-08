'use client';

import { useQuery } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import { loadPaymentCandidates } from '@/lib/query/actions/billActions';
import { keys } from '@/lib/query/keys';

/** Bank debits that could be the statement's payment, for `amount` (null = what is left to pay). */
export function usePaymentCandidates(statementId: string, amount: number | null, enabled: boolean) {
  return useQuery({
    queryKey: keys.bills.paymentCandidates(statementId, amount),
    queryFn: () => unwrapAction(loadPaymentCandidates(statementId, amount)),
    enabled: enabled && Boolean(statementId),
    staleTime: 0,
    gcTime: 0,
  });
}

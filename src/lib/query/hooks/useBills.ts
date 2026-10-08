'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { CardBillResponse, MarkBillPaidRequest, UpdateBillDetailsRequest } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';

/** Every open credit card's current bill, most urgent first (the dashboard "Bills due" card). */
export function useBills(initialData?: CardBillResponse[]) {
  return useQuery({
    queryKey: keys.bills.list(),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/bills');
      return data ?? [];
    },
    initialData,
  });
}

/** One statement's bill (the statements dialog). Disabled until a statement id is known. */
export function useBill(statementId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: keys.bills.byStatement(statementId ?? ''),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/bills/{statementId}', {
        params: { path: { statementId: statementId as string } },
      });
      return data ?? null;
    },
    enabled: enabled && Boolean(statementId),
  });
}

/**
 * The three actions on a bill. Each returns the recomputed bill; the list and the per-statement
 * entry are invalidated so the dashboard card and the statements dialog agree.
 */
export function useBillMutations() {
  const qc = useQueryClient();
  const settle = (bill: CardBillResponse) => {
    qc.setQueryData(keys.bills.byStatement(bill.statementId), bill);
    return qc.invalidateQueries({ queryKey: keys.bills.all });
  };

  const markPaid = useMutation({
    mutationFn: ({ statementId, body }: { statementId: string; body?: MarkBillPaidRequest }) =>
      api
        .POST('/api/v1/bills/{statementId}/mark-paid', { params: { path: { statementId } }, body: body ?? {} })
        .then((r) => r.data!),
    onSuccess: settle,
  });

  const unmarkPaid = useMutation({
    mutationFn: (statementId: string) =>
      api.DELETE('/api/v1/bills/{statementId}/mark-paid', { params: { path: { statementId } } }).then((r) => r.data!),
    onSuccess: settle,
  });

  const updateDetails = useMutation({
    mutationFn: ({ statementId, body }: { statementId: string; body: UpdateBillDetailsRequest }) =>
      api
        .PATCH('/api/v1/bills/{statementId}/details', { params: { path: { statementId } }, body })
        .then((r) => r.data!),
    onSuccess: settle,
  });

  return { markPaid, unmarkPaid, updateDetails };
}

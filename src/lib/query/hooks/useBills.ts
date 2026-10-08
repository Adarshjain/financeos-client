'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { CardBillResponse, MarkBillPaidRequest, UpdateBillDetailsRequest } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';

/**
 * Every open credit card's current bill (the "Bills due" widget), or one card's when `accountId`
 * is given. Cards with no live statement come back as AWAITING_STATEMENT with their unbilled spend.
 */
export function useBills(initialData?: CardBillResponse[], options: { accountId?: string | null } = {}) {
  const accountId = options.accountId ?? null;
  return useQuery({
    queryKey: keys.bills.list(accountId ? { accountId } : {}),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/bills', {
        params: { query: accountId ? { accountId } : {} },
      });
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
 * entry are invalidated so the widget and the statements dialog agree, and so are the inbox,
 * the upcoming obligations and the template dashboard widgets that surface bills.
 */
export function useBillMutations() {
  const qc = useQueryClient();
  const settle = (bill: CardBillResponse) => {
    if (bill.statementId) qc.setQueryData(keys.bills.byStatement(bill.statementId), bill);
    return Promise.all([
      qc.invalidateQueries({ queryKey: keys.bills.all }),
      qc.invalidateQueries({ queryKey: keys.inbox.all }),
      qc.invalidateQueries({ queryKey: keys.obligations.all }),
      qc.invalidateQueries({ queryKey: [...keys.dashboards.all, 'widget'] }),
    ]);
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

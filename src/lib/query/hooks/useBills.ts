'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import type { CardBillResponse, MarkBillPaidRequest, UpdateBillDetailsRequest } from '@/lib/api/types';
import { loadBill, loadBills, markBillPaid, unmarkBillPaid, updateBillDetails } from '@/lib/query/actions/bills';
import { keys } from '@/lib/query/keys';

/**
 * Every open credit card's current bill (the "Bills due" widget), or one card's when `accountId`
 * is given. Cards with no live statement come back as AWAITING_STATEMENT with their unbilled spend.
 */
export function useBills(initialData?: CardBillResponse[], options: { accountId?: string | null } = {}) {
  const accountId = options.accountId ?? null;
  return useQuery({
    queryKey: keys.bills.list(accountId ? { accountId } : {}),
    queryFn: () => unwrapAction(loadBills(accountId)),
    initialData,
  });
}

/** One statement's bill (the statements dialog). Disabled until a statement id is known. */
export function useBill(statementId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: keys.bills.byStatement(statementId ?? ''),
    queryFn: () => unwrapAction(loadBill(statementId as string)),
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
      unwrapAction(markBillPaid(statementId, body ?? {})),
    onSuccess: settle,
  });

  const unmarkPaid = useMutation({
    mutationFn: (statementId: string) => unwrapAction(unmarkBillPaid(statementId)),
    onSuccess: settle,
  });

  const updateDetails = useMutation({
    mutationFn: ({ statementId, body }: { statementId: string; body: UpdateBillDetailsRequest }) =>
      unwrapAction(updateBillDetails(statementId, body)),
    onSuccess: settle,
  });

  return { markPaid, unmarkPaid, updateDetails };
}

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';

import { linkDividendCredit, setDividendReceiptNote, unlinkDividendCredit } from './dividendsActions';
import type { ReceiptNote } from './dividendsModel';

/**
 * The receipt of a dividend payout: link or unlink the bank credit it landed as, or set the receipt note.
 * Shared by the Dinero form and the Legacy edit dialog. Toasts are the caller's; after a change it calls
 * `refresh()` to re-read the investment and transaction queries.
 */
export function useDividendReceiptMutations() {
  const qc = useQueryClient();

  const refresh = async () => {
    await Promise.all([invalidateInvestmentQueries(qc), qc.invalidateQueries({ queryKey: keys.transactions.all })]);
  };

  const link = useMutation({
    mutationFn: (vars: { id: string; transactionId: string; updateTds?: boolean }) =>
      unwrapAction(linkDividendCredit(vars.id, vars.transactionId, vars.updateTds ?? false)),
  });
  const unlink = useMutation({
    mutationFn: (id: string) => unwrapAction(unlinkDividendCredit(id)),
  });
  const setNote = useMutation({
    mutationFn: (vars: { id: string; note: ReceiptNote }) => unwrapAction(setDividendReceiptNote(vars.id, vars.note)),
  });

  return {
    link,
    unlink,
    setNote,
    refresh,
    /** True while any receipt change (link, unlink, note) is in flight. */
    busy: link.isPending || unlink.isPending || setNote.isPending,
  };
}

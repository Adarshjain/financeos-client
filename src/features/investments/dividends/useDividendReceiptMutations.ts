'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import type { Dividend } from '@/lib/types';

import type { ReceiptNote } from './dividendsModel';

/**
 * The receipt of a dividend payout: link or unlink the bank credit it landed as, or set the receipt note.
 * Shared by the Dinero form and the Legacy edit dialog. Toasts are the caller's; after a change it calls
 * `refresh()` to re-read the investment and transaction queries.
 */
export function useDividendReceiptMutations() {
  const qc = useQueryClient();
  const path = (id: string) => ({ params: { path: { id } } });

  const refresh = async () => {
    await Promise.all([invalidateInvestmentQueries(qc), qc.invalidateQueries({ queryKey: keys.transactions.all })]);
  };

  const link = useMutation({
    mutationFn: async (vars: { id: string; transactionId: string; updateTds?: boolean }) =>
      (
        await api.PUT('/api/v1/investments/dividends/{id}/transaction', {
          ...path(vars.id),
          body: { transactionId: vars.transactionId, updateTds: vars.updateTds ?? false },
        })
      ).data as Dividend,
  });
  const unlink = useMutation({
    mutationFn: async (id: string) => {
      await api.DELETE('/api/v1/investments/dividends/{id}/transaction', path(id));
    },
  });
  const setNote = useMutation({
    mutationFn: async (vars: { id: string; note: ReceiptNote }) =>
      (
        await api.PUT('/api/v1/investments/dividends/{id}/receipt-status', {
          ...path(vars.id),
          body: { status: vars.note === 'derived' ? null : vars.note },
        })
      ).data as Dividend,
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

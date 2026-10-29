'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { unwrapAction } from '@/lib/actionResult';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';

import {
  createEpfEmployer,
  createEpfEntry,
  deleteEpfEntry,
  dismissEpfSuggestion,
  type EpfEmployerBody,
  linkEpfEntryCredit,
  unlinkEpfEntryCredit,
  updateEpfEmployer,
  updateEpfEntry,
} from './epfActions';
import type { EpfEntryRequest } from './epfModel';

/**
 * Everything the user changes on the EPF tab: entries, employers, and the bank credit of a withdrawal. After a
 * change `refresh()` re-reads the investment and transaction queries and the page.
 */
export function useEpfMutations() {
  const qc = useQueryClient();
  const router = useRouter();

  const refresh = async () => {
    await Promise.all([
      invalidateInvestmentQueries(qc),
      qc.invalidateQueries({ queryKey: keys.transactions.all }),
      qc.invalidateQueries({ queryKey: keys.epf.all }),
      qc.invalidateQueries({ queryKey: keys.inbox.all }),
    ]);
    router.refresh();
  };

  const createEntry = useMutation({
    mutationFn: (body: EpfEntryRequest) => unwrapAction(createEpfEntry(body)),
  });
  const updateEntry = useMutation({
    mutationFn: (vars: { id: string; body: EpfEntryRequest }) => unwrapAction(updateEpfEntry(vars.id, vars.body)),
  });
  const deleteEntry = useMutation({
    mutationFn: (id: string) => unwrapAction(deleteEpfEntry(id)),
  });
  const link = useMutation({
    mutationFn: (vars: { id: string; transactionId: string; recordTds?: boolean }) =>
      unwrapAction(linkEpfEntryCredit(vars.id, vars.transactionId, vars.recordTds ?? false)),
  });
  const unlink = useMutation({
    mutationFn: (id: string) => unwrapAction(unlinkEpfEntryCredit(id)),
  });
  const dismiss = useMutation({
    mutationFn: (vars: { id: string; transactionId: string }) => unwrapAction(dismissEpfSuggestion(vars.id, vars.transactionId)),
  });
  const createEmployer = useMutation({
    mutationFn: (body: EpfEmployerBody) => unwrapAction(createEpfEmployer(body)),
  });
  const updateEmployer = useMutation({
    mutationFn: (vars: { id: string; body: EpfEmployerBody }) => unwrapAction(updateEpfEmployer(vars.id, vars.body)),
  });

  return {
    createEntry,
    updateEntry,
    deleteEntry,
    link,
    unlink,
    dismiss,
    createEmployer,
    updateEmployer,
    refresh,
    /** True while a change to the bank credit (link, unlink, not this one) is in flight. */
    creditBusy: link.isPending || unlink.isPending || dismiss.isPending,
  };
}

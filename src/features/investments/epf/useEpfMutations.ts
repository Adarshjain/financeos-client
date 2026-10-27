'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { api } from '@/lib/api/client';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';

import type { EpfEmployer, EpfEntry, EpfEntryRequest } from './epfModel';

type EmployerBody = { name: string; memberId?: string | null; joinedOn?: string | null; leftOn?: string | null };

/**
 * Everything the user changes on the EPF tab: entries, employers, and the bank credit of a withdrawal. After a
 * change `refresh()` re-reads the investment and transaction queries and the page.
 */
export function useEpfMutations() {
  const qc = useQueryClient();
  const router = useRouter();
  const path = (id: string) => ({ params: { path: { id } } });

  const refresh = async () => {
    await Promise.all([
      invalidateInvestmentQueries(qc),
      qc.invalidateQueries({ queryKey: keys.transactions.all }),
      qc.invalidateQueries({ queryKey: ['epf'] }),
      qc.invalidateQueries({ queryKey: keys.inbox.all }),
    ]);
    router.refresh();
  };

  const createEntry = useMutation({
    mutationFn: async (body: EpfEntryRequest) => (await api.POST('/api/v1/epf/entries', { body })).data as EpfEntry,
  });
  const updateEntry = useMutation({
    mutationFn: async (vars: { id: string; body: EpfEntryRequest }) =>
      (await api.PUT('/api/v1/epf/entries/{id}', { ...path(vars.id), body: vars.body })).data as EpfEntry,
  });
  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      await api.DELETE('/api/v1/epf/entries/{id}', path(id));
    },
  });
  const link = useMutation({
    mutationFn: async (vars: { id: string; transactionId: string; recordTds?: boolean }) =>
      (
        await api.PUT('/api/v1/epf/entries/{id}/transaction', {
          ...path(vars.id),
          body: { transactionId: vars.transactionId, recordTds: vars.recordTds ?? false },
        })
      ).data as EpfEntry,
  });
  const unlink = useMutation({
    mutationFn: async (id: string) => {
      await api.DELETE('/api/v1/epf/entries/{id}/transaction', path(id));
    },
  });
  const dismiss = useMutation({
    mutationFn: async (vars: { id: string; transactionId: string }) => {
      await api.POST('/api/v1/epf/entries/{id}/suggestion/dismiss', { ...path(vars.id), body: { transactionId: vars.transactionId } });
    },
  });
  const createEmployer = useMutation({
    mutationFn: async (body: EmployerBody) => (await api.POST('/api/v1/epf/employers', { body })).data as EpfEmployer,
  });
  const updateEmployer = useMutation({
    mutationFn: async (vars: { id: string; body: EmployerBody }) =>
      (await api.PUT('/api/v1/epf/employers/{id}', { ...path(vars.id), body: vars.body })).data as EpfEmployer,
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

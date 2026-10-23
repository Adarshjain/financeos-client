'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { api } from '@/lib/api/client';
import type { CreateDividendRequest, UpdateDividendRequest } from '@/lib/api/types';
import type { Dividend } from '@/lib/types';

import { useDividendReceiptMutations } from './useDividendReceiptMutations';

/**
 * Everything the user changes on a dividend: record, edit, delete, link or unlink the bank credit, set the
 * receipt note. After each change the investment and transaction queries refresh and the page re-reads.
 */
export function useDividendMutations() {
  const router = useRouter();

  const receipt = useDividendReceiptMutations();
  const { link, unlink, setNote } = receipt;

  const refresh = async () => {
    await receipt.refresh();
    router.refresh();
  };
  const path = (id: string) => ({ params: { path: { id } } });

  const create = useMutation({
    mutationFn: async (body: CreateDividendRequest) => (await api.POST('/api/v1/investments/dividends', { body })).data as Dividend,
  });
  const update = useMutation({
    mutationFn: async (vars: { id: string; body: UpdateDividendRequest }) =>
      (await api.PUT('/api/v1/investments/dividends/{id}', { ...path(vars.id), body: vars.body })).data as Dividend,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.DELETE('/api/v1/investments/dividends/{id}', path(id));
    },
  });
  return {
    create,
    update,
    remove,
    link,
    unlink,
    setNote,
    refresh,
    /** True while any receipt change (link, unlink, note) is in flight. */
    receiptBusy: receipt.busy,
  };
}

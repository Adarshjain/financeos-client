'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { unwrapAction } from '@/lib/actionResult';
import type { CreateDividendRequest, UpdateDividendRequest } from '@/lib/api/types';

import { createDividend, deleteDividend, updateDividend } from './dividendsActions';
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

  const create = useMutation({
    mutationFn: (body: CreateDividendRequest) => unwrapAction(createDividend(body)),
  });
  const update = useMutation({
    mutationFn: (vars: { id: string; body: UpdateDividendRequest }) => unwrapAction(updateDividend(vars.id, vars.body)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => unwrapAction(deleteDividend(id)),
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

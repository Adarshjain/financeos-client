'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import type { HeldUpload } from '@/lib/api/types';
import { invalidateMoneyQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';

import { assignHeldUpload, deleteHeldUpload, listHeldUploads } from './importActions';

/** The statement files waiting for an account, and the two things to do with one. */
export function useHeldUploads(initialData?: HeldUpload[]) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: keys.heldUploads.all,
    queryFn: () => unwrapAction(listHeldUploads()),
    initialData,
  });

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.heldUploads.all }),
      qc.invalidateQueries({ queryKey: keys.inbox.all }),
      qc.invalidateQueries({ queryKey: keys.shell.counts() }),
    ]).then(() => undefined);

  /** Imports the file into the account; throws the server's answer (a 422 carries a password code). */
  const assign = async (id: string, accountId: string, password?: string) => {
    const result = await unwrapAction(assignHeldUpload(id, accountId, password));
    const file = result.fileDetails?.[0];
    // Any other failure leaves the file held, so the caller can try another account.
    if (file?.status === 'FAILED') return { ok: false as const, message: file.errorMessage, filename: file.filename };
    await Promise.all([
      refresh(),
      qc.invalidateQueries({ queryKey: keys.transactions.all }),
      qc.invalidateQueries({ queryKey: keys.statements.all }),
      qc.invalidateQueries({ queryKey: keys.jobs.all }),
      invalidateMoneyQueries(qc),
    ]);
    return { ok: true as const, filename: file?.filename };
  };

  const remove = async (id: string) => {
    await unwrapAction(deleteHeldUpload(id));
    await refresh();
  };

  return { held: query.data ?? [], assign, remove };
}

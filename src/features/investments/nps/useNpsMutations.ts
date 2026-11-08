'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import { useAppRouter } from '@/lib/useAppRouter';

import {
  addNpsGmailDetection,
  createNpsAccount,
  createNpsEntry,
  deleteNpsStatement,
  ignoreNpsGmailDetection,
  replaceNpsAllocation,
  retryNpsGmailImports,
  unlockNpsGmailStatements,
  updateNpsAccount,
} from './npsActions';
import { scheduleNpsImportRefetch } from './npsImportRefetch';
import type { NpsAccountRequest, NpsAllocationRequest, NpsEntryRequest } from './npsModel';

/** Everything the user changes on the NPS tab. After a change `refresh()` re-reads the investment queries and the page. */
export function useNpsMutations() {
  const qc = useQueryClient();
  const router = useAppRouter();

  const refresh = async () => {
    await Promise.all([invalidateInvestmentQueries(qc), qc.invalidateQueries({ queryKey: keys.nps.all })]);
    router.refresh();
  };

  const refreshAfterImport = () => scheduleNpsImportRefetch(qc);

  const createAccount = useMutation({ mutationFn: (body: NpsAccountRequest) => unwrapAction(createNpsAccount(body)) });
  const updateAccount = useMutation({ mutationFn: (vars: { id: string; body: NpsAccountRequest }) => unwrapAction(updateNpsAccount(vars.id, vars.body)) });
  const replaceAllocation = useMutation({ mutationFn: (vars: { id: string; body: NpsAllocationRequest }) => unwrapAction(replaceNpsAllocation(vars.id, vars.body)) });
  const createEntry = useMutation({ mutationFn: (body: NpsEntryRequest) => unwrapAction(createNpsEntry(body)) });

  const deleteStatement = useMutation({ mutationFn: (id: string) => unwrapAction(deleteNpsStatement(id)) });

  const unlockLocked = useMutation({ mutationFn: (password: string) => unwrapAction(unlockNpsGmailStatements(password)) });
  const retryFailed = useMutation({ mutationFn: () => unwrapAction(retryNpsGmailImports()) });
  const addDetection = useMutation({ mutationFn: (vars: { key: string; relation: 'SELF' | 'CHILD' }) => unwrapAction(addNpsGmailDetection(vars.key, vars.relation)) });
  const ignoreDetection = useMutation({ mutationFn: (key: string) => unwrapAction(ignoreNpsGmailDetection(key)) });

  return { unlockLocked, retryFailed, addDetection, ignoreDetection, createAccount, updateAccount, replaceAllocation, createEntry, deleteStatement, refresh, refreshAfterImport };
}

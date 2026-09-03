'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Account, AccountRequest, CloseAccountRequest } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { Schemas } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import { GmailCleanupPreview, GmailCleanupResult } from '@/lib/types';

/**
 * Every account-lifecycle mutation the account form (and its danger-zone /
 * lifecycle sub-sections) needs. Split out of `useAccountForm` purely to keep
 * that file under the line-count limit — no behaviour change.
 */
export function useAccountFormMutations() {
  const qc = useQueryClient();
  const invalidateAccounts = () => qc.invalidateQueries({ queryKey: keys.accounts.all });
  const invalidateAccountsAndTransactions = () => {
    invalidateAccounts();
    qc.invalidateQueries({ queryKey: keys.transactions.all });
  };

  const createAccountMutation = useMutation({
    mutationFn: (body: AccountRequest) =>
      api.POST('/api/v1/accounts', { body: body as Schemas['BankAccountRequest'] }).then((r) => r.data as Account),
    onSuccess: invalidateAccounts,
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: AccountRequest }) =>
      api
        .PUT('/api/v1/accounts/{id}', { params: { path: { id } }, body: body as Schemas['BankAccountRequest'] })
        .then((r) => r.data as Account),
    onSuccess: invalidateAccounts,
  });

  const closeAccountMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body?: CloseAccountRequest }) =>
      api.POST('/api/v1/accounts/{id}/close', { params: { path: { id } }, body }).then((r) => r.data as Account),
    onSuccess: invalidateAccountsAndTransactions,
  });

  const reopenAccountMutation = useMutation({
    mutationFn: (id: string) =>
      api.POST('/api/v1/accounts/{id}/reopen', { params: { path: { id } } }).then((r) => r.data as Account),
    onSuccess: invalidateAccountsAndTransactions,
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id: string) => api.DELETE('/api/v1/accounts/{id}', { params: { path: { id } } }),
    onSuccess: invalidateAccounts,
  });

  const previewGmailCleanupMutation = useMutation({
    mutationFn: ({ accountId, before }: { accountId: string; before: string }) =>
      api
        .GET('/api/v1/accounts/{id}/gmail-cleanup-preview', { params: { path: { id: accountId }, query: { before } } })
        .then((r) => r.data as GmailCleanupPreview),
  });

  const executeGmailCleanupMutation = useMutation({
    mutationFn: ({ accountId, before }: { accountId: string; before: string }) =>
      api
        .POST('/api/v1/accounts/{id}/gmail-cleanup', { params: { path: { id: accountId }, query: { before } } })
        .then((r) => r.data as GmailCleanupResult),
    onSuccess: invalidateAccountsAndTransactions,
  });

  return {
    createAccountMutation,
    updateAccountMutation,
    closeAccountMutation,
    reopenAccountMutation,
    deleteAccountMutation,
    previewGmailCleanupMutation,
    executeGmailCleanupMutation,
  };
}

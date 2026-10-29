'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { AccountRequest, CloseAccountRequest } from '@/lib/account.types';
import { unwrapAction } from '@/lib/actionResult';
import { invalidateMoneyQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';

import {
  closeAccount,
  createAccountWithIdentifiers,
  deleteAccount,
  executeGmailCleanup,
  previewGmailCleanup,
  reopenAccount,
  updateAccount,
} from '../actions';

/**
 * Every account-lifecycle mutation the account form (and its danger-zone /
 * lifecycle sub-sections) needs. Split out of `useAccountForm` purely to keep
 * that file under the line-count limit — no behaviour change.
 */
export function useAccountFormMutations() {
  const qc = useQueryClient();
  // Balances, the emergency fund (liquid accounts) and dashboard widgets all follow the account list.
  const invalidateAccounts = () => invalidateMoneyQueries(qc);
  const invalidateAccountsAndTransactions = () => {
    invalidateAccounts();
    qc.invalidateQueries({ queryKey: keys.transactions.all });
  };

  const createAccountMutation = useMutation({
    // Creates the account, then saves any identifier aliases collected in the create form (alias failures
    // come back as `failedIdentifiers`; see `createAccountWithIdentifiers`).
    mutationFn: ({ body, identifiers = [] }: { body: AccountRequest; identifiers?: string[] }) =>
      unwrapAction(createAccountWithIdentifiers(body, identifiers)),
    onSuccess: invalidateAccounts,
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: AccountRequest }) => unwrapAction(updateAccount(id, body)),
    onSuccess: invalidateAccounts,
  });

  const closeAccountMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body?: CloseAccountRequest }) => unwrapAction(closeAccount(id, body)),
    onSuccess: invalidateAccountsAndTransactions,
  });

  const reopenAccountMutation = useMutation({
    mutationFn: (id: string) => unwrapAction(reopenAccount(id)),
    onSuccess: invalidateAccountsAndTransactions,
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id: string) => unwrapAction(deleteAccount(id)),
    onSuccess: invalidateAccounts,
  });

  const previewGmailCleanupMutation = useMutation({
    mutationFn: ({ accountId, before }: { accountId: string; before: string }) =>
      unwrapAction(previewGmailCleanup(accountId, before)),
  });

  const executeGmailCleanupMutation = useMutation({
    mutationFn: ({ accountId, before }: { accountId: string; before: string }) =>
      unwrapAction(executeGmailCleanup(accountId, before)),
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

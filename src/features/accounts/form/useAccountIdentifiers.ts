'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import type { AccountIdentifierResponse, CreateAccountIdentifierRequest } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';

import { addAccountIdentifier, loadAccountIdentifiers, removeAccountIdentifier } from '../actions';

export function useAccountIdentifiers(accountId?: string) {
  const qc = useQueryClient();
  const queryKey = accountId ? keys.accounts.identifiers(accountId) : (['accounts', 'identifiers'] as const);

  const query = useQuery<AccountIdentifierResponse[]>({
    queryKey,
    queryFn: async () => {
      if (!accountId) return [];
      return unwrapAction(loadAccountIdentifiers(accountId));
    },
    enabled: Boolean(accountId),
  });

  const createMutation = useMutation({
    mutationFn: async (body: CreateAccountIdentifierRequest) => {
      if (!accountId) throw new Error('Account ID is required');
      return unwrapAction(addAccountIdentifier(accountId, body));
    },
    onSuccess: () => {
      if (accountId) {
        qc.invalidateQueries({ queryKey: keys.accounts.identifiers(accountId) });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (identifierId: string) => {
      if (!accountId) throw new Error('Account ID is required');
      await unwrapAction(removeAccountIdentifier(accountId, identifierId));
    },
    onSuccess: () => {
      if (accountId) {
        qc.invalidateQueries({ queryKey: keys.accounts.identifiers(accountId) });
      }
    },
  });

  return {
    identifiers: query.data ?? [],
    isLoading: query.isLoading,
    createIdentifier: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    deleteIdentifier: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

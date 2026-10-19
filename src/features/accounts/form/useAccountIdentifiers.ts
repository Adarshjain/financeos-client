'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { AccountIdentifierResponse, CreateAccountIdentifierRequest } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';

export function useAccountIdentifiers(accountId?: string) {
  const qc = useQueryClient();
  const queryKey = accountId ? keys.accounts.identifiers(accountId) : (['accounts', 'identifiers'] as const);

  const query = useQuery<AccountIdentifierResponse[]>({
    queryKey,
    queryFn: async () => {
      if (!accountId) return [];
      const { data } = await api.GET('/api/v1/accounts/{id}/identifiers', {
        params: { path: { id: accountId } },
      });
      return data ?? [];
    },
    enabled: Boolean(accountId),
  });

  const createMutation = useMutation({
    mutationFn: async (body: CreateAccountIdentifierRequest) => {
      if (!accountId) throw new Error('Account ID is required');
      const { data } = await api.POST('/api/v1/accounts/{id}/identifiers', {
        params: { path: { id: accountId } },
        body,
      });
      return data;
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
      await api.DELETE('/api/v1/accounts/{id}/identifiers/{identifierId}', {
        params: { path: { id: accountId, identifierId } },
      });
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

'use client';

import { useQuery } from '@tanstack/react-query';

import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';

/**
 * The wire type is the generated `AccountResponse` discriminated union; the app still models
 * accounts with its own `Account` union. Narrow once here, at the boundary, from `unknown`.
 */
function asAccounts(raw: unknown): Account[] {
  return (raw ?? []) as Account[];
}

function asAccount(raw: unknown): Account | null {
  return (raw ?? null) as Account | null;
}

export function useAccounts(initialData?: Account[]) {
  const query = useQuery<Account[]>({
    queryKey: keys.accounts.list(),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/accounts');
      return asAccounts(data);
    },
    initialData,
  });

  return query;
}

export function useAccount(id: string, initialData?: Account) {
  const query = useQuery<Account | null>({
    queryKey: keys.accounts.byId(id),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/accounts/{id}', {
        params: { path: { id } },
      });
      return asAccount(data);
    },
    enabled: Boolean(id),
    initialData,
  });

  return query;
}

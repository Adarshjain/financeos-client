'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';

export interface AccountTabCounts {
  cards: number;
  statements: number;
  transactions: number;
}

/** The tab and transaction counts, loaded after the page renders; undefined until they arrive (or if the request fails). */
export function useAccountTabCounts(accountId: string): AccountTabCounts | undefined {
  const { data } = useQuery({
    queryKey: [...keys.accounts.all, 'tabCounts', accountId],
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/accounts/{id}/tab-counts', {
        params: { path: { id: accountId } },
      });
      return data ?? null;
    },
  });
  return data ?? undefined;
}

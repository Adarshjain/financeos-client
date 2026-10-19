'use client';

import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';

export interface AccountTabCounts {
  cards: number;
  statements: number;
  transactions: number;
}

/**
 * The tab and transaction counts, loaded after the page renders; undefined until they arrive (or if the request fails).
 * Always undefined on the server render and the first client render, even when the query cache already has data, so hydration matches.
 */
export function useAccountTabCounts(accountId: string): AccountTabCounts | undefined {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const { data } = useQuery({
    queryKey: [...keys.accounts.all, 'tabCounts', accountId],
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/accounts/{id}/tab-counts', {
        params: { path: { id: accountId } },
      });
      return data ?? null;
    },
  });
  return mounted ? (data ?? undefined) : undefined;
}

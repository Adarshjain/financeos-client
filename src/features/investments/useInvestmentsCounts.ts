'use client';

import { useQuery } from '@tanstack/react-query';

import { watchSession } from '@/lib/authExpiry';
import { keys } from '@/lib/query/keys';

import { loadTabCounts } from './tabCountsActions';

/** The tab counts, through a server action. The key sits under the investments keys, so every investment mutation refreshes them. */
export function useInvestmentsCounts() {
  return useQuery({
    queryKey: [...keys.investments.all, 'tab-counts'],
    queryFn: async () => {
      const result = await watchSession(loadTabCounts());
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
  });
}

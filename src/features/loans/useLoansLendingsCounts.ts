'use client';

import { useQuery } from '@tanstack/react-query';

import { watchSession } from '@/lib/authExpiry';
import { keys } from '@/lib/query/keys';

import { loadTabCounts } from './tabCountsActions';

/**
 * The tab counts, through a server action. The key sits under the loans summary, so every loan and
 * lending mutation (which refreshes that summary) refreshes the counts too.
 */
export function useLoansLendingsCounts() {
  return useQuery({
    queryKey: [...keys.loans.summary(), 'tab-counts'],
    queryFn: async () => {
      const result = await watchSession(loadTabCounts());
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
  });
}

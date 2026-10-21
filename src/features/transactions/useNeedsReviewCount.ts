'use client';

import { type QueryClient, useQuery } from '@tanstack/react-query';

import { loadNeedsReviewCount } from '@/features/transactions/list/transactionsActions';
import { keys } from '@/lib/query/keys';

/**
 * How many transactions need review, through a server action: the Transactions badge on the rail and tab
 * bar. The list page already reads this number for its "Needs review" chip and seeds the same key, so it
 * does not ask twice.
 */
export function useNeedsReviewCount() {
  return useQuery({
    queryKey: keys.transactions.needsReviewCount(),
    queryFn: async () => {
      const result = await loadNeedsReviewCount();
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

/**
 * Puts a count the server page already has into the cache. `initial` is for render: it only fills an empty
 * entry nobody observes yet (so a mounted badge is never updated mid-render) and lands before the nav's
 * effects subscribe, so the badge finds fresh data and does not fetch. Later changes use `update`.
 */
export function seedNeedsReviewCount(queryClient: QueryClient, count: number, mode: 'initial' | 'update') {
  const key = keys.transactions.needsReviewCount();
  if (mode === 'update') {
    queryClient.setQueryData(key, count);
    return;
  }
  const query = queryClient.getQueryCache().find({ queryKey: key });
  if (queryClient.getQueryData(key) === undefined && (query?.getObserversCount() ?? 0) === 0) {
    queryClient.setQueryData(key, count);
  }
}

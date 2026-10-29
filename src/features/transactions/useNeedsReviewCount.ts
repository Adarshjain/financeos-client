'use client';

import { type QueryClient, useQuery } from '@tanstack/react-query';

import { loadNeedsReviewCount } from '@/features/transactions/list/transactionsActions';
import { watchSession } from '@/lib/authExpiry';
import { useShellCounts } from '@/lib/query/hooks/useShellCounts';
import { keys } from '@/lib/query/keys';

/**
 * How many transactions need review, through a server action: the Transactions badge on the rail and tab
 * bar. The list page already reads this number for its "Needs review" chip and seeds the same key, so it
 * does not ask twice. `shell` is for the shell's badges: they own the one combined poll (`useShellCounts`) that
 * loads and refreshes this entry, so this hook neither polls nor fetches until that has answered (it then fetches
 * only if the shell call left this entry empty).
 */
export function useNeedsReviewCount({ shell = false }: { shell?: boolean } = {}) {
  const shellCounts = useShellCounts({ enabled: shell, poll: shell });
  return useQuery({
    queryKey: keys.transactions.needsReviewCount(),
    queryFn: async () => {
      const result = await watchSession(loadNeedsReviewCount());
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !shell || shellCounts.status !== 'pending',
    refetchInterval: shell ? false : 60_000,
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

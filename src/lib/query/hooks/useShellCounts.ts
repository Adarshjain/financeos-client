'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import type { ShellCounts } from '@/lib/api/types';
import { loadShellCounts } from '@/lib/query/actions/shellActions';
import { keys } from '@/lib/query/keys';

/**
 * The shell's badge counts in one request, so they do not queue behind each other as three server actions.
 * Each part that came back seeds the cache entry its own hook reads (inbox summary, notification summary, the
 * needs-review count); a part that is null (it failed server-side) seeds nothing, like a failed fetch of its own.
 * Those hooks keep their own fetch for invalidation. Only the shell's hooks turn this on (`enabled`); one of them polls.
 */
export function useShellCounts({ enabled = true, poll = false }: { enabled?: boolean; poll?: boolean } = {}) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: keys.shell.counts(),
    queryFn: async (): Promise<ShellCounts> => {
      const counts = await unwrapAction(loadShellCounts());
      if (counts.inbox != null) qc.setQueryData(keys.inbox.summary(), counts.inbox);
      if (counts.notificationsUnread != null) qc.setQueryData(keys.notifications.summary(), { unread: counts.notificationsUnread });
      if (counts.needsReview != null) qc.setQueryData(keys.transactions.needsReviewCount(), counts.needsReview);
      return counts;
    },
    enabled,
    refetchInterval: poll ? 60_000 : false,
    staleTime: 30_000,
    refetchOnWindowFocus: poll,
  });
}

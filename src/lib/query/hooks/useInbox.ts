'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import type { InboxResponse, InboxSummaryResponse } from '@/lib/api/types';
import { loadInbox, loadInboxSummary } from '@/lib/query/actions/inboxActions';
import { useShellCounts } from '@/lib/query/hooks/useShellCounts';
import { keys } from '@/lib/query/keys';

/**
 * The inbox: every grouped action row, most urgent first. Refetches on window focus so a bill
 * paid in another tab drops out when the user comes back. Each fetch also refreshes the
 * summary entry, so the nav badge never disagrees with the page the user is looking at.
 */
export function useInbox() {
  const qc = useQueryClient();
  return useQuery({
    queryKey: keys.inbox.list(),
    queryFn: async (): Promise<InboxResponse> => {
      const inbox = await unwrapAction(loadInbox());
      qc.setQueryData(keys.inbox.summary(), inbox.summary);
      return inbox;
    },
    refetchOnWindowFocus: true,
  });
}

/**
 * The badge counts behind the Inbox nav entries; polled once a minute. `shell` is for the /ds shell: its one combined
 * poll (`useShellCounts`) loads and refreshes this entry, so this hook neither polls nor fetches until that has answered
 * (it then fetches only if the shell call left this entry empty).
 */
export function useInboxSummary({ shell = false }: { shell?: boolean } = {}) {
  const shellCounts = useShellCounts({ enabled: shell });
  return useQuery({
    queryKey: keys.inbox.summary(),
    queryFn: async (): Promise<InboxSummaryResponse> => {
      return unwrapAction(loadInboxSummary());
    },
    enabled: !shell || shellCounts.status !== 'pending',
    refetchInterval: shell ? false : 60_000,
    staleTime: 30_000,
  });
}

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { InboxResponse, InboxSummaryResponse } from '@/lib/api/types';
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
      const { data } = await api.GET('/api/v1/inbox');
      const inbox = data as InboxResponse;
      qc.setQueryData(keys.inbox.summary(), inbox.summary);
      return inbox;
    },
    refetchOnWindowFocus: true,
  });
}

/** The badge counts behind the Inbox nav entries; polled once a minute. */
export function useInboxSummary() {
  return useQuery({
    queryKey: keys.inbox.summary(),
    queryFn: async (): Promise<InboxSummaryResponse> => {
      const { data } = await api.GET('/api/v1/inbox/summary');
      return data as InboxSummaryResponse;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

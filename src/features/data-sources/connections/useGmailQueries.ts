'use client';

import { useQuery } from '@tanstack/react-query';

import {
  loadGmailAttentionGroups,
  loadGmailAttentionSummary,
  loadGmailConnections,
  loadGmailSenders,
  loadGmailUngrouped,
} from '@/features/data-sources/connections/gmailActions';
import { unwrapAction } from '@/lib/actionResult';
import { keys } from '@/lib/query/keys';

interface UseGmailQueriesOptions {
  archivedPage?: number;
}

/** The reads GmailConnect needs: connections, sender allowlist, the attention groups, the ungrouped count per reason and the archived emails. */
export function useGmailQueries({ archivedPage = 0 }: UseGmailQueriesOptions) {
  const connectionsQuery = useQuery({
    queryKey: keys.settings.gmailConnection(),
    queryFn: () => unwrapAction(loadGmailConnections()),
  });

  const sendersQuery = useQuery({
    queryKey: keys.settings.gmailSenders(),
    queryFn: () => unwrapAction(loadGmailSenders()),
  });

  // Unknown numbers, accounts with import off, and the ignored numbers.
  const groupsQuery = useQuery({
    queryKey: keys.settings.gmailAttention({ groups: true }),
    queryFn: () => unwrapAction(loadGmailAttentionGroups()),
  });

  // Count per reason of the emails in no group; their rows load per reason (see AttentionGroup).
  const ungroupedSummaryQuery = useQuery({
    queryKey: keys.settings.gmailAttention({ summary: true, ungroupedOnly: true, includeRetryable: false }),
    queryFn: () => unwrapAction(loadGmailAttentionSummary(false, true)),
  });

  // Archived items only feed the collapsed "Archived" section, so they stay out of `loading`.
  const archivedParams = { page: archivedPage, size: 10, includeRetryable: false, archived: true };
  const archivedQuery = useQuery({
    queryKey: keys.settings.gmailAttention({ ungrouped: true, ...archivedParams }),
    queryFn: () => unwrapAction(loadGmailUngrouped(archivedParams)),
  });

  // The reads the page needs to show something gate "loading" (used to disable Connect/Sync).
  const loading = connectionsQuery.isLoading || sendersQuery.isLoading || groupsQuery.isLoading || ungroupedSummaryQuery.isLoading;

  return {
    connections: connectionsQuery.data ?? [],
    senders: sendersQuery.data ?? [],
    attentionGroups: groupsQuery.data ?? null,
    ungroupedSummary: ungroupedSummaryQuery.data ?? null,
    archivedData: archivedQuery.data ?? null,
    loading,
  };
}

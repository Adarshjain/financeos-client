'use client';

import { useQuery } from '@tanstack/react-query';

import { loadGmailAttention, loadGmailAttentionSummary, loadGmailConnections, loadGmailSenders } from '@/features/data-sources/connections/gmailActions';
import { unwrapAction } from '@/lib/actionResult';
import { keys } from '@/lib/query/keys';

interface UseGmailQueriesOptions {
  archivedPage?: number;
}

/** The reads GmailConnect needs: connections, sender allowlist, attention counts per reason, and the archived items. */
export function useGmailQueries({ archivedPage = 0 }: UseGmailQueriesOptions) {
  const connectionsQuery = useQuery({
    queryKey: keys.settings.gmailConnection(),
    queryFn: () => unwrapAction(loadGmailConnections()),
  });

  const sendersQuery = useQuery({
    queryKey: keys.settings.gmailSenders(),
    queryFn: () => unwrapAction(loadGmailSenders()),
  });

  // Active items load per reason group (see AttentionGroup); this is the count per reason.
  const attentionQuery = useQuery({
    queryKey: keys.settings.gmailAttention({ summary: true, includeRetryable: false }),
    queryFn: () => unwrapAction(loadGmailAttentionSummary(false)),
  });

  // Archived items only feed the collapsed "Archived" section, so they stay out of `loading`.
  const archivedParams = { page: archivedPage, size: 10, includeRetryable: false, archived: true };
  const archivedQuery = useQuery({
    queryKey: keys.settings.gmailAttention(archivedParams),
    queryFn: () => unwrapAction(loadGmailAttention(archivedParams)),
  });

  // Mirrors the original single `Promise.all` initial load: all three reads
  // gate the same "loading" state (used to disable the Connect/Sync buttons
  // until the page has something to show).
  const loading = connectionsQuery.isLoading || sendersQuery.isLoading || attentionQuery.isLoading;

  return {
    connections: connectionsQuery.data ?? [],
    senders: sendersQuery.data ?? [],
    attentionSummary: attentionQuery.data ?? null,
    archivedData: archivedQuery.data ?? null,
    loading,
  };
}

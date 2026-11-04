'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  archiveAllGmailAttention,
  archiveGmailAttention,
  assignGmailAttention,
  createGmailSender,
  deleteGmailSender,
  disconnectGmail,
  retryAllGmailAttention,
  retryGmailAttention,
  startGmailOAuth,
  syncGmail,
  unarchiveGmailAttention,
  updateGmailSender,
} from '@/features/settings/connections/gmailActions';
import { useRouterRefresh } from '@/features/settings/useRouterRefresh';
import { unwrapAction } from '@/lib/actionResult';
import type { AssignAttentionRequest, AttentionBulkRequest, GmailSenderRequest } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';

/** Every write GmailConnect needs, grouped so the orchestrator hook stays thin. */
export function useGmailMutations() {
  const qc = useQueryClient();
  // The main Settings page shows the attention count (server-rendered), so its cached copy is dropped.
  const refreshLayout = useRouterRefresh();
  const invalidateConnections = () => {
    return qc.invalidateQueries({ queryKey: keys.settings.gmailConnection() });
  };
  const invalidateSenders = () => {
    return qc.invalidateQueries({ queryKey: keys.settings.gmailSenders() });
  };
  const invalidateAttention = () => {
    return qc.invalidateQueries({ queryKey: keys.settings.gmailAttentionAll() });
  };

  const startOAuthMutation = useMutation({
    mutationFn: () => unwrapAction(startGmailOAuth()),
  });

  // Enqueues a GMAIL_SYNC job; the job's own settling (see useJobStatusPolling
  // in useGmailConnect) is what actually creates transactions, so this
  // mutation itself invalidates nothing.
  const syncMutation = useMutation({
    mutationFn: () => unwrapAction(syncGmail()),
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => unwrapAction(disconnectGmail(id)),
    // Disconnecting can drop the mailbox's attention items, so the main Settings page count refreshes too.
    onSuccess: async () => {
      await invalidateConnections();
      refreshLayout();
    },
  });

  // Enqueues a retry job for one ledger item; settling is handled the same
  // way as syncMutation.
  const retryAttentionMutation = useMutation({
    mutationFn: (ledgerId: string) => unwrapAction(retryGmailAttention(ledgerId)),
    onSuccess: async () => {
      await invalidateAttention();
      refreshLayout();
    },
  });

  // Archiving also changes the Inbox's Gmail attention count.
  const invalidateAttentionAndInbox = async () => {
    await Promise.all([invalidateAttention(), qc.invalidateQueries({ queryKey: keys.inbox.all })]);
    refreshLayout();
  };

  const archiveAttentionMutation = useMutation({
    mutationFn: (ledgerId: string) => unwrapAction(archiveGmailAttention(ledgerId)),
    onSuccess: invalidateAttentionAndInbox,
  });

  const unarchiveAttentionMutation = useMutation({
    mutationFn: (ledgerId: string) => unwrapAction(unarchiveGmailAttention(ledgerId)),
    onSuccess: invalidateAttentionAndInbox,
  });

  const assignAttentionMutation = useMutation({
    mutationFn: ({ ledgerId, body }: { ledgerId: string; body: AssignAttentionRequest }) =>
      unwrapAction(assignGmailAttention(ledgerId, body)),
    onSuccess: async () => {
      await invalidateAttention();
      refreshLayout();
    },
  });

  const retryAllMutation = useMutation({
    mutationFn: (body: AttentionBulkRequest) => unwrapAction(retryAllGmailAttention(body)),
    onSuccess: async () => {
      await invalidateAttention();
      refreshLayout();
    },
  });

  const archiveAllMutation = useMutation({
    mutationFn: (body: AttentionBulkRequest) => unwrapAction(archiveAllGmailAttention(body)),
    onSuccess: invalidateAttentionAndInbox,
  });

  const createSenderMutation = useMutation({
    mutationFn: (body: GmailSenderRequest) => unwrapAction(createGmailSender(body)),
    onSuccess: invalidateSenders,
  });

  const updateSenderMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: GmailSenderRequest }) => unwrapAction(updateGmailSender(id, body)),
    onSuccess: invalidateSenders,
  });

  const deleteSenderMutation = useMutation({
    mutationFn: (id: string) => unwrapAction(deleteGmailSender(id)),
    onSuccess: invalidateSenders,
  });

  return {
    startOAuthMutation,
    syncMutation,
    disconnectMutation,
    retryAttentionMutation,
    archiveAttentionMutation,
    unarchiveAttentionMutation,
    assignAttentionMutation,
    retryAllMutation,
    archiveAllMutation,
    createSenderMutation,
    updateSenderMutation,
    deleteSenderMutation,
  };
}

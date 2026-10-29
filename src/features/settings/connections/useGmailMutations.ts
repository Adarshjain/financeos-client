'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import {
  archiveGmailAttention,
  assignGmailAttention,
  createGmailSender,
  deleteGmailSender,
  disconnectGmail,
  retryGmailAttention,
  startGmailOAuth,
  syncGmail,
  unarchiveGmailAttention,
  updateGmailSender,
} from '@/features/settings/connections/gmailActions';
import { unwrapAction } from '@/lib/actionResult';
import type { AssignAttentionRequest, GmailSenderRequest } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';

/** Every write GmailConnect needs, grouped so the orchestrator hook stays thin. */
export function useGmailMutations() {
  const qc = useQueryClient();
  const router = useRouter();
  const invalidateConnections = () => {
    router.refresh();
    return qc.invalidateQueries({ queryKey: keys.settings.gmailConnection() });
  };
  const invalidateSenders = () => {
    router.refresh();
    return qc.invalidateQueries({ queryKey: keys.settings.gmailSenders() });
  };
  const invalidateAttention = () => {
    router.refresh();
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
    onSuccess: invalidateConnections,
  });

  // Enqueues a retry job for one ledger item; settling is handled the same
  // way as syncMutation.
  const retryAttentionMutation = useMutation({
    mutationFn: (ledgerId: string) => unwrapAction(retryGmailAttention(ledgerId)),
    onSuccess: invalidateAttention,
  });

  // Archiving also changes the Inbox's Gmail attention count.
  const invalidateAttentionAndInbox = () =>
    Promise.all([invalidateAttention(), qc.invalidateQueries({ queryKey: keys.inbox.all })]);

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
    onSuccess: invalidateAttention,
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
    createSenderMutation,
    updateSenderMutation,
    deleteSenderMutation,
  };
}

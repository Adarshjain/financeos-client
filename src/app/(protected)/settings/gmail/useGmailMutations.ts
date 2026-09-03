'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import type { GmailSenderRequest } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';

/** Every write GmailConnect needs, grouped so the orchestrator hook stays thin. */
export function useGmailMutations() {
  const qc = useQueryClient();
  const invalidateConnections = () => qc.invalidateQueries({ queryKey: keys.settings.gmailConnection() });
  const invalidateSenders = () => qc.invalidateQueries({ queryKey: keys.settings.gmailSenders() });
  const invalidateAttention = () => qc.invalidateQueries({ queryKey: [...keys.settings.all, 'gmailAttention'] });

  const startOAuthMutation = useMutation({
    mutationFn: () => api.GET('/api/v1/gmail/oauth/start').then((r) => r.data),
  });

  // Enqueues a GMAIL_SYNC job; the job's own settling (see useJobStatusPolling
  // in useGmailConnect) is what actually creates transactions, so this
  // mutation itself invalidates nothing.
  const syncMutation = useMutation({
    mutationFn: () => api.POST('/api/v1/gmail/sync').then((r) => r.data),
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => api.DELETE('/api/v1/gmail/connections/{id}', { params: { path: { id } } }),
    onSuccess: invalidateConnections,
  });

  // Enqueues a retry job for one ledger item; settling is handled the same
  // way as syncMutation.
  const retryAttentionMutation = useMutation({
    mutationFn: (ledgerId: string) =>
      api.POST('/api/v1/gmail/attention/{ledgerId}/retry', { params: { path: { ledgerId } } }).then((r) => r.data),
    onSuccess: invalidateAttention,
  });

  const createSenderMutation = useMutation({
    mutationFn: (body: GmailSenderRequest) => api.POST('/api/v1/gmail/senders', { body }).then((r) => r.data),
    onSuccess: invalidateSenders,
  });

  const updateSenderMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: GmailSenderRequest }) =>
      api.PUT('/api/v1/gmail/senders/{id}', { params: { path: { id } }, body }).then((r) => r.data),
    onSuccess: invalidateSenders,
  });

  const deleteSenderMutation = useMutation({
    mutationFn: (id: string) => api.DELETE('/api/v1/gmail/senders/{id}', { params: { path: { id } } }),
    onSuccess: invalidateSenders,
  });

  return {
    startOAuthMutation,
    syncMutation,
    disconnectMutation,
    retryAttentionMutation,
    createSenderMutation,
    updateSenderMutation,
    deleteSenderMutation,
  };
}

'use client';

import { useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { emitJobStarted } from '@/components/jobs/jobsBus';
import { useJobStatusPolling } from '@/components/jobs/useJobStatusPolling';
import { getErrorMessage } from '@/lib/api/errorMessage';
// GmailSenderResponse comes from the generated types, not @/lib/types: the
// spec marks `name` optional+nullable, where the hand-written version in
// @/lib/types only marks it optional — see "Spec follow-ups" in the
// migration report.
import type { GmailSenderRequest, GmailSenderResponse } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import type { SyncSummary } from '@/lib/types';

import { useGmailMutations } from './useGmailMutations';
import { useGmailQueries } from './useGmailQueries';

/**
 * Composes the Gmail reads (`useGmailQueries`), writes (`useGmailMutations`)
 * and the sync job's live status (`useJobStatusPolling`) into the flat API
 * `GmailConnect` and its cards already consume.
 */
export function useGmailConnect() {
  const qc = useQueryClient();
  const [attentionPage, setAttentionPage] = useState(0);
  const { connections, senders, attentionData, loading: readsLoading } = useGmailQueries({ attentionPage });
  const {
    startOAuthMutation,
    syncMutation,
    disconnectMutation,
    retryAttentionMutation,
    createSenderMutation,
    updateSenderMutation,
    deleteSenderMutation,
  } = useGmailMutations();

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { isPolling } = useJobStatusPolling<SyncSummary>(activeJobId, (job) => {
    if (job.status === 'SUCCEEDED') {
      toast.success('Sync completed!');
      // The job is what actually creates/reconciles transactions.
      qc.invalidateQueries({ queryKey: keys.transactions.all });
    } else if (job.status === 'FAILED') {
      setMessage({ type: 'error', text: job.errorMessage || 'Sync failed.' });
      toast.error('Sync failed.');
    } else if (job.status === 'CANCELLED') {
      setMessage({ type: 'error', text: 'Sync job was cancelled.' });
      toast.info('Sync cancelled.');
    }
    setActiveJobId(null);
  });

  const isSyncing = Boolean(activeJobId) && isPolling;
  const loading = startOAuthMutation.isPending ? 'connect' : syncMutation.isPending ? 'sync' : readsLoading ? 'connections' : null;

  // Sender add/edit dialog state
  const [isSenderDialogOpen, setIsSenderDialogOpen] = useState(false);
  const [editingSender, setEditingSender] = useState<GmailSenderResponse | null>(null);
  const [senderName, setSenderName] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderEnabled, setSenderEnabled] = useState(true);
  const submittingSender = createSenderMutation.isPending || updateSenderMutation.isPending;

  const handleConnect = async () => {
    setMessage(null);
    try {
      const data = await startOAuthMutation.mutateAsync();
      if (data?.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      }
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err, 'Failed to start Gmail OAuth') });
    }
  };

  const handleDisconnect = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to disconnect this Gmail account? All syncing for this email will stop.'
      )
    ) {
      return;
    }
    try {
      await disconnectMutation.mutateAsync(id);
      toast.success('Gmail account disconnected');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to disconnect Gmail connection'));
    }
  };

  const handleSync = async () => {
    setMessage(null);
    try {
      const data = await syncMutation.mutateAsync();
      if (data?.jobId) {
        setActiveJobId(data.jobId);
        emitJobStarted(data.jobId);
        toast.info('Gmail sync started in background.');
      }
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err, 'Failed to sync Gmail') });
    }
  };

  const handleRetryAttentionItem = async (ledgerId: string) => {
    try {
      const data = await retryAttentionMutation.mutateAsync(ledgerId);
      toast.success('Item queued for retry!');
      if (data?.jobId) {
        setActiveJobId(data.jobId);
        emitJobStarted(data.jobId);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to retry Gmail attention item'));
    }
  };

  const openAddSenderDialog = () => {
    setEditingSender(null);
    setSenderName('');
    setSenderAddress('');
    setSenderEnabled(true);
    setIsSenderDialogOpen(true);
  };

  const openEditSenderDialog = (sender: GmailSenderResponse) => {
    setEditingSender(sender);
    setSenderName(sender.name || '');
    setSenderAddress(sender.senderAddress);
    setSenderEnabled(sender.enabled);
    setIsSenderDialogOpen(true);
  };

  const handleSenderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const requestData: GmailSenderRequest = {
      name: senderName || undefined,
      senderAddress,
      enabled: senderEnabled,
    };

    try {
      if (editingSender) {
        await updateSenderMutation.mutateAsync({ id: editingSender.id, body: requestData });
        toast.success('Sender updated');
      } else {
        await createSenderMutation.mutateAsync(requestData);
        toast.success('Sender added');
      }
      setIsSenderDialogOpen(false);
    } catch (err) {
      toast.error(
        getErrorMessage(err, editingSender ? 'Failed to update Gmail sender' : 'Failed to create Gmail sender')
      );
    }
  };

  const handleSenderDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sender from the allowlist?')) {
      return;
    }
    try {
      await deleteSenderMutation.mutateAsync(id);
      toast.success('Sender deleted');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete Gmail sender'));
    }
  };

  return {
    loading,
    connections,
    senders,
    attentionData,
    attentionPage,
    setAttentionPage,
    message,
    isSyncing,
    isSenderDialogOpen,
    setIsSenderDialogOpen,
    editingSender,
    submittingSender,
    senderName,
    setSenderName,
    senderAddress,
    setSenderAddress,
    senderEnabled,
    setSenderEnabled,
    handleConnect,
    handleDisconnect,
    handleSync,
    handleRetryAttentionItem,
    openAddSenderDialog,
    openEditSenderDialog,
    handleSenderSubmit,
    handleSenderDelete,
  };
}

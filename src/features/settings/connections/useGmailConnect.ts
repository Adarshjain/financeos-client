'use client';

import { useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';

import { emitJobStarted } from '@/features/jobs/jobsBus';
import { useJobStatusPolling } from '@/features/jobs/useJobStatusPolling';
import { getErrorMessage } from '@/lib/api/errorMessage';
// GmailSenderResponse comes from the generated types, not @/lib/types: the
// spec marks `name` optional+nullable, where the hand-written version in
// @/lib/types only marks it optional — see "Spec follow-ups" in the
// migration report.
import type { GmailSenderRequest, GmailSenderResponse } from '@/lib/api/types';
import { notify } from '@/lib/notify';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';
import type { SyncSummary } from '@/lib/types';

import { useGmailMutations } from './useGmailMutations';
import { useGmailQueries } from './useGmailQueries';

/**
 * Composes the Gmail reads (`useGmailQueries`), writes (`useGmailMutations`)
 * and the sync job's live status (`useJobStatusPolling`) into the flat API
 * the Gmail settings pages consume. Disconnect and sender delete run straight away: the caller
 * confirms first (Legacy with `confirm()`, the Dinero page with a Dialog).
 */
export function useGmailConnect() {
  const qc = useQueryClient();
  const [attentionPage, setAttentionPage] = useState(0);
  const [archivedPage, setArchivedPage] = useState(0);
  const { connections, senders, attentionData, archivedData, loading: readsLoading } = useGmailQueries({
    attentionPage,
    archivedPage,
  });

  // Archiving, unarchiving or retrying the last row of a later page leaves that page empty; step
  // back to the new last page instead of showing an empty list.
  const attentionPages = attentionData?.totalPages;
  const archivedPages = archivedData?.totalPages;
  React.useEffect(() => {
    if (attentionPages != null && attentionPage > 0 && attentionPage >= attentionPages) {
      setAttentionPage(Math.max(0, attentionPages - 1));
    }
  }, [attentionPage, attentionPages]);
  React.useEffect(() => {
    if (archivedPages != null && archivedPage > 0 && archivedPage >= archivedPages) {
      setArchivedPage(Math.max(0, archivedPages - 1));
    }
  }, [archivedPage, archivedPages]);
  const {
    startOAuthMutation,
    syncMutation,
    disconnectMutation,
    retryAttentionMutation,
    archiveAttentionMutation,
    unarchiveAttentionMutation,
    createSenderMutation,
    updateSenderMutation,
    deleteSenderMutation,
  } = useGmailMutations();

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { isPolling } = useJobStatusPolling<SyncSummary>(activeJobId, (job) => {
    if (job.status === 'SUCCEEDED') {
      notify.success('Gmail sync completed');
      // The job is what actually creates/reconciles transactions.
      qc.invalidateQueries({ queryKey: keys.transactions.all });
    } else if (job.status === 'FAILED') {
      setMessage({ type: 'error', text: job.errorMessage || "Couldn't sync Gmail. Try again." });
      notify.error("Couldn't sync Gmail. Try again.");
    } else if (job.status === 'CANCELLED') {
      setMessage({ type: 'error', text: 'Sync job was cancelled.' });
      notify.info('Sync cancelled');
    }
    // "Recent sync jobs" only live-polls while its own list shows an active job, so a refetch that
    // raced the enqueue can leave it empty; refresh it whenever the job settles.
    qc.invalidateQueries({ queryKey: keys.jobs.all });
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
      setMessage({ type: 'error', text: getErrorMessage(err, "Couldn't connect Gmail. Try again.") });
    }
  };

  const handleDisconnect = async (id: string): Promise<boolean> => {
    try {
      await disconnectMutation.mutateAsync(id);
      notify.success('Gmail account disconnected');
      return true;
    } catch (err) {
      toastError(err, "Couldn't disconnect Gmail. Try again.");
      return false;
    }
  };

  const handleSync = async () => {
    setMessage(null);
    try {
      const data = await syncMutation.mutateAsync();
      if (data?.jobId) {
        setActiveJobId(data.jobId);
        emitJobStarted(data.jobId);
        notify.info('Gmail sync started');
      }
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err, "Couldn't sync Gmail. Try again.") });
    }
  };

  const handleRetryAttentionItem = async (ledgerId: string) => {
    try {
      const data = await retryAttentionMutation.mutateAsync(ledgerId);
      notify.success('Item queued for retry');
      if (data?.jobId) {
        setActiveJobId(data.jobId);
        emitJobStarted(data.jobId);
      }
    } catch (err) {
      toastError(err, "Couldn't retry the item. Try again.");
    }
  };

  const handleArchiveAttentionItem = async (ledgerId: string) => {
    try {
      await archiveAttentionMutation.mutateAsync(ledgerId);
      notify.success('Item archived');
    } catch (err) {
      toastError(err, "Couldn't archive the item. Try again.");
    }
  };

  const handleUnarchiveAttentionItem = async (ledgerId: string) => {
    try {
      await unarchiveAttentionMutation.mutateAsync(ledgerId);
      notify.success('Item moved back to Needs attention');
    } catch (err) {
      toastError(err, "Couldn't unarchive the item. Try again.");
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
        notify.success('Sender updated');
      } else {
        await createSenderMutation.mutateAsync(requestData);
        notify.success('Sender added');
      }
      setIsSenderDialogOpen(false);
    } catch (err) {
      toastError(err, editingSender ? "Couldn't update the sender. Try again." : "Couldn't add the sender. Try again.");
    }
  };

  const handleSenderDelete = async (id: string): Promise<boolean> => {
    try {
      await deleteSenderMutation.mutateAsync(id);
      notify.success('Sender deleted');
      return true;
    } catch (err) {
      toastError(err, "Couldn't delete the sender. Try again.");
      return false;
    }
  };

  return {
    loading,
    connections,
    senders,
    attentionData,
    attentionPage,
    setAttentionPage,
    archivedData,
    archivedPage,
    setArchivedPage,
    message,
    dismissMessage: () => setMessage(null),
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
    handleArchiveAttentionItem,
    handleUnarchiveAttentionItem,
    openAddSenderDialog,
    openEditSenderDialog,
    handleSenderSubmit,
    handleSenderDelete,
  };
}

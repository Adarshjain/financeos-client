'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  createGmailSender,
  deleteGmailSender,
  disconnectGmailConnection,
  getGmailAttentionItems,
  listGmailConnections,
  listGmailSenders,
  retryGmailAttentionItem,
  startGmailOAuth,
  syncGmail,
  updateGmailSender,
} from '@/actions/gmail';
import { emitJobStarted } from '@/components/jobs/jobsBus';
import { useJobPolling } from '@/hooks/useJobPolling';
import type {
  GmailConnectionResponse,
  GmailSenderRequest,
  GmailSenderResponse,
  PagedGmailAttention,
  SyncSummary,
} from '@/lib/types';

export function useGmailConnect() {
  const [loading, setLoading] = useState<
    'connect' | 'sync' | 'connections' | 'senders' | 'attention' | null
  >(null);
  const [connections, setConnections] = useState<GmailConnectionResponse[]>([]);
  const [senders, setSenders] = useState<GmailSenderResponse[]>([]);
  const [attentionData, setAttentionData] =
    useState<PagedGmailAttention | null>(null);
  const [attentionPage, setAttentionPage] = useState(0);

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fetchAttention = useCallback(async (page = 0) => {
    const res = await getGmailAttentionItems(page, 10, false);
    if (res.success) {
      setAttentionData(res.data);
    }
  }, []);

  const { isPolling } = useJobPolling<SyncSummary>(activeJobId, (job) => {
    if (job.status === 'SUCCEEDED') {
      toast.success('Sync completed!');
      fetchAttention(attentionPage);
    } else if (job.status === 'FAILED') {
      setMessage({ type: 'error', text: job.errorMessage || 'Sync failed.' });
      toast.error('Sync failed.');
    } else if (job.status === 'CANCELLED') {
      setMessage({ type: 'error', text: 'Sync job was cancelled.' });
      toast.info('Sync cancelled.');
    }
    setActiveJobId(null);
  });

  // Dialog management
  const [isSenderDialogOpen, setIsSenderDialogOpen] = useState(false);
  const [editingSender, setEditingSender] =
    useState<GmailSenderResponse | null>(null);
  const [submittingSender, setSubmittingSender] = useState(false);

  // Form states for Sender
  const [senderName, setSenderName] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderEnabled, setSenderEnabled] = useState(true);

  // Load data on mount
  useEffect(() => {
    let active = true;
    const fetchInitialData = async () => {
      await Promise.resolve();
      if (!active) return;
      setLoading('connections');
      const [connRes, sendersRes, attentionRes] = await Promise.all([
        listGmailConnections(),
        listGmailSenders(),
        getGmailAttentionItems(0, 10, false),
      ]);

      if (!active) return;
      if (connRes.success) setConnections(connRes.data);
      if (sendersRes.success) setSenders(sendersRes.data);
      if (attentionRes.success) setAttentionData(attentionRes.data);
      setLoading(null);
    };
    fetchInitialData();
    return () => {
      active = false;
    };
  }, []);

  const isSyncing = Boolean(activeJobId) && isPolling;

  const handleConnect = async () => {
    setLoading('connect');
    setMessage(null);
    const response = await startGmailOAuth();
    if (response.success && response.data.authorizationUrl) {
      window.location.href = response.data.authorizationUrl;
    } else if (!response.success) {
      setMessage({ type: 'error', text: response.error.message });
      setLoading(null);
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
    const response = await disconnectGmailConnection(id);
    if (response.success) {
      toast.success('Gmail account disconnected');
      const connRes = await listGmailConnections();
      if (connRes.success) setConnections(connRes.data);
    } else {
      toast.error(response.error.message);
    }
  };

  const handleSync = async () => {
    setLoading('sync');
    setMessage(null);

    const response = await syncGmail();

    if (response.success && response.data?.jobId) {
      const jobId = response.data.jobId;
      setActiveJobId(jobId);
      emitJobStarted(jobId);
      toast.info('Gmail sync started in background.');
    } else if (!response.success) {
      setMessage({ type: 'error', text: response.error.message });
    }
    setLoading(null);
  };

  const handleRetryAttentionItem = async (ledgerId: string) => {
    const res = await retryGmailAttentionItem(ledgerId);
    if (res.success && res.data?.jobId) {
      toast.success('Item queued for retry!');
      setActiveJobId(res.data.jobId);
      emitJobStarted(res.data.jobId);
      fetchAttention(attentionPage);
    } else if (!res.success) {
      toast.error(res.error.message);
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
    setSubmittingSender(true);

    const requestData: GmailSenderRequest = {
      name: senderName || undefined,
      senderAddress,
      enabled: senderEnabled,
    };

    let response;
    if (editingSender) {
      response = await updateGmailSender(editingSender.id, requestData);
    } else {
      response = await createGmailSender(requestData);
    }

    if (response.success) {
      toast.success(editingSender ? 'Sender updated' : 'Sender added');
      setIsSenderDialogOpen(false);
      const sendersRes = await listGmailSenders();
      if (sendersRes.success) setSenders(sendersRes.data);
    } else {
      toast.error(response.error.message);
    }
    setSubmittingSender(false);
  };

  const handleSenderDelete = async (id: string) => {
    if (
      !confirm('Are you sure you want to delete this sender from the allowlist?')
    ) {
      return;
    }
    const response = await deleteGmailSender(id);
    if (response.success) {
      toast.success('Sender deleted');
      const sendersRes = await listGmailSenders();
      if (sendersRes.success) setSenders(sendersRes.data);
    } else {
      toast.error(response.error.message);
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
    fetchAttention,
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

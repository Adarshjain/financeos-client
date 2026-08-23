'use client';

import { AlertCircle, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, RefreshCw, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
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
import { JobsPanel } from '@/components/jobs/JobsPanel';
import { useJobs } from '@/components/jobs/JobsProvider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { useJobPolling } from '@/hooks/useJobPolling';
import type { GmailConnectionResponse, GmailSenderRequest, GmailSenderResponse, PagedGmailAttention, SyncSummary } from '@/lib/types';

export function GmailConnect() {
  const [loading, setLoading] = useState<'connect' | 'sync' | 'connections' | 'senders' | 'attention' | null>(null);
  const [connections, setConnections] = useState<GmailConnectionResponse[]>([]);
  const [senders, setSenders] = useState<GmailSenderResponse[]>([]);
  const [attentionData, setAttentionData] = useState<PagedGmailAttention | null>(null);
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

  const { notifyJobStarted } = useJobs();
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
  const [editingSender, setEditingSender] = useState<GmailSenderResponse | null>(null);
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
    if (!confirm('Are you sure you want to disconnect this Gmail account? All syncing for this email will stop.')) {
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
      notifyJobStarted(jobId);
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
      notifyJobStarted(res.data.jobId);
      setActiveJobId(res.data.jobId);
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
    if (!confirm('Are you sure you want to delete this sender from the allowlist?')) {
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

  return (
    <div className="space-y-2 pb-20">
      {/* Status Alerts */}
      {message && (
        <Alert variant={message.type === 'success' ? 'default' : 'destructive'}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Needs Attention Card */}
      {attentionData && attentionData.content.length > 0 && (
        <Card className="border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10">
          <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Needs Attention ({attentionData.totalElements})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            <div className="divide-y divide-amber-100 dark:divide-amber-900/30">
              {attentionData.content.map((item) => (
                <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {item.subject || item.gmailMessageId}
                      </span>
                      <Badge variant="warning" className="text-2xs py-0 px-1.5 shrink-0">
                        {item.status === 'ACCOUNT_NOT_OPTED_IN' ? 'Not Opted In' : item.status === 'UNRESOLVED_ACCOUNT' ? 'Unresolved' : 'Failed'}
                      </Badge>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 truncate">
                      {item.status === 'ACCOUNT_NOT_OPTED_IN'
                        ? `Waiting for account ending ••${item.extractedLast4 || '????'} — set an ingestion date on your account to activate`
                        : item.status === 'UNRESOLVED_ACCOUNT'
                        ? `No account matching ••${item.extractedLast4 || '????'} — create an account to import`
                        : item.error || 'Ingestion failed permanently'}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handleRetryAttentionItem(item.id)}
                    className="shrink-0 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                </div>
              ))}
            </div>

            {attentionData.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-amber-100 dark:border-amber-900/30 text-2xs text-amber-800 dark:text-amber-300">
                <span>Page {attentionData.number + 1} of {attentionData.totalPages}</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="xs"
                    disabled={attentionData.number === 0}
                    onClick={() => {
                      const next = attentionPage - 1;
                      setAttentionPage(next);
                      fetchAttention(next);
                    }}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    disabled={attentionData.number >= attentionData.totalPages - 1}
                    onClick={() => {
                      const next = attentionPage + 1;
                      setAttentionPage(next);
                      fetchAttention(next);
                    }}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Connection management */}
      <Card className="border border-slate-200 dark:border-slate-800">
        <CardHeader className="p-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="w-full font-semibold flex items-center">
            Connected Accounts
          </CardTitle>
          <Button
            variant="outline"
            onClick={handleConnect}
            disabled={loading !== null}
            size="sm"
          >
            {loading === 'connect' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            Add Account
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {connections.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-lg">
              <p className="text-slate-500 text-sm">No connected Gmail accounts found.</p>
              <Button
                variant="link"
                className="text-sm mt-1"
                onClick={handleConnect}
              >
                Connect your first account
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-850">
              {connections.map((conn) => (
                <div key={conn.id} className="flex items-center justify-between py-2 last:pb-0 px-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white text-sm">
                        {conn.email}
                      </span>
                      {conn.isPrimary && (
                        <Badge variant="success" className="text-2xs py-0 px-1.5">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Connected: {new Date(conn.connectedAt).toLocaleDateString()}</span>
                      {conn.lastSyncedAt && (
                        <span>Last sync: {new Date(conn.lastSyncedAt).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost-destructive"
                    size="sm"
                    onClick={() => handleDisconnect(conn.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {connections.length > 0 && (
            <div className="flex items-center flex-col justify-between p-2 border-t gap-2">
              <p className="text-xs text-slate-500">
                Automatic sync runs in the background. Or trigger an ingestion manually:
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={loading !== null || isSyncing}
              >
                {loading === 'sync' || isSyncing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Manually Sync Now
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Jobs Panel */}
      <JobsPanel types={['GMAIL_SYNC']} title="Recent sync jobs" />

      {/* Senders Allowlist */}
      <Card className="border border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3 flex flex-col items-center justify-between space-y-0">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            Gmail Sender Allowlist
          </CardTitle>
          <div className="flex flex-row items-center justify-between w-full gap-2">
            <CardDescription>
              Emails from these senders will be ingested for transactions
            </CardDescription>
            <Button
              variant="outline"
              onClick={openAddSenderDialog}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Sender
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {senders.length === 0 ? (
            <EmptyState
              title="No allowed senders configured yet"
              description="Add banks, credit cards, or service alerts to the allowlist."
              action={
                <Button variant="outline" size="sm" onClick={openAddSenderDialog}>
                  Configure Sender
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {senders.map((sender) => (
                <div
                  key={sender.id}
                  className={`p-3 rounded-lg border flex flex-col justify-between ${
                    sender.enabled
                      ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50'
                      : 'border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-950/20 opacity-60'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-1">
                          {sender.name || '(Unnamed Sender)'}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5 select-all">
                          {sender.senderAddress}
                        </p>
                      </div>
                      <Badge
                        variant={sender.enabled ? 'success' : 'default'}
                        className="text-2xs py-0 px-2 uppercase shrink-0"
                      >
                        {sender.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      size="xs"
                      className="flex-1 text-slate-600 dark:text-slate-400"
                      onClick={() => openEditSenderDialog(sender)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost-destructive"
                      size="xs"
                      className="flex-1"
                      onClick={() => handleSenderDelete(sender.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Sender Dialog */}
      <Dialog open={isSenderDialogOpen} onOpenChange={setIsSenderDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSender ? 'Edit Allowed Sender' : 'Add Allowed Sender'}
            </DialogTitle>
          </DialogHeader>

          <DialogBody>
            <form id="sender-form" onSubmit={handleSenderSubmit} className="space-y-2 pt-2">
              <FormField
                label="Sender Name (Optional)"
                name="name"
                placeholder="e.g., HDFC Bank Alerts"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
              />

              <FormField
                label="Sender Email Address"
                name="senderAddress"
                type="email"
                placeholder="e.g., alerts@hdfcbank.net"
                value={senderAddress}
                onChange={(e) => setSenderAddress(e.target.value)}
                required
              />

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="senderEnabled"
                  checked={senderEnabled}
                  onChange={(e) => setSenderEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="senderEnabled"
                       className="text-sm font-medium text-slate-700 dark:text-slate-300 select-none">
                  Enable Ingestion for this Sender
                </label>
              </div>
            </form>
          </DialogBody>

          <DialogFooter
            primaryAction={{
              label: submittingSender ? 'Saving...' : 'Save Sender',
              type: 'submit',
              form: 'sender-form',
              disabled: submittingSender,
            }}
            secondaryAction={{
              label: 'Cancel',
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { AlertCircle, CheckCircle2, Loader2, Pencil, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  createGmailSender,
  deleteGmailSender,
  disconnectGmailConnection,
  listGmailConnections,
  listGmailSenders,
  startGmailOAuth,
  syncGmail,
  updateGmailSender,
} from '@/actions/gmail';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import type { GmailConnectionResponse, GmailSenderRequest, GmailSenderResponse, SyncSummary } from '@/lib/types';

export function GmailConnect() {
  const [loading, setLoading] = useState<'connect' | 'sync' | 'connections' | 'senders' | null>(null);
  const [connections, setConnections] = useState<GmailConnectionResponse[]>([]);
  const [senders, setSenders] = useState<GmailSenderResponse[]>([]);

  const [syncResult, setSyncResult] = useState<SyncSummary | null>(null);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

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
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading('connections');
    const [connRes, sendersRes] = await Promise.all([
      listGmailConnections(),
      listGmailSenders(),
    ]);

    if (connRes.success) setConnections(connRes.data);
    if (sendersRes.success) setSenders(sendersRes.data);
    setLoading(null);
  };

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
    setSyncResult(null);

    const response = await syncGmail();

    if (response.success) {
      setSyncResult(response.data);
      toast.success('Sync completed!');
    } else {
      setMessage({ type: 'error', text: response.error.message });
    }
    setLoading(null);
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
    <div className="space-y-6 pb-20">
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
                        <Badge variant="success" className="text-[10px] py-0 px-1.5">
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
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
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
                disabled={loading !== null}
              >
                {loading === 'sync' ? (
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

          {/* Sync Result Summary */}
          {syncResult && (
            <Alert variant="default"
                   className="border-slate-200 bg-slate-50 dark:bg-slate-900/40 dark:border-slate-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <AlertTitle className="text-sm font-semibold mb-1">Ingestion Complete</AlertTitle>
              <AlertDescription className="text-xs text-slate-600 dark:text-slate-400">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-2">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border text-center">
                    <div className="font-bold text-slate-950 dark:text-white text-base">{syncResult.fetched}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Fetched</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border text-center">
                    <div className="font-bold text-emerald-600 text-base">{syncResult.created}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Created</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border text-center">
                    <div className="font-bold text-blue-600 text-base">{syncResult.reconciled}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Reconciled</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border text-center">
                    <div className="font-bold text-slate-600 text-base">{syncResult.skipped}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Skipped</div>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded border text-center">
                    <div className="font-bold text-red-600 text-base">{syncResult.failed}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Failed</div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

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
            <div className="text-center py-8 border border-dashed rounded-lg">
              <p className="text-slate-500 text-sm mb-2">No allowed senders configured yet.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={openAddSenderDialog}
              >
                Configure Sender
              </Button>
            </div>
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
                        <p className="text-xs text-slate-500 font-mono mt-0.5 select-all">
                          {sender.senderAddress}
                        </p>
                      </div>
                      <Badge
                        variant={sender.enabled ? 'success' : 'default'}
                        className="text-[9px] py-0 px-2 uppercase shrink-0"
                      >
                        {sender.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-xs h-7 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => openEditSenderDialog(sender)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-xs h-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
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

          <form onSubmit={handleSenderSubmit} className="space-y-4 pt-2">
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

            <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSenderDialogOpen(false)}
                disabled={submittingSender}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submittingSender}>
                {submittingSender ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    Saving...
                  </>
                ) : (
                  'Save Sender'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

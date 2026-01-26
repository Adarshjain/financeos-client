'use client';

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  Paperclip,
  RefreshCw,
} from 'lucide-react';
import { useState } from 'react';

import { startGmailOAuth, syncGmail } from '@/actions/gmail';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GmailFetchMode,GmailFetchResult } from '@/lib/types';

export function GmailConnect() {
  const [loading, setLoading] = useState<'connect' | 'sync' | null>(null);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [lastFetchResult, setLastFetchResult] =
    useState<GmailFetchResult | null>(null);

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

  const handleSync = async (mode: GmailFetchMode = 'MANUAL') => {
    setLoading('sync');
    setMessage(null);

    const response = await syncGmail({ mode, maxMessages: 100 });

    if (response.success) {
      const count = response.data.messages?.length ?? 0;
      setLastFetchResult(response.data);
      setMessage({
        type: 'success',
        text:
          count > 0
            ? `Fetched ${count} email${count > 1 ? 's' : ''} from Gmail.`
            : 'Sync completed. No new emails found.',
      });
    } else {
      setMessage({ type: 'error', text: response.error.message });
    }

    setLoading(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <Mail className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <span className="font-medium text-slate-900 dark:text-white">
              Gmail Integration
            </span>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Connect your Gmail to fetch transaction emails
            </p>
          </div>
        </div>
      </div>

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

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={handleConnect}
          disabled={loading !== null}
        >
          {loading === 'connect' ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4 mr-2" />
              Connect Gmail
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          onClick={handleConnect}
          disabled={loading !== null}
        >
          {loading === 'connect' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Mail className="h-4 w-4 mr-2" />
          )}
          Connect another Gmail account
        </Button>

        <Button
          variant="default"
          onClick={() => handleSync('MANUAL')}
          disabled={loading !== null}
        >
          {loading === 'sync' ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Fetching...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Fetch Emails
            </>
          )}
        </Button>
      </div>

      {lastFetchResult && lastFetchResult.messages.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Fetched Emails ({lastFetchResult.messages.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lastFetchResult.messages.slice(0, 5).map((msg) => (
              <div
                key={msg.messageId}
                className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm text-slate-900 dark:text-white line-clamp-1">
                    {msg.subject || '(No subject)'}
                  </p>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {formatDate(msg.internalDate)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  From: {msg.from}
                </p>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Paperclip className="h-3 w-3 text-slate-400" />
                    <span className="text-xs text-slate-500">
                      {msg.attachments.length} attachment
                      {msg.attachments.length > 1 ? 's' : ''}
                    </span>
                    {msg.attachments.some(
                      (a) => a.mimeType === 'application/pdf'
                    ) && (
                      <Badge variant="secondary" className="text-xs py-0">
                        PDF
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ))}
            {lastFetchResult.messages.length > 5 && (
              <p className="text-xs text-slate-500 text-center">
                +{lastFetchResult.messages.length - 5} more emails
              </p>
            )}
            {lastFetchResult.nextState && (
              <p className="text-xs text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-700">
                Last synced:{' '}
                {formatDate(lastFetchResult.nextState.lastSyncedAt)}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

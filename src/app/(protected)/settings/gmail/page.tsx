import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { gmailApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';

import { GmailConnect } from '../GmailConnect';

export default async function GmailSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail?: string; email?: string; message?: string }>;
}) {
  const params = await searchParams;
  const isSuccess = params.gmail === 'success';
  const isError = params.gmail === 'error';

  const attentionParams = { page: 0, size: 10, includeRetryable: false };
  const [connections, senders, attention] = await Promise.all([
    gmailApi.listConnections(),
    gmailApi.listSenders(),
    gmailApi.getAttentionItems(attentionParams.page, attentionParams.size, attentionParams.includeRetryable),
  ]);

  const queryClient = getQueryClient();
  queryClient.setQueryData(keys.settings.gmailConnection(), connections);
  queryClient.setQueryData(keys.settings.gmailSenders(), senders);
  queryClient.setQueryData(keys.settings.gmailAttention(attentionParams), attention);

  return (
    <div className="space-y-2 p-4">
      {/* Page Title & Back Button */}
      <div className="flex items-center gap-3">
        <Button asChild size="icon-sm">
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gmail Integration</h1>
        </div>
      </div>

      {/* Query Param Status Banners (from the OAuth callback redirect) */}
      {isSuccess && (
        <Alert variant="default" className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10 dark:border-emerald-900/30">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle className="text-emerald-800 dark:text-emerald-400 font-medium">Successfully Connected</AlertTitle>
          <AlertDescription className="text-emerald-700 dark:text-emerald-500 text-sm mt-1">
            Your Gmail account <strong>{params.email}</strong> has been successfully linked.
            We will now process transaction alerts and statements from this account.
          </AlertDescription>
        </Alert>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-medium">Connection Error</AlertTitle>
          <AlertDescription className="text-sm mt-1">
            {params.message || 'An unexpected error occurred during Google authorization.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Primary Gmail Settings Control Panel */}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <GmailConnect />
      </HydrationBoundary>
    </div>
  );
}

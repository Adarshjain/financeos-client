import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { oauthReturnFrom } from '@/features/settings/connections/connectionsModel';
import { ConnectionsPage } from '@/features/settings/connections/ConnectionsPage';
import { gmailApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';

export default async function DsSettingsConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail?: string; email?: string; message?: string; focus?: string }>;
}) {
  const params = await searchParams;

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
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ConnectionsPage oauth={oauthReturnFrom(params)} focusAttention={params.focus === 'attention'} />
    </HydrationBoundary>
  );
}

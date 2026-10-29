import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { ConnectionsPage } from '@/features/settings/connections/ConnectionsPage';
import { parseConnectionsUrl } from '@/features/settings/connections/connectionsUrl';
import { guardSession } from '@/features/shell/loadHelpers';
import type { SearchParams } from '@/features/shell/searchParams';
import { gmailApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';

export const metadata = { title: 'Connections' };

export default async function DsSettingsConnectionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { oauth, focusAttention } = parseConnectionsUrl(await searchParams);

  const attentionParams = { page: 0, size: 10, includeRetryable: false };
  const [connections, senders, attention] = await guardSession(
    Promise.all([
      gmailApi.listConnections(),
      gmailApi.listSenders(),
      gmailApi.getAttentionItems(attentionParams.page, attentionParams.size, attentionParams.includeRetryable),
    ])
  );

  const queryClient = getQueryClient();
  queryClient.setQueryData(keys.settings.gmailConnection(), connections);
  queryClient.setQueryData(keys.settings.gmailSenders(), senders);
  queryClient.setQueryData(keys.settings.gmailAttention(attentionParams), attention);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ConnectionsPage oauth={oauth} focusAttention={focusAttention} />
    </HydrationBoundary>
  );
}

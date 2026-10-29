import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { AiSettings } from '@/features/settings/ai/AiSettings';
import { guardSession } from '@/features/shell/loadHelpers';
import { llmKeysApi, llmRoutingApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';

export const metadata = { title: 'AI' };

export default async function DsSettingsAiPage() {
  const [llmKeys, catalog, routingOptions, routing, health] = await guardSession(
    Promise.all([
      llmKeysApi.list(),
      llmRoutingApi.getCatalog(),
      llmRoutingApi.getRoutingOptions(),
      llmRoutingApi.getRouting(),
      llmRoutingApi.getHealth(),
    ]),
  );

  const queryClient = getQueryClient();
  queryClient.setQueryData(keys.settings.llmKeys(), llmKeys);
  queryClient.setQueryData(keys.settings.llmCatalog(), catalog);
  queryClient.setQueryData(keys.settings.llmRoutingOptions(), routingOptions);
  queryClient.setQueryData(keys.settings.llmRouting(), routing);
  queryClient.setQueryData(keys.settings.llmHealth(), health);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AiSettings />
    </HydrationBoundary>
  );
}

import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { llmKeysApi, llmRoutingApi } from '@/lib/apiClient';
import { requireAuth } from '@/lib/auth';
import { getQueryClient, keys } from '@/lib/query';

import { LlmKeysManager } from './LlmKeysManager';

export default async function LlmKeysSettingsPage() {
  await requireAuth();

  const [llmKeys, catalog, routingOptions, routing, health] = await Promise.all([
    llmKeysApi.list(),
    llmRoutingApi.getCatalog(),
    llmRoutingApi.getRoutingOptions(),
    llmRoutingApi.getRouting(),
    llmRoutingApi.getHealth(),
  ]);

  const queryClient = getQueryClient();
  queryClient.setQueryData(keys.settings.llmKeys(), llmKeys);
  queryClient.setQueryData(keys.settings.llmCatalog(), catalog);
  queryClient.setQueryData(keys.settings.llmRoutingOptions(), routingOptions);
  queryClient.setQueryData(keys.settings.llmRouting(), routing);
  queryClient.setQueryData(keys.settings.llmHealth(), health);

  return (
    <div className="space-y-4 p-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button asChild size="icon-sm" variant="ghost">
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI API Keys</h1>
      </div>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <LlmKeysManager />
      </HydrationBoundary>
    </div>
  );
}

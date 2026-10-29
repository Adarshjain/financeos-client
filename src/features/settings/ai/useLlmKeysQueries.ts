'use client';

import { useQuery } from '@tanstack/react-query';

import { loadLlmCatalog, loadLlmHealth, loadLlmKeys, loadLlmRouting, loadLlmRoutingOptions } from '@/features/settings/ai/llmActions';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { keys } from '@/lib/query/keys';

/**
 * The five reads LlmKeysManager needs, run in parallel — the client-side
 * replacement for the old `refreshAllData()` `Promise.all` over server
 * actions. `page.tsx` seeds all five via `queryClient.setQueryData` using the
 * same keys, so first paint needs no client fetch.
 */
export function useLlmKeysQueries() {
  const keysQuery = useQuery({
    queryKey: keys.settings.llmKeys(),
    queryFn: () => unwrapAction(loadLlmKeys()),
  });

  const catalogQuery = useQuery({
    queryKey: keys.settings.llmCatalog(),
    queryFn: () => unwrapAction(loadLlmCatalog()),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const routingOptionsQuery = useQuery({
    queryKey: keys.settings.llmRoutingOptions(),
    queryFn: () => unwrapAction(loadLlmRoutingOptions()),
  });

  const routingQuery = useQuery({
    queryKey: keys.settings.llmRouting(),
    queryFn: () => unwrapAction(loadLlmRouting()),
  });

  const healthQuery = useQuery({
    queryKey: keys.settings.llmHealth(),
    queryFn: () => unwrapAction(loadLlmHealth()),
  });

  const queries = [keysQuery, catalogQuery, routingOptionsQuery, routingQuery, healthQuery];
  const loading = queries.some((q) => q.isLoading);
  const firstError = queries.map((q) => q.error).find((e) => e != null);

  return {
    keysList: keysQuery.data ?? [],
    catalog: catalogQuery.data ?? [],
    routingOptions: routingOptionsQuery.data ?? [],
    routing: routingQuery.data ?? null,
    health: healthQuery.data ?? [],
    loading,
    error: firstError ? getErrorMessage(firstError, "Couldn't load the AI settings. Try again.") : null,
  };
}

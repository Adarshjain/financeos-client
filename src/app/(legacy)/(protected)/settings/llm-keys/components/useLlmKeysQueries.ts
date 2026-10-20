'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
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
    queryFn: async () => (await api.GET('/api/v1/llm-keys')).data ?? [],
  });

  const catalogQuery = useQuery({
    queryKey: keys.settings.llmCatalog(),
    queryFn: async () => (await api.GET('/api/v1/llm/catalog')).data ?? [],
  });

  const routingOptionsQuery = useQuery({
    queryKey: keys.settings.llmRoutingOptions(),
    queryFn: async () => (await api.GET('/api/v1/llm/routing-options')).data ?? [],
  });

  const routingQuery = useQuery({
    queryKey: keys.settings.llmRouting(),
    queryFn: async () => (await api.GET('/api/v1/llm/routing')).data ?? null,
  });

  const healthQuery = useQuery({
    queryKey: keys.settings.llmHealth(),
    queryFn: async () => (await api.GET('/api/v1/llm/health')).data ?? [],
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
    error: firstError ? getErrorMessage(firstError, 'Failed to load configuration') : null,
  };
}

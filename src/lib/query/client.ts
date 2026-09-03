import { QueryClient } from '@tanstack/react-query';
import React from 'react';

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: true,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server: Always create a new query client scoped per request via React.cache
    return getCachedQueryClient();
  }
  // Browser: Create once and reuse across components
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

const getCachedQueryClient = React.cache(() => makeQueryClient());

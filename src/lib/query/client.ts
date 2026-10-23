import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import React from 'react';

import { notifyIfAppLocked } from '@/lib/appLock';
import { notifyIfSessionExpired } from '@/lib/authExpiry';
import { errorLog } from '@/lib/diagnostics/errorLog';

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      // Server actions return a 401 as data, so look at what came back as well as at thrown errors.
      onSuccess: (data) => {
        notifyIfSessionExpired(data);
        notifyIfAppLocked(data);
      },
      onError: (e) => {
        notifyIfAppLocked(e);
        errorLog.record(e, { source: 'api' });
      },
    }),
    mutationCache: new MutationCache({
      onSuccess: (data) => {
        notifyIfSessionExpired(data);
        notifyIfAppLocked(data);
      },
      onError: (e) => {
        notifyIfAppLocked(e);
        errorLog.record(e, { source: 'api' });
      },
    }),
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

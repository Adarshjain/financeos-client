import { dehydrate, type DehydratedState } from '@tanstack/react-query';

import { prefetchDashboardData } from '@/features/dashboards/dashboardData';
import { type Loaded, loaded, orNull, signInIfPrefetchFailed } from '@/features/shell/loadHelpers';
import { dashboardsApi, gmailApi, inboxApi } from '@/lib/apiClient';
import { requireAuth } from '@/lib/auth';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';

import { latestSync } from './homeModel';

export interface HomeData {
  /** The cache to hydrate: the dashboards, the built-in catalog, the Inbox count and the default dashboard's widget data. */
  state: DehydratedState;
  displayName?: string | null;
  /** The Inbox count as the server read it; the greeting line's first render uses it (see HomeScreen). */
  needsYou?: number;
  /** The latest Gmail mailbox sync; absent when none has synced or the request failed. */
  lastSyncedAt?: string;
  /** The server's clock as ISO, so the greeting and "synced N min ago" read the same on the server and in the browser. */
  now: string;
}

/**
 * What Home needs, fetched together on the server so the first render has it (nothing is fetched twice in the
 * browser): the user's name, the dashboards, the built-in catalog, the Inbox count (the one the shell's badge
 * shows) and the Gmail connections, then the default dashboard's widget data. Only the dashboards failing fails
 * the page; the Inbox count and the sync time just drop out of the line under the greeting.
 */
export async function loadHome(): Promise<Loaded<HomeData>> {
  const queryClient = getQueryClient();
  const [user, list, summary, connections] = await Promise.all([
    requireAuth(),
    loaded(dashboardsApi.list()),
    orNull(inboxApi.summary()),
    orNull(gmailApi.listConnections()),
    queryClient.prefetchQuery({ queryKey: keys.dashboards.builtins(), queryFn: () => dashboardsApi.builtins() }),
  ]);
  if (!list.ok) return list;
  await signInIfPrefetchFailed(queryClient, keys.dashboards.builtins());
  queryClient.setQueryData(keys.dashboards.list(), list.data);
  if (summary) queryClient.setQueryData(keys.inbox.summary(), summary);
  const home = list.data.find((d) => d.isDefault);
  if (home) await prefetchDashboardData(queryClient, home);
  return {
    ok: true,
    data: {
      state: dehydrate(queryClient),
      displayName: user.displayName,
      needsYou: summary?.badge,
      lastSyncedAt: connections ? latestSync(connections) : undefined,
      now: new Date().toISOString(),
    },
  };
}

import { dehydrate, type DehydratedState } from '@tanstack/react-query';

import { type Loaded, loaded, signInIfPrefetchFailed } from '@/features/shell/loadHelpers';
import { dashboardsApi } from '@/lib/apiClient';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';

export interface HomeData {
  /** The cache to hydrate: the dashboards and the built-in catalog. Widget data loads in the browser as each widget scrolls into view. */
  state: DehydratedState;
}

/**
 * What Home needs, fetched together on the server so the first render has it (nothing is fetched twice in the
 * browser): the dashboards and the built-in catalog. The widgets' data is not read here: each widget loads when it
 * comes into view. Only the dashboards failing fails the page.
 */
export async function loadHome(): Promise<Loaded<HomeData>> {
  const queryClient = getQueryClient();
  const [list] = await Promise.all([
    loaded(dashboardsApi.list()),
    queryClient.prefetchQuery({ queryKey: keys.dashboards.builtins(), queryFn: () => dashboardsApi.builtins() }),
  ]);
  if (!list.ok) return list;
  await signInIfPrefetchFailed(queryClient, keys.dashboards.builtins());
  queryClient.setQueryData(keys.dashboards.list(), list.data);
  return { ok: true, data: { state: dehydrate(queryClient) } };
}

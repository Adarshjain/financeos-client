import { dehydrate, type DehydratedState } from '@tanstack/react-query';

import { type Loaded, loaded } from '@/features/shell/loadHelpers';
import { dashboardsApi } from '@/lib/apiClient';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';

/**
 * Everything the Dashboards list shows, fetched together on the server so the first render has it (nothing is
 * fetched twice in the browser): the dashboards.
 */
export async function loadDashboardsList(): Promise<Loaded<DehydratedState>> {
  const queryClient = getQueryClient();
  const list = await loaded(dashboardsApi.list());
  if (!list.ok) return list;
  queryClient.setQueryData(keys.dashboards.list(), list.data);
  return { ok: true, data: dehydrate(queryClient) };
}

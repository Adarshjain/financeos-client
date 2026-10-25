import { dehydrate, type DehydratedState } from '@tanstack/react-query';

import { type Loaded, loaded, orNull } from '@/features/shell/loadHelpers';
import { dashboardsApi, reportsApi } from '@/lib/apiClient';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';

/**
 * Everything the Dashboards list shows, fetched together on the server so the first render has it (nothing is
 * fetched twice in the browser): the dashboards and the reports (only for the tab's count). Only the dashboards
 * failing fails the page; the reports count just loads in the browser.
 */
export async function loadDashboardsList(): Promise<Loaded<DehydratedState>> {
  const queryClient = getQueryClient();
  const [list, reports] = await Promise.all([
    loaded(dashboardsApi.list()),
    orNull(reportsApi.list()),
  ]);
  if (!list.ok) return list;
  queryClient.setQueryData(keys.dashboards.list(), list.data);
  if (reports) queryClient.setQueryData(keys.reports.list(), reports);
  return { ok: true, data: dehydrate(queryClient) };
}

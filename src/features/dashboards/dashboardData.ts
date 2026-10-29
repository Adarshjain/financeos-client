import { dehydrate, type DehydratedState } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { guardSession, orNull, signInIfPrefetchFailed } from '@/features/shell/loadHelpers';
import { ApiError } from '@/lib/api/client';
import { dashboardsApi, reportsApi } from '@/lib/apiClient';
import type { DashboardResponse } from '@/lib/dashboards.types';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';

export interface DashboardPageData {
  /** The saved dashboard; absent on the New dashboard page. */
  dashboard?: DashboardResponse;
  /** The cache to hydrate: the report list and the built-in catalog (the Add widget picker's). Widget data loads in the browser as each widget scrolls into view. */
  state: DehydratedState;
}

/**
 * What a dashboard page needs, fetched together on the server so the first render has it all (nothing is fetched
 * twice in the browser): the dashboard, the user's reports and the built-in catalog. The widgets' data is not read
 * here: each widget loads when it comes into view. A dashboard that does not exist is a 404; the report list and
 * the catalog only degrade (the browser loads them).
 */
export const loadDashboardPage = cache(async (id?: string): Promise<DashboardPageData> => {
  const queryClient = getQueryClient();
  const [dashboard, reports] = await Promise.all([
    id
      ? guardSession(dashboardsApi.getById(id)).catch((e: unknown) => {
          if (e instanceof ApiError && e.status === 404) return null;
          throw e;
        })
      : Promise.resolve(undefined),
    orNull(reportsApi.list()),
    // The Add widget dialog's built-in catalog; a failure only leaves it to load in the browser.
    queryClient.prefetchQuery({ queryKey: keys.dashboards.builtins(), queryFn: () => dashboardsApi.builtins() }),
  ]);
  if (dashboard === null) notFound();
  await signInIfPrefetchFailed(queryClient, keys.dashboards.builtins());
  if (reports) queryClient.setQueryData(keys.reports.list(), reports);
  return { dashboard, state: dehydrate(queryClient) };
});

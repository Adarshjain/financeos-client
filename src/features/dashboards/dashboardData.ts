import { dehydrate, type DehydratedState, type QueryClient } from '@tanstack/react-query';
import { notFound } from 'next/navigation';

import { DEFAULT_PAGE_SIZE } from '@/features/reports/view/format';
import { guardSession, orNull, signInIfPrefetchFailed } from '@/features/shell/loadHelpers';
import { ApiError } from '@/lib/api/client';
import { dashboardsApi, reportsApi } from '@/lib/apiClient';
import { isWidgetAvailable } from '@/lib/dashboards.helpers';
import { prefetchWidgetData } from '@/lib/dashboards.server';
import type { DashboardResponse } from '@/lib/dashboards.types';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';

/**
 * Fills the cache with what a dashboard's widgets show, so they render without asking again in the browser:
 * every widget's first page of data, and for a report widget its saved report and the datasource catalog (labels,
 * formats, chart columns). A failure only leaves that widget to load, and report it, on its own.
 */
export async function prefetchDashboardData(queryClient: QueryClient, dashboard: DashboardResponse): Promise<void> {
  const reportIds = [...new Set(dashboard.widgets.filter(isWidgetAvailable).flatMap((w) => (w.kind === 'report' && w.reportId ? [w.reportId] : [])))];
  await Promise.all([
    prefetchWidgetData(queryClient, dashboard, DEFAULT_PAGE_SIZE),
    ...reportIds.map((reportId) => queryClient.prefetchQuery({ queryKey: keys.reports.byId(reportId), queryFn: () => reportsApi.getById(reportId) })),
    reportIds.length > 0 ? queryClient.prefetchQuery({ queryKey: keys.reports.catalog(), queryFn: () => reportsApi.getDatasource() }) : undefined,
  ]);
}

export interface DashboardPageData {
  /** The saved dashboard; absent on the New dashboard page. */
  dashboard?: DashboardResponse;
  /** The cache to hydrate: the report list and the built-in catalog (the Add widget picker's), and every widget's first page of data. */
  state: DehydratedState;
}

/**
 * What a dashboard page needs, fetched together on the server so the first render has it all (nothing is fetched
 * twice in the browser): the dashboard, the user's reports and the built-in catalog, then every widget's data.
 * A dashboard that does not exist is a 404; the report list and the catalog only degrade (the browser loads them);
 * a widget whose data failed here loads, and reports its failure, on its own.
 */
export async function loadDashboardPage(id?: string): Promise<DashboardPageData> {
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
  if (dashboard) await prefetchDashboardData(queryClient, dashboard);
  return { dashboard, state: dehydrate(queryClient) };
}

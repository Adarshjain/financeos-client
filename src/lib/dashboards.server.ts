import type { QueryClient } from '@tanstack/react-query';

import { DEFAULT_TABLE_PAGE_SIZE } from '@/components/reports/views/TablePagination';
import { reportsApi } from '@/lib/apiClient';
import { isWidgetAvailable, widgetQueryParams } from '@/lib/dashboards.helpers';
import type { DashboardResponse } from '@/lib/dashboards.types';
import { keys } from '@/lib/query/keys';

/**
 * Prefetch every widget's report data into the query cache, in parallel, on
 * the server — keyed exactly as `DashboardWidgetView`'s `useQuery` call keys
 * it (`keys.dashboards.widget(widget.id, params)`), so hydrating that cache on
 * the client needs no fetch of its own for a widget that prefetched cleanly.
 *
 * The widgets previously each fetched their own data from a useEffect after
 * hydration, so rendering a dashboard cost an SSR shell, then hydration, then N
 * separate client-to-server round trips before anything appeared — on the
 * app's landing route. Doing it here collapses that to one server-side
 * fan-out.
 *
 * `queryClient.prefetchQuery` swallows a queryFn failure into that query's own
 * error state rather than rejecting, so one unavailable or broken report
 * degrades only its own widget rather than the whole dashboard. Query results
 * dehydrate only when they resolved successfully, so a widget whose report
 * failed here simply falls back to `DashboardWidgetView`'s normal client-side
 * fetch (which will surface the same failure) instead of prefetching an error
 * across the wire.
 *
 * Only the first page is prefetched; paging remains a client concern because
 * it is a deliberate user action.
 */
export async function prefetchWidgetData(
  queryClient: QueryClient,
  dashboard: DashboardResponse,
): Promise<void> {
  const renderable = dashboard.widgets.filter(isWidgetAvailable);

  await Promise.all(
    renderable.map((widget) => {
      const isTable = widget.report.type === 'TABLE';
      const options = isTable ? { page: 0, size: DEFAULT_TABLE_PAGE_SIZE } : {};
      return queryClient.prefetchQuery({
        queryKey: keys.dashboards.widget(
          widget.id,
          widgetQueryParams(widget.reportId, isTable, 0, DEFAULT_TABLE_PAGE_SIZE),
        ),
        queryFn: () => reportsApi.runSaved(widget.reportId, options),
      });
    }),
  );
}

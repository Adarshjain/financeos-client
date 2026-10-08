import type { QueryClient } from '@tanstack/react-query';

import { DEFAULT_TABLE_PAGE_SIZE } from '@/components/reports/views/TablePagination';
import type { InboxResponse } from '@/lib/api/types';
import { dashboardsApi, inboxApi, reportsApi } from '@/lib/apiClient';
import {
  BUILTIN_ATTENTION,
  builtinWidgetQueryParams,
  isBuiltinWidget,
  isWidgetAvailable,
  widgetParams,
  widgetQueryParams,
} from '@/lib/dashboards.helpers';
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
 *
 * Built-in template widgets prefetch through the built-in data endpoint under
 * the same key shape the client builds (`builtinWidgetQueryParams`); component
 * built-ins (e.g. bills_due) fetch their own data and are skipped here — except
 * the Inbox (attention), whose single list query is cheap to seed under the
 * key `useInbox` reads (`keys.inbox.list()`, plus the summary it mirrors).
 */
export async function prefetchWidgetData(
  queryClient: QueryClient,
  dashboard: DashboardResponse,
): Promise<void> {
  const renderable = dashboard.widgets.filter(isWidgetAvailable);
  const hasInbox = renderable.some(
    (w) => isBuiltinWidget(w) && w.builtin?.kind === 'component' && w.builtin.key === BUILTIN_ATTENTION,
  );

  await Promise.all([
    hasInbox ? prefetchInbox(queryClient) : undefined,
    ...renderable.map((widget) => {
      if (isBuiltinWidget(widget)) {
        const builtin = widget.builtin;
        const builtinKey = widget.builtinKey ?? builtin?.key;
        if (!builtin || !builtinKey || builtin.kind !== 'template') return undefined;
        const isTable = builtin.templateType === 'TABLE';
        const params = widgetParams(widget);
        const options = isTable ? { page: 0, size: DEFAULT_TABLE_PAGE_SIZE } : {};
        return queryClient.prefetchQuery({
          queryKey: keys.dashboards.widget(
            widget.id,
            builtinWidgetQueryParams(builtinKey, params, isTable, 0, DEFAULT_TABLE_PAGE_SIZE),
          ),
          queryFn: () => dashboardsApi.builtinData(builtinKey, params, options),
        });
      }
      const reportId = widget.reportId;
      if (!reportId) return undefined;
      const isTable = widget.report?.type === 'TABLE';
      const options = isTable ? { page: 0, size: DEFAULT_TABLE_PAGE_SIZE } : {};
      return queryClient.prefetchQuery({
        queryKey: keys.dashboards.widget(
          widget.id,
          widgetQueryParams(reportId, isTable, 0, DEFAULT_TABLE_PAGE_SIZE),
        ),
        queryFn: () => reportsApi.runSaved(reportId, options),
      });
    }),
  ]);
}

/** Seed the Inbox widget's query (and the nav badge summary it carries), as the Inbox page does. */
async function prefetchInbox(queryClient: QueryClient): Promise<void> {
  await queryClient.prefetchQuery({ queryKey: keys.inbox.list(), queryFn: () => inboxApi.list() });
  const inbox = queryClient.getQueryData<InboxResponse>(keys.inbox.list());
  if (inbox) queryClient.setQueryData(keys.inbox.summary(), inbox.summary);
}

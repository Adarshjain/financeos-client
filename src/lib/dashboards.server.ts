import { DEFAULT_TABLE_PAGE_SIZE } from '@/components/reports/views/TablePagination';
import { reportsApi } from '@/lib/apiClient';
import { isWidgetAvailable } from '@/lib/dashboards.helpers';
import type { DashboardResponse } from '@/lib/dashboards.types';
import type { ReportData } from '@/lib/reports.types';

/** Per-widget outcome: either data or the reason it could not be loaded. */
export interface WidgetPrefetch {
  data?: ReportData;
  error?: string;
}

/** Keyed by widget id. */
export type WidgetPrefetchMap = Record<string, WidgetPrefetch>;

/**
 * Run every widget's report on the server, in parallel.
 *
 * The widgets previously each fetched their own data from a useEffect after
 * hydration, so rendering a dashboard cost an SSR shell, then hydration, then N
 * separate client-to-server round trips before anything appeared — on the app's
 * landing route. Doing it here collapses that to one server-side fan-out.
 *
 * Failures are captured per widget rather than thrown: one unavailable or broken
 * report should degrade its own tile, not blank the whole dashboard. Uses
 * allSettled for the same reason.
 *
 * Only the first page is prefetched; paging remains a client concern because it
 * is a deliberate user action.
 */
export async function prefetchWidgetData(
  dashboard: DashboardResponse,
): Promise<WidgetPrefetchMap> {
  const renderable = dashboard.widgets.filter(isWidgetAvailable);

  const settled = await Promise.allSettled(
    renderable.map((w) =>
      reportsApi.runSaved(
        w.reportId,
        w.report.type === 'TABLE'
          ? { page: 0, size: DEFAULT_TABLE_PAGE_SIZE }
          : {},
      ),
    ),
  );

  const out: WidgetPrefetchMap = {};
  renderable.forEach((widget, i) => {
    const result = settled[i];
    out[widget.id] =
      result.status === 'fulfilled'
        ? { data: result.value }
        : {
            error:
              result.reason instanceof Error
                ? result.reason.message
                : 'Failed to run this report.',
          };
  });
  return out;
}

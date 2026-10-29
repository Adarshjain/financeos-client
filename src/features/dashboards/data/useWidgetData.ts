'use client';

// The data query behind a dashboard widget. A report widget runs its saved
// report; a built-in template widget runs POST /dashboards/builtins/{key}/data
// with its params. Component built-ins (bills_due) and unavailable widgets
// never fetch here.
//
// Keys are `keys.dashboards.widget(widget.id, …QueryParams(…))` — the SAME
// shape Legacy's server prefetch builds (`prefetchWidgetData` in
// `@/lib/dashboards.server`), so a prefetched widget hydrates with no fetch.
// The runtime header sort joins the key (and the `sort` query param) only when
// set, so the unsorted first page still hydrates from the prefetch.
// `enabled` is false until the widget is near the viewport (see useInView).

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { loadBuiltinWidgetData, loadReportWidgetData } from '@/features/dashboards/dashboardActions';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import {
  builtinWidgetQueryParams,
  isBuiltinWidget,
  isWidgetAvailable,
  sortQueryValue,
  widgetParams,
  widgetQueryParams,
} from '@/lib/dashboards.helpers';
import type { WidgetResponse } from '@/lib/dashboards.types';
import { keys } from '@/lib/query/keys';
import { asReportData } from '@/lib/reports.helpers';
import type { SortClause } from '@/lib/reports.types';

export function useWidgetData(
  widget: WidgetResponse,
  page: number,
  size: number,
  sort: SortClause | null = null,
  /** False holds the fetch back (a widget not yet near the viewport); the data loads once it is true. */
  enabled = true,
) {
  const builtin = isBuiltinWidget(widget);
  const available = isWidgetAvailable(widget);
  const isTemplate = builtin && widget.builtin?.kind === 'template';
  const isTable = builtin
    ? widget.builtin?.templateType === 'TABLE'
    : widget.report?.type === 'TABLE';
  const reportId = widget.reportId ?? '';
  const builtinKey = widget.builtinKey ?? widget.builtin?.key ?? '';
  const params = widgetParams(widget);

  const query = useQuery({
    queryKey: keys.dashboards.widget(
      widget.id,
      builtin
        ? builtinWidgetQueryParams(builtinKey, params, isTable, page, size, sort)
        : widgetQueryParams(reportId, isTable, page, size, sort),
    ),
    queryFn: async () => {
      const pageQuery = isTable ? { page, size, ...(sort ? { sort: sortQueryValue(sort) } : {}) } : undefined;
      const data = await unwrapAction(
        builtin ? loadBuiltinWidgetData(builtinKey, params, pageQuery) : loadReportWidgetData(reportId, pageQuery),
      );
      return asReportData(data);
    },
    enabled: enabled && available && (builtin ? isTemplate : Boolean(reportId)),
    placeholderData: keepPreviousData,
  });

  const error = query.isError
    ? getErrorMessage(query.error, builtin ? "Couldn't load the widget. Try again." : "Couldn't run the report. Try again.")
    : null;

  return {
    available,
    isBuiltin: builtin,
    isTemplate,
    data: query.data ?? null,
    loading: query.isFetching,
    error,
    refetch: query.refetch,
  };
}

'use client';

// The data query behind a dashboard widget. A report widget runs its saved
// report; a built-in template widget runs POST /dashboards/builtins/{key}/data
// with its params. Component built-ins (bills_due) and unavailable widgets
// never fetch here.
//
// Keys are `keys.dashboards.widget(widget.id, …QueryParams(…))` — the SAME
// shape the landing page's server prefetch builds (`prefetchWidgetData` in
// `@/lib/dashboards.server`), so a prefetched widget hydrates with no fetch.

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api, ApiError } from '@/lib/api/client';
import {
  builtinWidgetQueryParams,
  isBuiltinWidget,
  isWidgetAvailable,
  widgetParams,
  widgetQueryParams,
} from '@/lib/dashboards.helpers';
import type { WidgetResponse } from '@/lib/dashboards.types';
import { keys } from '@/lib/query/keys';
import { asReportData } from '@/lib/reports.helpers';

export function useWidgetData(widget: WidgetResponse, page: number, size: number) {
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
        ? builtinWidgetQueryParams(builtinKey, params, isTable, page, size)
        : widgetQueryParams(reportId, isTable, page, size),
    ),
    queryFn: async () => {
      const pageQuery = isTable ? { page, size } : {};
      if (builtin) {
        const { data } = await api.POST('/api/v1/dashboards/builtins/{key}/data', {
          params: { path: { key: builtinKey }, query: pageQuery },
          // Only declared params — the server rejects anything else.
          body: { params },
        });
        return asReportData(data);
      }
      const { data } = await api.POST('/api/v1/reports/{id}/data', {
        params: { path: { id: reportId }, query: pageQuery },
      });
      return asReportData(data);
    },
    enabled: available && (builtin ? isTemplate : Boolean(reportId)),
    placeholderData: keepPreviousData,
  });

  const error = query.isError
    ? query.error instanceof ApiError
      ? query.error.response.message
      : builtin
        ? 'Failed to load widget'
        : 'Failed to run report'
    : null;

  return {
    available,
    isBuiltin: builtin,
    isTemplate,
    data: query.data ?? null,
    loading: query.isFetching,
    error,
  };
}

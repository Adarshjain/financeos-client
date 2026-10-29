'use client';

import { useQuery } from '@tanstack/react-query';

import { loadSavedReport } from '@/features/dashboards/actions';
import { unwrapAction } from '@/lib/actionResult';
import { keys } from '@/lib/query/keys';

/**
 * A report widget's saved report (its datasource and definition): the chart's columns and bars, the catalog the
 * result's labels come from, and the request behind "View underlying data". Shares the report editor's cache key.
 */
export function useSavedReport(reportId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: keys.reports.byId(reportId ?? ''),
    queryFn: () => unwrapAction(loadSavedReport(reportId ?? '')),
    enabled: enabled && Boolean(reportId),
  });
}

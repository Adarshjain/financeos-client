'use client';

import { useQuery } from '@tanstack/react-query';

import { loadReportCatalog } from '@/features/dashboards/dashboardActions';
import { unwrapAction } from '@/lib/actionResult';
import { keys } from '@/lib/query/keys';

/** The datasource catalog (field labels and formats), for report results and underlying data. Fetched once, only when asked for. */
export function useReportCatalog(enabled = true) {
  return useQuery({
    queryKey: keys.reports.catalog(),
    queryFn: () => unwrapAction(loadReportCatalog()),
    staleTime: 10 * 60 * 1000,
    enabled,
  });
}

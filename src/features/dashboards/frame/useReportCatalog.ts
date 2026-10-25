'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { ReportCatalog } from '@/lib/reports.types';

/** The datasource catalog (field labels and formats), for report results and underlying data. Fetched once, only when asked for. */
export function useReportCatalog(enabled = true) {
  return useQuery({
    queryKey: keys.reports.catalog(),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/report/datasource');
      return data as unknown as ReportCatalog;
    },
    staleTime: 10 * 60 * 1000,
    enabled,
  });
}

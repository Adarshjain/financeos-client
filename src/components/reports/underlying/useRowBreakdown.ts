'use client';

// Data access for a row's breakdown: the breakdown itself (every section's
// first page included) and further pages of one section.

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { asReportData } from '@/lib/reports.helpers';

import { UNDERLYING_PAGE_SIZE } from './underlying.helpers';
import type { RowBreakdownResponse } from './underlying.types';

/** One row's breakdown. */
export function useRowBreakdown(datasource: string, rowId: string) {
  const size = UNDERLYING_PAGE_SIZE;
  return useQuery({
    queryKey: keys.reports.breakdown(datasource, rowId, { size }),
    queryFn: async (): Promise<RowBreakdownResponse> => {
      const { data } = await api.GET('/api/v1/report/datasource/{name}/rows/{rowId}/breakdown', {
        params: { path: { name: datasource, rowId }, query: { size } },
      });
      return data!;
    },
  });
}

/**
 * A page of one breakdown section. Page 0 arrives with the breakdown, so this
 * only fetches for later pages (`page > 0`).
 */
export function useBreakdownSection(
  datasource: string,
  rowId: string,
  section: string,
  page: number,
  size: number,
) {
  return useQuery({
    queryKey: keys.reports.breakdown(datasource, rowId, { section, page, size }),
    queryFn: async () => {
      const { data } = await api.GET(
        '/api/v1/report/datasource/{name}/rows/{rowId}/breakdown/sections/{section}',
        { params: { path: { name: datasource, rowId, section }, query: { page, size } } },
      );
      return asReportData(data);
    },
    enabled: page > 0,
    placeholderData: keepPreviousData,
  });
}

'use client';

// Data access for a row's breakdown: the breakdown itself (every section's
// first page included) and further pages of one section.

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { loadBreakdownSection, loadRowBreakdown } from '@/features/reports/actions';
import { UNDERLYING_PAGE_SIZE } from '@/features/reports/underlying/underlying.helpers';
import type { RowBreakdownResponse } from '@/features/reports/underlying/underlying.types';
import { unwrapAction } from '@/lib/actionResult';
import { keys } from '@/lib/query/keys';
import { asReportData } from '@/lib/reports.helpers';
import type { SortClause } from '@/lib/reports.types';

/** One row's breakdown. */
export function useRowBreakdown(datasource: string, rowId: string) {
  const size = UNDERLYING_PAGE_SIZE;
  return useQuery({
    queryKey: keys.reports.breakdown(datasource, rowId, { size }),
    queryFn: (): Promise<RowBreakdownResponse> => unwrapAction(loadRowBreakdown(datasource, rowId, size)),
  });
}

/**
 * A page of one breakdown section, optionally sorted over the whole section
 * (`sort=key,dir`). The unsorted page 0 arrives with the breakdown, so this
 * only fetches for later pages or a sorted section.
 */
export function useBreakdownSection(
  datasource: string,
  rowId: string,
  section: string,
  page: number,
  size: number,
  sort: SortClause | null = null,
) {
  const sortParam = sort ? `${sort.key},${sort.direction}` : undefined;
  return useQuery({
    queryKey: keys.reports.breakdown(datasource, rowId, { section, page, size, sort: sortParam ?? null }),
    queryFn: async () => asReportData(await unwrapAction(loadBreakdownSection(datasource, rowId, section, page, size, sortParam))),
    enabled: page > 0 || sort != null,
    placeholderData: keepPreviousData,
  });
}

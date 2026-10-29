'use client';

import { useQuery } from '@tanstack/react-query';

import { unwrapAction } from '@/lib/actionResult';
import { loadReportsList } from '@/lib/query/actions/reportActions';
import { keys } from '@/lib/query/keys';
import type { ReportSummaryResponse } from '@/lib/reports.types';

/**
 * The user's saved reports (list metadata, no definitions), one cached list
 * shared by the Reports page, the dashboard editor and shortcuts.
 */
export function useReportsList({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<ReportSummaryResponse[]>({
    queryKey: keys.reports.list(),
    queryFn: () => unwrapAction(loadReportsList()),
    enabled,
  });
}

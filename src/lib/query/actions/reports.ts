'use server';

import { serverApi } from '@/lib/api/server';
import { createDomainAction } from '@/lib/domainApi';
import type { ReportSummaryResponse } from '@/lib/reports.types';

/** The user's saved reports (list metadata, no definitions). */
export const loadReportsList = createDomainAction(
  { fallbackError: "Couldn't load reports. Try again." },
  async (): Promise<ReportSummaryResponse[]> => {
    const { data } = await serverApi.GET('/api/v1/reports');
    return (data ?? []) as unknown as ReportSummaryResponse[];
  },
);

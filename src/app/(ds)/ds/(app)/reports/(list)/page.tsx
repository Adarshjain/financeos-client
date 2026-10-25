import React from 'react';

import { parseReportsType, reportRows } from '@/features/reports/list/reportsList';
import { loadReportsList } from '@/features/reports/list/reportsListData';
import { ReportsLoadError } from '@/features/reports/list/ReportsLoadError';
import { ReportsScreen } from '@/features/reports/list/ReportsScreen';

/** /ds/reports: the saved reports, grouped by area. `?type=` only sets the chip of the first render; the chips then filter in the browser (and update the URL) without calling this loader again, so the counts cover every report. */
export default async function DsReportsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const type = parseReportsType(await searchParams);
  const result = await loadReportsList();
  if (!result.ok) return <ReportsLoadError reference={result.reference} />;
  return <ReportsScreen type={type} dashboards={result.data.dashboardCount ?? undefined} rows={reportRows(result.data.reports, result.data.datasourceLabels)} />;
}

import React from 'react';

import { parseReportsType, reportRows } from '@/features/reports/list/reportsList';
import { loadReportsList } from '@/features/reports/list/reportsListData';
import { ReportsLoadError } from '@/features/reports/list/ReportsLoadError';
import { ReportsScreen } from '@/features/reports/list/ReportsScreen';

/** /ds/reports: the saved reports, grouped by area. The type chip is in the URL and answered by the server. */
export default async function DsReportsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const type = parseReportsType(await searchParams);
  const result = await loadReportsList(type);
  if (!result.ok) return <ReportsLoadError reference={result.reference} />;
  return <ReportsScreen type={type} rows={reportRows(result.data.reports, result.data.datasourceLabels)} />;
}

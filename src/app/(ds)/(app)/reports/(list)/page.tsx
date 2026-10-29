import React from 'react';

import { loadReportsList } from '@/features/reports/list/reportsListData';
import { parseReportsUrl, reportRows } from '@/features/reports/list/reportsListModel';
import { ReportsScreen } from '@/features/reports/list/ReportsScreen';
import { LoadError } from '@/features/shell/LoadError';
import type { SearchParams } from '@/features/shell/searchParams';

export const metadata = { title: 'Reports' };

/** /reports: the saved reports, grouped by area. `?type=` only sets the chip of the first render; the chips then filter in the browser (and update the URL) without calling this loader again. */
export default async function DsReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const { type } = parseReportsUrl(await searchParams);
  const result = await loadReportsList();
  if (!result.ok) return <LoadError what="reports" reference={result.reference} />;
  return <ReportsScreen type={type} rows={reportRows(result.data.reports, result.data.datasourceLabels)} />;
}

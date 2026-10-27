import React from 'react';

import { loadSavedReport } from '@/features/reports/builder/editorData';
import { ReportEditor } from '@/features/reports/builder/ReportEditor';
import { REPORTS_HREF } from '@/features/reports/list/reportsList';
import { ReportsLoadError } from '@/features/reports/list/ReportsLoadError';
import { ShellPage } from '@/features/shell/ShellPage';

/** /reports/[id]: a saved report opens in its editor, already showing its result (loaded on the server). */
export default async function DsReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadSavedReport(id);
  if (!result.ok) return (
      <ShellPage crumb="Insights / Reports" title="Report" backHref={REPORTS_HREF}>
        <ReportsLoadError reference={result.reference} />
      </ShellPage>
    );
  const { catalog, report, initialResult } = result.data;
  return <ReportEditor catalog={catalog} report={report} initialResult={initialResult} />;
}

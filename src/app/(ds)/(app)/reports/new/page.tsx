import React from 'react';

import { loadNewReport } from '@/features/reports/builder/editorData';
import { ReportEditor } from '@/features/reports/builder/ReportEditor';
import { REPORTS_HREF } from '@/features/reports/list/reportsList';
import { ReportsLoadError } from '@/features/reports/list/ReportsLoadError';
import { ShellPage } from '@/features/shell/ShellPage';

/** /reports/new: the editor on a blank report, or on a template (`?template=`, read here so the first render has it). */
export default async function DsNewReportPage({ searchParams }: { searchParams: Promise<{ template?: string | string[] }> }) {
  const { template } = await searchParams;
  const result = await loadNewReport();
  if (!result.ok) return (
      <ShellPage crumb="Insights / Reports" title="New report" backHref={REPORTS_HREF}>
        <ReportsLoadError reference={result.reference} />
      </ShellPage>
    );
  // Keyed on the template, so a different `?template=` starts a fresh draft instead of keeping the old one.
  return <ReportEditor key={Array.isArray(template) ? template[0] : (template ?? '')} catalog={result.data.catalog} templateId={template} />;
}

import React from 'react';

import { loadNewReport } from '@/features/reports/builder/editorData';
import { parseNewReportUrl } from '@/features/reports/builder/newReportUrl';
import { ReportEditor } from '@/features/reports/builder/ReportEditor';
import { ReportEditorLoadError } from '@/features/reports/builder/ReportEditorLoadError';
import type { SearchParams } from '@/features/shell/searchParams';

export const metadata = { title: 'Add report' };

/** /reports/new: the editor on a blank report, or on a template (`?template=`, read here so the first render has it). */
export default async function DsNewReportPage({ searchParams }: { searchParams: SearchParams }) {
  const { template } = parseNewReportUrl(await searchParams);
  const result = await loadNewReport();
  if (!result.ok) return <ReportEditorLoadError title="Add report" reference={result.reference} />;
  // Keyed on the template, so a different `?template=` starts a fresh draft instead of keeping the old one.
  return <ReportEditor key={template ?? ''} catalog={result.data.catalog} templateId={template} />;
}

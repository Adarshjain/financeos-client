import type { Metadata } from 'next';
import React from 'react';

import { loadSavedReport } from '@/features/reports/builder/editorData';
import { ReportEditor } from '@/features/reports/builder/ReportEditor';
import { ReportEditorLoadError } from '@/features/reports/builder/ReportEditorLoadError';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const result = await loadSavedReport((await params).id);
  return { title: result.ok ? result.data.report.name : 'Report' };
}

/** /reports/[id]: a saved report opens in its editor, already showing its result (loaded on the server). */
export default async function DsReportPage({ params }: Params) {
  const result = await loadSavedReport((await params).id);
  if (!result.ok) return <ReportEditorLoadError title="Report" reference={result.reference} />;
  const { catalog, report, initialResult } = result.data;
  return <ReportEditor catalog={catalog} report={report} initialResult={initialResult} />;
}

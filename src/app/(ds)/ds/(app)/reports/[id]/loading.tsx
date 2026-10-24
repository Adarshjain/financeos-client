import React from 'react';

import { ReportEditorSkeleton } from '@/features/reports/builder/ReportEditorSkeleton';

/** Shown while a saved report loads. */
export default function DsReportLoading() {
  return <ReportEditorSkeleton title="Report" />;
}

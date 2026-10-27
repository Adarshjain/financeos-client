import React from 'react';

import { ReportEditorSkeleton } from '@/features/reports/builder/ReportEditorSkeleton';

/** Shown while the New report page loads. */
export default function DsNewReportLoading() {
  return <ReportEditorSkeleton title="New report" />;
}

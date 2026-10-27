import React from 'react';

import { ReportsListSkeleton } from '@/features/reports/list/ReportsScreen';

/** Shown inside the Reports shell while the list loads. */
export default function DsReportsLoading() {
  return <ReportsListSkeleton />;
}

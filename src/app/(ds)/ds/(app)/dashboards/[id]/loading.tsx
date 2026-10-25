import React from 'react';

import { DashboardSkeleton } from '@/features/dashboards/view/DashboardSkeleton';

/** Shown while a dashboard loads. */
export default function DsDashboardLoading() {
  return <DashboardSkeleton title="Dashboard" />;
}

import React from 'react';

import { DashboardSkeleton } from '@/features/dashboards/view/DashboardSkeleton';

/** Shown while the New dashboard page loads. */
export default function DsNewDashboardLoading() {
  return <DashboardSkeleton title="New dashboard" />;
}

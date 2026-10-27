import React from 'react';

import { DashboardsListSkeleton } from '@/features/dashboards/list/DashboardsScreen';

/** Shown inside the Dashboards shell while the list loads. */
export default function DsDashboardsLoading() {
  return <DashboardsListSkeleton />;
}

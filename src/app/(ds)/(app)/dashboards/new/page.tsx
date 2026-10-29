import { HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { loadDashboardPage } from '@/features/dashboards/dashboardData';
import { DashboardScreen } from '@/features/dashboards/view/DashboardScreen';

export const metadata = { title: 'Add dashboard' };

/** /dashboards/new: the dashboard editor on an empty draft. */
export default async function DsNewDashboardPage() {
  const { state } = await loadDashboardPage();
  return (
    <HydrationBoundary state={state}>
      <DashboardScreen key="new" />
    </HydrationBoundary>
  );
}

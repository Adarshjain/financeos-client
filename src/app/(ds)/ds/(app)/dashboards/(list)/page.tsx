import { HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { loadDashboardsList } from '@/features/dashboards/list/dashboardsListData';
import { DashboardsLoadError } from '@/features/dashboards/list/DashboardsLoadError';
import { DashboardsScreen } from '@/features/dashboards/list/DashboardsScreen';

/** /ds/dashboards: every dashboard and the built-in widgets, read once on the server and handed to the browser's cache. */
export default async function DsDashboardsPage() {
  const result = await loadDashboardsList();
  if (!result.ok) return <DashboardsLoadError reference={result.reference} />;
  return (
    <HydrationBoundary state={result.data}>
      <DashboardsScreen />
    </HydrationBoundary>
  );
}

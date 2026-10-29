import { HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { loadDashboardsList } from '@/features/dashboards/list/dashboardsListData';
import { DashboardsScreen } from '@/features/dashboards/list/DashboardsScreen';
import { LoadError } from '@/features/shell/LoadError';

export const metadata = { title: 'Dashboards' };

/** /dashboards: every dashboard, read once on the server and handed to the browser's cache. */
export default async function DsDashboardsPage() {
  const result = await loadDashboardsList();
  if (!result.ok) return <LoadError what="dashboards" reference={result.reference} />;
  return (
    <HydrationBoundary state={result.data}>
      <DashboardsScreen />
    </HydrationBoundary>
  );
}

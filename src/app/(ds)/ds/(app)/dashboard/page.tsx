import { HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { loadHome } from '@/features/dashboards/home/homeData';
import { HomeScreen } from '@/features/dashboards/home/HomeScreen';
import { DashboardsLoadError } from '@/features/dashboards/list/DashboardsLoadError';

/** /ds/dashboard: Home, the default dashboard. The dashboards are read once on the server; each widget loads as it comes into view. */
export default async function DsHomePage() {
  const result = await loadHome();
  if (!result.ok) return <DashboardsLoadError reference={result.reference} />;
  return (
    <HydrationBoundary state={result.data.state}>
      <HomeScreen />
    </HydrationBoundary>
  );
}

import { HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { loadHome } from '@/features/dashboards/home/homeData';
import { HomeScreen } from '@/features/dashboards/home/HomeScreen';
import { DashboardsLoadError } from '@/features/dashboards/list/DashboardsLoadError';

/** /ds/dashboard: Home, the default dashboard under the greeting. Everything it shows is read once on the server. */
export default async function DsHomePage() {
  const result = await loadHome();
  if (!result.ok) return <DashboardsLoadError reference={result.reference} />;
  const { state, displayName, needsYou, lastSyncedAt, now } = result.data;
  return (
    <HydrationBoundary state={state}>
      <HomeScreen displayName={displayName} needsYou={needsYou} lastSyncedAt={lastSyncedAt} nowIso={now} />
    </HydrationBoundary>
  );
}

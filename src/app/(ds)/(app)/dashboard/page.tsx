import { HydrationBoundary } from '@tanstack/react-query';
import React from 'react';

import { loadHome } from '@/features/dashboards/home/homeData';
import { HomeScreen } from '@/features/dashboards/home/HomeScreen';
import { LoadError } from '@/features/shell/LoadError';

export const metadata = { title: 'Home' };

/** /dashboard: Home, the default dashboard. The dashboards are read once on the server; each widget loads as it comes into view. */
export default async function DsHomePage() {
  const result = await loadHome();
  if (!result.ok) return <LoadError what="dashboards" reference={result.reference} />;
  return (
    <HydrationBoundary state={result.data.state}>
      <HomeScreen />
    </HydrationBoundary>
  );
}

'use client';


import { useState } from 'react';

import { DashboardSelector } from '@/components/dashboards/DashboardSelector';
import { DashboardView } from '@/components/dashboards/DashboardView';
import type { WidgetPrefetchMap } from '@/lib/dashboards.server';
import type { DashboardResponse } from '@/lib/dashboards.types';

interface DashboardHomeProps {
  dashboards: DashboardResponse[];
  /**
   * Server-fetched widget data for the dashboard shown on first paint only.
   *
   * Deliberately not prefetched for every dashboard: the selector switches
   * between them client-side without navigating, so prefetching all of them
   * would run every report of every dashboard on each page load.
   */
  prefetched?: WidgetPrefetchMap;
}

export function DashboardHome({ dashboards, prefetched }: DashboardHomeProps) {
  const initial = dashboards?.find((d) => d.isDefault) ?? dashboards?.[0];
  const [currentDashboard, setCurrentDashboard] = useState<DashboardResponse>(() => initial);

  return <div className="py-4 pb-20">
    <DashboardSelector
      dashboards={dashboards ?? []}
      onSelectDashboard={setCurrentDashboard}
      currentDashboard={currentDashboard}
    />
    <DashboardView
      dashboard={currentDashboard}
      prefetched={
        currentDashboard?.id === initial?.id ? prefetched : undefined
      }
    />
  </div>;
}
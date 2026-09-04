'use client';

import { useState } from 'react';

import { DashboardSelector } from '@/components/dashboards/DashboardSelector';
import { DashboardView } from '@/components/dashboards/DashboardView';
import type { DashboardResponse } from '@/lib/dashboards.types';
import { useDashboards } from '@/lib/query/hooks/useDashboards';

export function DashboardHome() {
  const { data: dashboards = [] } = useDashboards();
  const initial = dashboards.find((d) => d.isDefault) ?? dashboards[0];
  const [currentDashboard, setCurrentDashboard] = useState<DashboardResponse | undefined>(() => initial);

  const activeDashboard = currentDashboard ?? initial;

  if (!activeDashboard) {
    return null;
  }

  return (
    <div className="py-4 pb-20">
      <DashboardSelector
        dashboards={dashboards}
        onSelectDashboard={setCurrentDashboard}
        currentDashboard={activeDashboard}
      />
      <DashboardView dashboard={activeDashboard} />
    </div>
  );
}

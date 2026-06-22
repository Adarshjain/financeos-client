'use client';


import { useState } from 'react';

import { DashboardSelector } from '@/components/dashboards/DashboardSelector';
import { DashboardView } from '@/components/dashboards/DashboardView';
import type { DashboardResponse } from '@/lib/dashboards.types';

interface DashboardHomeProps {
  dashboards: DashboardResponse[];
}

export function DashboardHome({ dashboards }: DashboardHomeProps) {
  const [currentDashboard, setCurrentDashboard] = useState<DashboardResponse>(() => dashboards?.find(d => d.isDefault) ?? dashboards?.[0]);

  return <div className="py-4 pb-20">
    <DashboardSelector
      dashboards={dashboards ?? []}
      onSelectDashboard={setCurrentDashboard}
      currentDashboard={currentDashboard}
    />
    <DashboardView dashboard={currentDashboard} />
  </div>;
}
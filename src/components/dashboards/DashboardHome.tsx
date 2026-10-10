'use client';

import { useState } from 'react';

import { DashboardSelector } from '@/components/dashboards/DashboardSelector';
import { DashboardView } from '@/components/dashboards/DashboardView';
import type { DashboardResponse, WidgetParams } from '@/lib/dashboards.types';
import { useDashboards, useSaveWidgetParams } from '@/lib/query/hooks/useDashboards';

export function DashboardHome() {
  const { data: dashboards = [] } = useDashboards();
  // Track the pick by id so the shown dashboard follows the cache (e.g. after Widget settings saves).
  const [currentId, setCurrentId] = useState<string | null>(null);
  const saveParams = useSaveWidgetParams();

  const activeDashboard =
    dashboards.find((d) => d.id === currentId) ?? dashboards.find((d) => d.isDefault) ?? dashboards[0];

  if (!activeDashboard) {
    return null;
  }

  const saveWidgetParams = async (widgetId: string, params: WidgetParams) => {
    await saveParams.mutateAsync({ dashboard: activeDashboard, widgetId, params });
  };

  return (
    <div className="py-4 pb-20">
      <DashboardSelector
        dashboards={dashboards}
        onSelectDashboard={(d: DashboardResponse) => setCurrentId(d.id)}
        currentDashboard={activeDashboard}
      />
      <DashboardView dashboard={activeDashboard} onWidgetParamsChange={saveWidgetParams} />
    </div>
  );
}

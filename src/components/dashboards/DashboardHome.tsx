'use client';

import { useState } from 'react';

import { DashboardEditor } from '@/components/dashboards/DashboardEditor';
import { DashboardHomeMenu } from '@/components/dashboards/DashboardHomeMenu';
import { DashboardSelector } from '@/components/dashboards/DashboardSelector';
import { DashboardView } from '@/components/dashboards/DashboardView';
import type { DashboardResponse, WidgetParams } from '@/lib/dashboards.types';
import { useDashboards, useSaveWidgetParams } from '@/lib/query/hooks/useDashboards';

export function DashboardHome() {
  const { data: dashboards = [] } = useDashboards();
  // Track the pick by id so the shown dashboard follows the cache (e.g. after Widget settings saves).
  const [currentId, setCurrentId] = useState<string | null>(null);
  // "Edit dashboard" swaps the view for the editor here; leaving it (save, discard, back) returns to the view.
  const [editing, setEditing] = useState(false);
  const saveParams = useSaveWidgetParams();

  const activeDashboard =
    dashboards.find((d) => d.id === currentId) ?? dashboards.find((d) => d.isDefault) ?? dashboards[0];

  if (!activeDashboard) {
    return null;
  }

  if (editing) {
    return (
      <DashboardEditor
        key={activeDashboard.id}
        mode="edit"
        dashboard={activeDashboard}
        startEditing
        onExit={() => setEditing(false)}
      />
    );
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
        actions={<DashboardHomeMenu dashboard={activeDashboard} onEdit={() => setEditing(true)} />}
      />
      <DashboardView dashboard={activeDashboard} onWidgetParamsChange={saveWidgetParams} />
    </div>
  );
}

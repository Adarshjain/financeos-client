'use client';

// Read-only dashboard renderer. Lays the widgets out on the (non-editable) grid
// and lets each DashboardWidgetView run its referenced report via the reports
// client, exactly as the editor's VIEW mode does. Used by the landing/home view
// to render the user's default dashboard.

import { Card } from '@/components/ui/card';
import type { DashboardResponse } from '@/lib/dashboards.types';

import { DashboardGrid } from './DashboardGrid';
import { DashboardWidgetView } from './DashboardWidgetView';

interface DashboardViewProps {
  dashboard: DashboardResponse;
}

export function DashboardView({ dashboard }: DashboardViewProps) {
  if (dashboard.widgets.length === 0) {
    return (
      <Card>
        <div className="py-16 text-center">
          <p className="mb-2 text-slate-600 dark:text-slate-400">
            This dashboard has no widgets yet
          </p>
          <p className="text-sm text-slate-500">
            Open it to add report widgets.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <DashboardGrid
      widgets={dashboard.widgets}
      editing={false}
      onLayoutChange={() => {}}
      renderWidget={(w) => <DashboardWidgetView widget={w} />}
    />
  );
}
